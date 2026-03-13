import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { RefreshCw, Search, Eye, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/dashboard/PageHeader";

export default function SmsLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedLog, setSelectedLog] = useState(null);

    const loadLogs = async () => {
        setLoading(true);
        try {
            // Fetch logs, ordered by sent_at desc
            const response = await base44.entities.SmsLog.list('-sent_at', 100);
            setLogs(response);
        } catch (error) {
            console.error("Error loading SMS logs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
        // Optional: Auto-refresh every 30s
        const interval = setInterval(loadLogs, 30000);
        return () => clearInterval(interval);
    }, []);

    const filteredLogs = logs.filter(log => 
        (log.to_number && log.to_number.includes(searchTerm)) ||
        (log.status && log.status.includes(searchTerm)) ||
        (log.provider && log.provider.includes(searchTerm))
    );

    const getStatusBadge = (status) => {
        switch (status) {
            case 'success':
                return <Badge className="bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Sucesso</Badge>;
            case 'failed':
                return <Badge className="bg-red-100 text-red-800 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Falha</Badge>;
            case 'sending':
                return <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1"><Clock className="w-3 h-3" /> Enviando</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <PageHeader 
                title="Logs de SMS (Zenvia)" 
                description="Monitore o status de envio de mensagens e visualize erros de integração."
            />

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-medium">Histórico de Envios</CardTitle>
                    <div className="flex gap-2">
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Buscar número ou status..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={loadLogs} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data/Hora</TableHead>
                                    <TableHead>Para</TableHead>
                                    <TableHead>Mensagem</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                            Carregando logs...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                            Nenhum log encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="whitespace-nowrap">
                                                {log.sent_at ? format(new Date(log.sent_at), 'dd/MM/yyyy HH:mm:ss') : '-'}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">{log.to_number}</TableCell>
                                            <TableCell className="max-w-[300px] truncate" title={log.message_body}>
                                                {log.message_body}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(log.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                                                            <Eye className="w-4 h-4 mr-1" /> Detalhes
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle>Detalhes do SMS</DialogTitle>
                                                            <DialogDescription>
                                                                ID: {log.id} | Enviado em: {log.sent_at ? format(new Date(log.sent_at), 'dd/MM/yyyy HH:mm:ss') : '-'}
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        
                                                        <div className="grid gap-4 py-4">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="text-sm font-medium text-gray-500">Status</label>
                                                                    <div className="mt-1">{getStatusBadge(log.status)}</div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-sm font-medium text-gray-500">Provedor</label>
                                                                    <div className="mt-1 font-medium capitalize">{log.provider || 'N/A'}</div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-sm font-medium text-gray-500">Para</label>
                                                                    <div className="mt-1 font-mono">{log.to_number}</div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-sm font-medium text-gray-500">Entidade Relacionada</label>
                                                                    <div className="mt-1 text-sm">{log.related_entity} ({log.related_id})</div>
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <label className="text-sm font-medium text-gray-500">Mensagem</label>
                                                                <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm border">
                                                                    {log.message_body}
                                                                </div>
                                                            </div>

                                                            {log.error_message && (
                                                                <div>
                                                                    <label className="text-sm font-medium text-red-500">Erro</label>
                                                                    <div className="mt-1 p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
                                                                        {log.error_message}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div>
                                                                <label className="text-sm font-medium text-gray-500">Payload de Requisição</label>
                                                                <pre className="mt-1 p-3 bg-slate-950 text-slate-50 rounded-md text-xs overflow-x-auto">
                                                                    {log.request_payload ? JSON.stringify(log.request_payload, null, 2) : 'N/A'}
                                                                </pre>
                                                            </div>

                                                            <div>
                                                                <label className="text-sm font-medium text-gray-500">Resposta do Provedor</label>
                                                                <pre className="mt-1 p-3 bg-slate-950 text-slate-50 rounded-md text-xs overflow-x-auto">
                                                                    {log.provider_response ? JSON.stringify(log.provider_response, null, 2) : 'N/A'}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}