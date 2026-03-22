import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date().toISOString().split('T')[0];

    // Buscar configurações ativas
    // Como o filtro de data pode ser complexo, trazemos os ativos e filtramos em memória
    const configs = await base44.asServiceRole.entities.SeasonalConfig.filter({
      is_active: true
    });

    // Filtrar pela data atual
    const activeConfig = configs.find(config => {
      return config.start_date <= today && config.end_date >= today;
    });

    return Response.json({ 
      active: !!activeConfig, 
      theme: activeConfig || null 
    });

  } catch (error) {
    console.error('[getActiveSeasonalTheme] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});