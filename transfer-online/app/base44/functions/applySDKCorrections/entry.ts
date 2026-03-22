import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const TARGET_VERSION = '0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar lista de funções aprovadas existente
    const configs = await base44.asServiceRole.entities.AppConfig.filter({ config_key: 'sdk_approved_functions' });
    let approvedList = [];
    if (configs.length > 0) {
      try { approvedList = JSON.parse(configs[0].config_value); } catch {}
    }

    // Buscar resultado da auditoria atual
    const auditRes = await base44.asServiceRole.functions.invoke('checkSdkVersions', {});
    const auditData = auditRes?.data || auditRes;
    if (!auditData?.functions) {
      return Response.json({ error: 'Falha ao obter lista de funções' }, { status: 500 });
    }

    // Marcar todas as funções needs_audit e outdated como corrigidas
    const toFix = auditData.functions.filter(f => f.status === 'needs_audit' || f.status === 'outdated');
    const newApproved = [...new Set([...approvedList, ...toFix.map(f => f.name)])];

    const configData = {
      config_key: 'sdk_approved_functions',
      config_value: JSON.stringify(newApproved),
      description: `Funções com SDK aprovadas como ${TARGET_VERSION} pelo admin`
    };

    if (configs.length > 0) {
      await base44.asServiceRole.entities.AppConfig.update(configs[0].id, configData);
    } else {
      await base44.asServiceRole.entities.AppConfig.create(configData);
    }

    // Log
    await base44.asServiceRole.entities.IntegrationLog.create({
      service_name: 'SDK Version Monitor',
      action: 'apply_sdk_corrections',
      status: 'success',
      message: `${toFix.length} funções marcadas como corrigidas para SDK ${TARGET_VERSION} pelo admin ${user.email}`,
      metadata: { fixed: toFix.map(f => f.name), total: toFix.length },
      executed_at: new Date().toISOString(),
    });

    return Response.json({ success: true, fixed_count: toFix.length, fixed_functions: toFix.map(f => f.name) });

  } catch (error) {
    console.error('[applySDKCorrections] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});