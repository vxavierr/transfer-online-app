import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Send, Eye, CheckCircle, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function DriverMessagesTab() {
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState("all");
  const [messageTitle, setMessageTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const queryClient = useQueryClient();

  const { data: drivers = [], isLoading: isLoadingDrivers } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => base44.entities.Driver.filter({ active: true }),
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["driverMessages"],
    queryFn: () => base44.entities.DriverMessage.list("-created_date", 100),
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke("sendDriverMessage", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["driverMessages"]);
      queryClient.invalidateQueries(["communicationLogs"]);
      toast.success("Mensagem enviada com sucesso!");
      setShowSendDialog(false);
      setMessageTitle("");
      setMessageBody("");
      setSelectedDriver("all");
      setPriority("normal");
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Erro ao enviar mensagem");
    }
  });

  const handleSendMessage = () => {
    if (!messageTitle.trim() || !messageBody.trim()) {
      toast.error("Preencha o título e a mensagem");
      return;
    }

    sendMessageMutation.mutate({
      driver_id: selectedDriver === "all" ? null : selectedDriver,
      title: messageTitle,
      message: messageBody,
      priority: priority
    });
  };

  const groupedMessages = messages.reduce((acc, msg) => {
    const driverName = msg.driver_name || "Motorista Desconhecido";
    if (!acc[driverName]) acc[driverName] = [];
    acc[driverName].push(msg);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com botão de envio */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Mensagens para Motoristas</h2>
          <p className="text-sm text-gray-500">Histórico de comunicações enviadas aos motoristas</p>
        </div>
        <Button onClick={() => setShowSendDialog(true)} className="bg-blue-600 hover:bg-blue-700">
          <Send className="w-4 h-4 mr-2" />
          Enviar Mensagem
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-1">Total de Mensagens</p>
          <p className="text-2xl font-bold text-gray-900">{messages.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-1">Lidas</p>
          <p className="text-2xl font-bold text-green-600">
            {messages.filter(m => m.is_read).length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-1">Não Lidas</p>
          <p className="text-2xl font-bold text-orange-600">
            {messages.filter(m => !m.is_read).length}
          </p>
        </div>
      </div>

      {/* Lista de Mensagens Agrupadas por Motorista */}
      <div className="space-y-3">
        {Object.entries(groupedMessages).map(([driverName, driverMsgs]) => (
          <div key={driverName} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-600" />
                <h3 className="font-semibold text-gray-800 text-sm">{driverName}</h3>
                <Badge variant="outline" className="text-xs">{driverMsgs.length} mensagens</Badge>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {driverMsgs.map(msg => (
                <div key={msg.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm text-gray-900">{msg.title}</p>
                      {msg.priority === "high" && (
                        <Badge className="bg-red-100 text-red-700 text-xs">Alta Prioridade</Badge>
                      )}
                      {msg.is_read && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">{msg.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(msg.created_date), "dd/MM/yyyy 'às' HH:mm")}
                      {msg.is_read && msg.read_at && ` • Lida em ${format(new Date(msg.read_at), "dd/MM HH:mm")}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            Nenhuma mensagem enviada aos motoristas ainda.
          </div>
        )}
      </div>

      {/* Dialog de Envio */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enviar Mensagem para Motoristas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Destinatário</label>
              <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motorista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📢 Todos os Motoristas</SelectItem>
                  {drivers.map(driver => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Prioridade</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta Prioridade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Título</label>
              <Input
                placeholder="Ex: Atualização Importante do Sistema"
                value={messageTitle}
                onChange={(e) => setMessageTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Mensagem</label>
              <Textarea
                placeholder="Digite a mensagem aqui..."
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={sendMessageMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}