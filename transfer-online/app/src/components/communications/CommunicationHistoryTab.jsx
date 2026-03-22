import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Mail, MessageSquare, Phone, Eye, Search, Filter, CheckCircle, XCircle, Clock, User, Users, Building2, Car } from "lucide-react";
import { format } from "date-fns";

const CHANNEL_ICONS = {
  email: Mail,
  whatsapp: MessageSquare,
  sms: Phone
};

const CHANNEL_STYLE = {
  email: "bg-blue-100 text-blue-700",
  whatsapp: "bg-green-100 text-green-700",
  sms: "bg-purple-100 text-purple-700"
};

const STATUS_ICONS = {
  sent: Clock,
  delivered: CheckCircle,
  failed: XCircle,
  opened: CheckCircle,
  clicked: CheckCircle,
  pending: Clock
};

const STATUS_STYLE = {
  sent: "bg-gray-100 text-gray-700",
  delivered: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  opened: "bg-blue-100 text-blue-700",
  clicked: "bg-purple-100 text-purple-700",
  pending: "bg-yellow-100 text-yellow-700"
};

const RECIPIENT_ICONS = {
  passenger: User,
  requester: Users,
  driver: Car,
  coordinator: Users,
  client_contact: Building2,
  supplier: Building2,
  admin: User,
  other: User
};

export default function CommunicationHistoryTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRecipientType, setFilterRecipientType] = useState("all");
  const [selectedLog, setSelectedLog] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["communicationLogs"],
    queryFn: () => base44.entities.CommunicationLog.list("-sent_at", 100),
  });

  const { data: smsLogs = [] } = useQuery({
    queryKey: ["smsLogs"],
    queryFn: () => base44.entities.SmsLog.list("-created_date", 50),
  });

  // Combinar logs de comunicação com SMS logs
  const combinedLogs = [
    ...logs,
    ...smsLogs.map(sms => ({
      id: sms.id,
      channel: "sms",
      recipient_type: "other",
      recipient_name: sms.recipient_name || "N/A",
      recipient_contact: sms.to,
      subject: "",
      body: sms.message,
      sent_at: sms.created_date,
      delivery_status: sms.status === "sent" ? "delivered" : sms.status === "failed" ? "failed" : "sent",
      failure_reason: sms.error_message,
      event_type: sms.event_type || "sms_notification",
      _isSmsLog: true
    }))
  ].sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));

  const filtered = combinedLogs.filter(log => {
    const matchSearch = !searchTerm || 
      log.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.recipient_contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.body?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchChannel = filterChannel === "all" || log.channel === filterChannel;
    const matchStatus = filterStatus === "all" || log.delivery_status === filterStatus;
    const matchRecipient = filterRecipientType === "all" || log.recipient_type === filterRecipientType;

    return matchSearch && matchChannel && matchStatus && matchRecipient;
  });

  const handleViewMessage = (log) => {
    setSelectedLog(log);
    setShowPreview(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="font-semibold text-sm text-gray-700">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar por nome, contato, assunto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterChannel} onValueChange={setFilterChannel}>
            <SelectTrigger>
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Canais</SelectItem>
              <SelectItem value="email">📧 Email</SelectItem>
              <SelectItem value="whatsapp">📱 WhatsApp</SelectItem>
              <SelectItem value="sms">📞 SMS</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="delivered">Entregue</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
              <SelectItem value="opened">Aberto</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterRecipientType} onValueChange={setFilterRecipientType}>
            <SelectTrigger>
              <SelectValue placeholder="Destinatário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="passenger">Passageiros</SelectItem>
              <SelectItem value="driver">Motoristas</SelectItem>
              <SelectItem value="requester">Solicitantes</SelectItem>
              <SelectItem value="client_contact">Contatos Cliente</SelectItem>
              <SelectItem value="coordinator">Coordenadores</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-1">Total Enviadas</p>
          <p className="text-2xl font-bold text-gray-900">{combinedLogs.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-1">Entregues</p>
          <p className="text-2xl font-bold text-green-600">
            {combinedLogs.filter(l => l.delivery_status === "delivered").length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-1">Falharam</p>
          <p className="text-2xl font-bold text-red-600">
            {combinedLogs.filter(l => l.delivery_status === "failed").length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-1">Taxa de Sucesso</p>
          <p className="text-2xl font-bold text-blue-600">
            {combinedLogs.length > 0 
              ? Math.round((combinedLogs.filter(l => l.delivery_status !== "failed").length / combinedLogs.length) * 100)
              : 0}%
          </p>
        </div>
      </div>

      {/* Lista de Logs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Data/Hora</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Canal</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Destinatário</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Assunto/Evento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    {searchTerm || filterChannel !== "all" || filterStatus !== "all" || filterRecipientType !== "all"
                      ? "Nenhum registro encontrado com os filtros aplicados."
                      : "Nenhuma comunicação registrada ainda."}
                  </td>
                </tr>
              ) : (
                filtered.map(log => {
                  const ChannelIcon = CHANNEL_ICONS[log.channel];
                  const StatusIcon = STATUS_ICONS[log.delivery_status];
                  const RecipientIcon = RECIPIENT_ICONS[log.recipient_type] || User;

                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {format(new Date(log.sent_at), "dd/MM/yy HH:mm")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={CHANNEL_STYLE[log.channel]}>
                          {ChannelIcon && <ChannelIcon className="w-3 h-3 mr-1" />}
                          {log.channel.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <RecipientIcon className="w-4 h-4 text-gray-400" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{log.recipient_name || "N/A"}</p>
                            <p className="text-xs text-gray-500 truncate">{log.recipient_contact}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900 truncate max-w-xs">
                          {log.subject || log.event_type || "Sem assunto"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_STYLE[log.delivery_status]}>
                          {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
                          {log.delivery_status === "sent" ? "Enviado" :
                           log.delivery_status === "delivered" ? "Entregue" :
                           log.delivery_status === "failed" ? "Falhou" :
                           log.delivery_status === "opened" ? "Aberto" :
                           log.delivery_status === "clicked" ? "Clicado" : "Pendente"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewMessage(log)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog de Preview */}
      {showPreview && selectedLog && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Mensagem</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Canal:</span>
                  <Badge className={`ml-2 ${CHANNEL_STYLE[selectedLog.channel]}`}>
                    {selectedLog.channel.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <Badge className={`ml-2 ${STATUS_STYLE[selectedLog.delivery_status]}`}>
                    {selectedLog.delivery_status}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500">Destinatário:</span>
                  <p className="font-medium">{selectedLog.recipient_name || "N/A"}</p>
                </div>
                <div>
                  <span className="text-gray-500">Contato:</span>
                  <p className="font-medium">{selectedLog.recipient_contact}</p>
                </div>
                <div>
                  <span className="text-gray-500">Enviado em:</span>
                  <p className="font-medium">{format(new Date(selectedLog.sent_at), "dd/MM/yyyy 'às' HH:mm")}</p>
                </div>
                <div>
                  <span className="text-gray-500">Tipo:</span>
                  <p className="font-medium">{selectedLog.recipient_type}</p>
                </div>
              </div>

              {selectedLog.subject && (
                <div>
                  <span className="text-gray-500 text-sm">Assunto:</span>
                  <p className="font-semibold text-gray-900 mt-1">{selectedLog.subject}</p>
                </div>
              )}

              <div>
                <span className="text-gray-500 text-sm">Mensagem:</span>
                <div className="mt-2 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                    {selectedLog.body}
                  </pre>
                </div>
              </div>

              {selectedLog.failure_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">
                    <strong>Motivo da Falha:</strong> {selectedLog.failure_reason}
                  </p>
                </div>
              )}

              {selectedLog.event_type && (
                <div className="text-xs text-gray-500">
                  Evento: <span className="font-medium">{selectedLog.event_type}</span>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}