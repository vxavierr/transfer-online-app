import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Activity, CheckCircle, XCircle, AlertTriangle, RefreshCw, 
    Server, MessageSquare, Phone, Mail, Clock, Database,
    Search, ChevronDown, ChevronUp
} from 'lucide-react';
import SdkAuditPanel from '@/components/monitoring/SdkAuditPanel';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function MonitoramentoSistema() {
    const [services, setServices] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [logFilter, setLogFilter] = useState('all'); // all, error, warning
    const [expandedLog, setExpandedLog] = useState(null);

    const checkIntegrations = async () => {
        setRefreshing(true);
        try {
            // Chama a função backend que testa as conexões
            const response = await base44.functions.invoke('checkSystemIntegrations');
            if (response.data && response.data.success) {
                setServices(response.data.services);
                toast.success("Status dos serviços atualizado");
            } else {
                toast.error("Erro ao verificar serviços");
            }
        } catch (error) {
            console.error(error);
            toast.error("Falha na comunicação com o servidor");
        } finally {
            setRefreshing(false);
        }
    };

    const fetchLogs = async () => {
        try {
            // Busca os últimos 50 logs de integração
            const logsData = await base44.entities.IntegrationLog.list('-executed_at', 50);
            setLogs(logsData || []);
        } catch (error) {
            console.error("Erro ao buscar logs", error);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([checkIntegrations(), fetchLogs()]);
            setLoading(false);
        };
        init();
        
        // Auto refresh logs a cada 30s
        const interval = setInterval(fetchLogs, 30000);
        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = (status) => {
        switch(status) {
            case 'online':
            case 'success':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'warning':
                return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case 'error':
            case 'offline':
                return <XCircle className="w-5 h-5 text-red-500" />;
            default:
                return <Activity className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'online':
            case 'success':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'warning':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'error':
            case 'offline':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getServiceIcon = (name) => {
        const lower = name.toLowerCase();
        if (lower.includes('whatsapp')) return <MessageSquare className="w-8 h-8 text-green-600" />;
        if (lower.includes('twilio') || lower.includes('voz')) return <Phone className="w-8 h-8 text-red-600" />;
        if (lower.includes('email') || lower.includes('resend')) return <Mail className="w-8 h-8 text-blue-600" />;
        if (lower.includes('cron') || lower.includes('lembrete')) return <Clock className="w-8 h-8 text-purple-600" />;
        if (lower.includes('maps') || lower.includes('google')) return <Server className="w-8 h-8 text-orange-600" />;
        return <Database className="w-8 h-8 text-gray-600" />;
    };

    const filteredLogs = logs.filter(log => {
        if (logFilter === 'all') return true;
        return log.status === logFilter;
    });

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Monitoramento do Sistema</h1>
                    <p className="text-gray-500 mt-1">Status em tempo real das integrações e serviços de backend</p>
                </div>
                <Button 
                    onClick={() => { checkIntegrations(); fetchLogs(); }} 
                    disabled={refreshing}
                    className="gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Atualizar Status
                </Button>
            </div>

            {/* SDK Audit Panel */}
            <SdkAuditPanel />

            {/* Services Grid */}
            <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" />
                    Integrações e Serviços
                </h2>
                {services.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {services.map((service, index) => (
                            <Card key={index} className="shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="p-3 bg-gray-50 rounded-xl">
                                            {getServiceIcon(service.service)}
                                        </div>
                                        <Badge className={getStatusColor(service.status)}>
                                            {service.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <div className="mt-4">
                                        <h3 className="font-bold text-gray-900">{service.service}</h3>
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2" title={service.details}>
                                            {service.details}
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
                                        <RefreshCw className="w-3 h-3" />
                                        Verificado: {format(new Date(service.last_check), "HH:mm:ss")}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="border-dashed border-2 border-gray-200">
                        <CardContent className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                            <AlertTriangle className="w-10 h-10 text-yellow-400" />
                            <div>
                                <p className="font-semibold text-gray-700">Não foi possível carregar os serviços</p>
                                <p className="text-sm text-gray-500 mt-1">A função <span className="font-mono text-xs bg-gray-100 px-1 rounded">checkSystemIntegrations</span> retornou um erro.</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={checkIntegrations} disabled={refreshing} className="gap-2 mt-1">
                                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                                Tentar novamente
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Logs Section */}
            <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Logs de Execução</CardTitle>
                        <CardDescription>Histórico recente de atividades automáticas</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant={logFilter === 'all' ? 'default' : 'outline'} 
                            size="sm" 
                            onClick={() => setLogFilter('all')}
                        >
                            Todos
                        </Button>
                        <Button 
                            variant={logFilter === 'error' ? 'destructive' : 'outline'} 
                            size="sm" 
                            onClick={() => setLogFilter('error')}
                            className={logFilter === 'error' ? '' : 'text-red-600 hover:text-red-700 hover:bg-red-50'}
                        >
                            Erros
                        </Button>
                         <Button 
                            variant={logFilter === 'warning' ? 'secondary' : 'outline'} 
                            size="sm" 
                            onClick={() => setLogFilter('warning')}
                            className={logFilter === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50'}
                        >
                            Alertas
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[180px]">Data/Hora</TableHead>
                                    <TableHead className="w-[200px]">Serviço</TableHead>
                                    <TableHead className="w-[150px]">Ação</TableHead>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                    <TableHead>Mensagem</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLogs.length > 0 ? (
                                    filteredLogs.map((log) => {
                                        const hasMetadata = log.metadata && (
                                            log.metadata.processed_trips?.length > 0 || 
                                            log.metadata.processed_leads?.length > 0
                                        );
                                        const isExpanded = expandedLog === log.id;

                                        return (
                                            <React.Fragment key={log.id}>
                                                <TableRow className={hasMetadata ? 'cursor-pointer hover:bg-gray-50' : ''} onClick={() => hasMetadata && setExpandedLog(isExpanded ? null : log.id)}>
                                                    <TableCell className="font-mono text-xs">
                                                        {format(new Date(log.executed_at), "dd/MM/yyyy HH:mm:ss")}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {log.service_name}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="font-mono text-xs">
                                                            {log.action}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {getStatusIcon(log.status)}
                                                            <span className="capitalize text-sm">{log.status}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-gray-600">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="max-w-[350px] truncate" title={log.message}>
                                                                {log.message}
                                                            </span>
                                                            {hasMetadata && (
                                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                                {isExpanded && hasMetadata && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="bg-gray-50 p-4">
                                                            <div className="space-y-3">
                                                                <h4 className="font-semibold text-sm text-gray-900">Detalhes da Execução</h4>
                                                                
                                                                {log.metadata.processed_trips && (
                                                                    <div>
                                                                        <p className="text-xs font-medium text-gray-700 mb-2">Viagens Processadas ({log.metadata.processed_trips.length}):</p>
                                                                        <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                                                                            {log.metadata.processed_trips.map((trip, idx) => (
                                                                                <div key={idx} className="bg-white border border-gray-200 rounded-md p-2 text-xs">
                                                                                    <div className="flex justify-between items-start">
                                                                                        <div>
                                                                                            <span className="font-mono font-semibold text-blue-600">{trip.display_id}</span>
                                                                                            <span className="ml-2 text-gray-500">({trip.type})</span>
                                                                                        </div>
                                                                                        <Badge variant="outline" className="text-[10px]">{trip.date} {trip.time}</Badge>
                                                                                    </div>
                                                                                    <p className="text-gray-600 mt-1">Motorista: {trip.driver || 'Não definido'}</p>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {log.metadata.processed_leads && (
                                                                    <div>
                                                                        <p className="text-xs font-medium text-gray-700 mb-2">Leads Processados ({log.metadata.processed_leads.length}):</p>
                                                                        <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                                                                            {log.metadata.processed_leads.map((lead, idx) => (
                                                                                <div key={idx} className="bg-white border border-gray-200 rounded-md p-2 text-xs">
                                                                                    <div className="flex justify-between items-start">
                                                                                        <div>
                                                                                            <span className="font-mono text-gray-700">{lead.phone}</span>
                                                                                            {lead.vehicle && <span className="ml-2 text-gray-500">- {lead.vehicle}</span>}
                                                                                        </div>
                                                                                        <Badge variant="outline" className="text-[10px]">{lead.date}</Badge>
                                                                                    </div>
                                                                                    <p className="text-gray-600 mt-1">Destino: {lead.destination || 'Não definido'}</p>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {log.metadata.sent_details && log.metadata.sent_details.length > 0 && (
                                                                    <div>
                                                                        <p className="text-xs font-medium text-green-700 mb-2">Enviados ({log.metadata.sent_details.length}):</p>
                                                                        <div className="space-y-1 max-h-[150px] overflow-y-auto">
                                                                            {log.metadata.sent_details.map((sent, idx) => (
                                                                                <div key={idx} className="bg-green-50 border border-green-200 rounded-md p-2 text-xs">
                                                                                    <span className="font-medium">{sent.driver}</span>
                                                                                    <span className="ml-2 text-gray-600">via {sent.channel}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {log.metadata.error_details && log.metadata.error_details.length > 0 && (
                                                                    <div>
                                                                        <p className="text-xs font-medium text-red-700 mb-2">Erros ({log.metadata.error_details.length}):</p>
                                                                        <div className="space-y-1 max-h-[150px] overflow-y-auto">
                                                                            {log.metadata.error_details.map((err, idx) => (
                                                                                <div key={idx} className="bg-red-50 border border-red-200 rounded-md p-2 text-xs">
                                                                                    <p className="font-medium">{err.trip}</p>
                                                                                    <p className="text-gray-600">{err.channel}: {err.error}</p>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                                            Nenhum log encontrado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}