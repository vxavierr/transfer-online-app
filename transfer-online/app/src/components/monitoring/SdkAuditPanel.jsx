import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Package, RefreshCw, CheckCircle, XCircle, AlertTriangle, 
    Lock, Search, Bell, ChevronDown, ChevronUp, Wrench
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
    current:     { label: 'Atualizado',       color: 'bg-green-100 text-green-800 border-green-200',  icon: <CheckCircle  className="w-3.5 h-3.5" /> },
    outdated:    { label: 'Desatualizado',    color: 'bg-red-100 text-red-800 border-red-200',        icon: <XCircle      className="w-3.5 h-3.5" /> },
    needs_audit: { label: 'Aguarda Auditoria',color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Search    className="w-3.5 h-3.5" /> },
    frozen:      { label: 'Congelada',        color: 'bg-gray-100 text-gray-600 border-gray-200',     icon: <Lock         className="w-3.5 h-3.5" /> },
};

export default function SdkAuditPanel() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('all');
    const [showFunctions, setShowFunctions] = useState(false);
    const [sendingAlert, setSendingAlert] = useState(false);
    const [applyingFix, setApplyingFix] = useState(false);

    const applyCorrections = async () => {
        setApplyingFix(true);
        try {
            const res = await base44.functions.invoke('applySDKCorrections', {});
            if (res.data?.success) {
                toast.success(`Correções aplicadas: ${res.data.fixed_count} funções atualizadas!`);
                await runAudit(false);
            } else {
                toast.error('Erro ao aplicar correções');
            }
        } catch (e) {
            toast.error('Falha ao aplicar correções');
        } finally {
            setApplyingFix(false);
        }
    };

    const runAudit = async (withAlert = false) => {
        if (withAlert) setSendingAlert(true);
        else setLoading(true);
        try {
            const res = await base44.functions.invoke('checkSdkVersions', { sendAlert: withAlert });
            if (res.data?.success) {
                setData(res.data);
                setShowFunctions(true);
                if (withAlert) toast.success('Alerta enviado ao gestor com sucesso!');
                else toast.success('Auditoria de SDK concluída!');
            } else {
                toast.error('Erro ao executar auditoria de SDK');
            }
        } catch (e) {
            toast.error('Falha ao conectar com o servidor');
        } finally {
            setLoading(false);
            setSendingAlert(false);
        }
    };

    const filteredFunctions = data?.functions?.filter(f => {
        if (filter === 'all') return true;
        return f.status === filter;
    }) ?? [];

    const stats = data?.stats;

    return (
        <Card className="shadow-md border-blue-100">
            <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Package className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Auditoria de SDK</CardTitle>
                            <CardDescription>
                                Versão alvo: <span className="font-mono font-bold text-blue-700">@base44/sdk@{data?.target_version ?? '0.8.20'}</span>
                                {data?.checked_at && (
                                    <span className="ml-2 text-gray-400 text-xs">
                                        · Última verificação: {new Date(data.checked_at).toLocaleTimeString('pt-BR')}
                                    </span>
                                )}
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => runAudit(false)} disabled={loading || sendingAlert} className="gap-1.5">
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Verificar
                        </Button>
                        <Button size="sm" onClick={() => runAudit(true)} disabled={loading || sendingAlert || applyingFix} className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white">
                            <Bell className={`w-3.5 h-3.5 ${sendingAlert ? 'animate-pulse' : ''}`} />
                            {sendingAlert ? 'Enviando...' : 'Alertar Gestor'}
                        </Button>
                        {data && (data.stats?.outdated > 0 || data.stats?.needs_audit > 0) && (
                            <Button size="sm" onClick={applyCorrections} disabled={loading || sendingAlert || applyingFix} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                                <Wrench className={`w-3.5 h-3.5 ${applyingFix ? 'animate-spin' : ''}`} />
                                {applyingFix ? 'Aplicando...' : 'Aplicar Correções'}
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { key: 'current',     label: 'Atualizadas',    value: stats.current,     color: 'text-green-600',  bg: 'bg-green-50' },
                            { key: 'outdated',    label: 'Desatualizadas', value: stats.outdated,    color: 'text-red-600',    bg: 'bg-red-50' },
                            { key: 'needs_audit', label: 'Auditoria Pend.', value: stats.needs_audit, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                            { key: 'frozen',      label: 'Congeladas',     value: stats.frozen,      color: 'text-gray-500',   bg: 'bg-gray-50' },
                        ].map(s => (
                            <button
                                key={s.key}
                                onClick={() => { setFilter(s.key === filter ? 'all' : s.key); setShowFunctions(true); }}
                                className={`${s.bg} rounded-lg p-3 text-left border transition-all ${filter === s.key ? 'ring-2 ring-blue-400' : 'hover:opacity-80'}`}
                            >
                                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                <p className="text-xs text-gray-600 mt-0.5">{s.label}</p>
                            </button>
                        ))}
                    </div>
                )}

                {/* Alert Banner */}
                {stats && (stats.outdated > 0 || stats.needs_audit > 0) && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            {stats.outdated > 0 && <span><strong>{stats.outdated} funções</strong> com SDK desatualizado. </span>}
                            {stats.needs_audit > 0 && <span><strong>{stats.needs_audit} funções</strong> precisam de auditoria manual. </span>}
                            <span className="text-amber-600">Use "Aplicar Correções" no topo para corrigir todas as pendências.</span>
                        </div>
                    </div>
                )}

                {/* Success Banner */}
                {stats && stats.outdated === 0 && stats.needs_audit === 0 && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                        <CheckCircle className="w-4 h-4" />
                        <span>Todas as funções verificadas estão com o SDK atualizado!</span>
                    </div>
                )}

                {/* Functions List */}
                {data && (
                    <div>
                        <button
                            onClick={() => setShowFunctions(!showFunctions)}
                            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                        >
                            {showFunctions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {showFunctions ? 'Ocultar' : 'Ver'} lista de funções ({filteredFunctions.length}/{data.stats.total})
                        </button>

                        {showFunctions && (
                            <div className="mt-3 space-y-2">
                                {/* Filter tabs */}
                                <div className="flex gap-1.5 flex-wrap">
                                    {['all', 'current', 'outdated', 'needs_audit', 'frozen'].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setFilter(f)}
                                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                                filter === f
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            {f === 'all' ? 'Todos' : STATUS_CONFIG[f]?.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200">
                                    {filteredFunctions.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-gray-500">Nenhuma função nesta categoria.</div>
                                    ) : (
                                        filteredFunctions.map((fn, i) => {
                                            const cfg = STATUS_CONFIG[fn.status];
                                            return (
                                                <div key={i} className={`flex items-center justify-between px-3 py-2 text-sm border-b last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                                    <span className="font-mono text-xs text-gray-700 truncate">{fn.name}</span>
                                                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                        {fn.version !== 'unknown' && (
                                                            <span className="font-mono text-[10px] text-gray-400">{fn.version}</span>
                                                        )}
                                                        <Badge className={`${cfg.color} text-[10px] flex items-center gap-1 py-0`}>
                                                            {cfg.icon}
                                                            {cfg.label}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {!data && !loading && (
                    <div className="text-center py-6 text-gray-400 text-sm">
                        Clique em <strong>Verificar</strong> para rodar a auditoria de versões do SDK.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}