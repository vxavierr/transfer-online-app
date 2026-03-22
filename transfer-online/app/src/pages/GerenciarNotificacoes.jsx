import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Pencil, Trash2, Bell, Loader2, Zap, AlertCircle, User, Users, Building2, Phone, MessageSquare, BarChart3, Car } from "lucide-react";
import NotificationTemplateForm from "@/components/notifications/NotificationTemplateForm";
import { DEFAULT_TEMPLATES } from "@/components/notifications/defaultTemplates";
import CommunicationHistoryTab from "@/components/communications/CommunicationHistoryTab";
import DriverMessagesTab from "@/components/communications/DriverMessagesTab";
import AnalyticsDashboard from "@/components/communications/AnalyticsDashboard";

const EVENT_LABELS = {
  lembrete_motorista: "🔔 Lembrete de Viagem ao Motorista",
  chegou_origem: "🗺️ Motorista Chegou à Origem",
  passageiro_embarcou: "🚀 Passageiro Embarcou",
  chegou_destino: "🎉 Motorista Chegou ao Destino",
  finalizada: "✅ Viagem Finalizada",
  a_caminho: "🚗 Motorista a Caminho",
  solicitar_avaliacao: "⭐ Solicitar Avaliação",
};

const EVENT_ORDER = ["lembrete_motorista", "a_caminho", "chegou_origem", "passageiro_embarcou", "chegou_destino", "finalizada", "solicitar_avaliacao"];

const CHANNEL_STYLE = { email: "bg-blue-100 text-blue-700", whatsapp: "bg-green-100 text-green-700" };
const LANG_STYLE = { pt: "bg-yellow-100 text-yellow-700", en: "bg-purple-100 text-purple-700", es: "bg-orange-100 text-orange-700" };
const LANG_LABEL = { pt: "🇧🇷 PT", en: "🇺🇸 EN", es: "🇪🇸 ES" };

function RecipientDots({ template }) {
  const items = [
    { flag: "send_to_driver", icon: Car, tip: "Motorista" },
    { flag: "send_to_passenger", icon: User, tip: "Passageiro" },
    { flag: "send_to_requester", icon: Users, tip: "Solicitante" },
    { flag: "send_to_client_contact", icon: Building2, tip: "Contato do Cliente" },
    { flag: "send_to_additional_phones", icon: Phone, tip: "Telefones Adicionais" },
  ];
  return (
    <div className="flex gap-1">
      {items.map(({ flag, icon: Icon, tip }) => (
        <span
          key={flag}
          title={tip}
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${template[flag] ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-300"}`}
        >
          <Icon className="w-3 h-3" />
        </span>
      ))}
    </div>
  );
}

export default function GerenciarNotificacoes() {
  const [activeTab, setActiveTab] = useState("templates");
  const [filterLang, setFilterLang] = useState("all");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["notificationTemplates"],
    queryFn: () => base44.entities.NotificationTemplate.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.NotificationTemplate.create(data),
    onSuccess: () => { queryClient.invalidateQueries(["notificationTemplates"]); setShowForm(false); setEditingTemplate(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.NotificationTemplate.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(["notificationTemplates"]); setShowForm(false); setEditingTemplate(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.NotificationTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["notificationTemplates"]),
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const existingKeys = new Set(templates.map(t => `${t.event_type}_${t.channel}_${t.language}`));
      const toCreate = DEFAULT_TEMPLATES.filter(t => !existingKeys.has(`${t.event_type}_${t.channel}_${t.language}`));
      if (toCreate.length > 0) await base44.entities.NotificationTemplate.bulkCreate(toCreate);
      return toCreate.length;
    },
    onSuccess: () => queryClient.invalidateQueries(["notificationTemplates"]),
  });

  const handleSave = (formData) => {
    if (editingTemplate?.id) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filtered = filterLang === "all" ? templates : templates.filter(t => t.language === filterLang);

  const grouped = filtered.reduce((acc, t) => {
    if (!acc[t.event_type]) acc[t.event_type] = [];
    acc[t.event_type].push(t);
    return acc;
  }, {});

  const missingCount = DEFAULT_TEMPLATES.filter(dt => !templates.some(t => t.event_type === dt.event_type && t.channel === dt.channel && t.language === dt.language)).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Centro de Comunicações</h1>
            <p className="text-sm text-gray-500">Gerencie templates, histórico de mensagens, motoristas e analytics</p>
          </div>
        </div>
      </div>

      {/* Tabs Principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
          <TabsTrigger value="drivers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Motoristas</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Templates */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end gap-2">
            {missingCount > 0 && (
              <Button
                variant="outline"
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
              >
                {seedMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                {templates.length === 0 ? `Semear Templates Padrão (${DEFAULT_TEMPLATES.length})` : `Adicionar Faltantes (${missingCount})`}
              </Button>
            )}
            <Button onClick={() => { setEditingTemplate(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Template
            </Button>
          </div>

          {templates.length === 0 && !isLoading && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">
                Nenhum template encontrado. Clique em <strong>"Semear Templates Padrão"</strong> para criar os templates iniciais (PT, EN, ES) com os textos padrão do sistema.
                Enquanto não houver templates, o sistema usa mensagens fixas (fallback).
              </AlertDescription>
            </Alert>
          )}

          {/* Filtro por idioma */}
          <Tabs value={filterLang} onValueChange={setFilterLang}>
            <TabsList>
              <TabsTrigger value="all">Todos ({templates.length})</TabsTrigger>
              <TabsTrigger value="pt">🇧🇷 Português</TabsTrigger>
              <TabsTrigger value="en">🇺🇸 English</TabsTrigger>
              <TabsTrigger value="es">🇪🇸 Español</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Legenda destinatários */}
          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
            <span className="font-semibold">Destinatários (ícones coloridos = ativo):</span>
            <span className="flex items-center gap-1"><Car className="w-3 h-3" /> Motorista</span>
            <span className="flex items-center gap-1"><User className="w-3 h-3" /> Passageiro</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Solicitante</span>
            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> Contato Cliente</span>
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> Telefones Adicionais</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {EVENT_ORDER.map(eventType => {
                const eventTemplates = grouped[eventType] || [];
                return (
                  <div key={eventType} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-800 text-sm">{EVENT_LABELS[eventType] || eventType}</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {eventTemplates.length === 0 ? (
                        <div className="px-4 py-4 text-sm text-gray-400">Nenhum template cadastrado para este evento.</div>
                      ) : (
                        [...eventTemplates]
                          .sort((a, b) => a.channel.localeCompare(b.channel) || a.language.localeCompare(b.language))
                          .map(t => (
                            <div key={t.id} className={`px-4 py-3 flex items-center justify-between gap-3 ${t.is_enabled === false ? "opacity-50" : ""}`}>
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <Badge className={CHANNEL_STYLE[t.channel]}>
                                  {t.channel === "whatsapp" ? "📱 WhatsApp" : "📧 Email"}
                                </Badge>
                                <Badge className={LANG_STYLE[t.language]}>{LANG_LABEL[t.language]}</Badge>
                                <span className="text-sm text-gray-500 truncate max-w-xs hidden sm:block">
                                  {t.description || t.body_template?.substring(0, 50) + "…"}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <RecipientDots template={t} />
                                <div className="flex items-center gap-1.5">
                                  <Switch
                                    checked={t.is_enabled !== false}
                                    onCheckedChange={() => updateMutation.mutate({ id: t.id, data: { is_enabled: !t.is_enabled } })}
                                  />
                                  <span className="text-xs text-gray-400 w-10">{t.is_enabled !== false ? "Ativo" : "Inativo"}</span>
                                </div>
                                <Button
                                  variant="ghost" size="icon"
                                  onClick={() => { setEditingTemplate(t); setShowForm(true); }}
                                >
                                  <Pencil className="w-4 h-4 text-gray-400" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon"
                                  onClick={() => { if (confirm("Excluir este template?")) deleteMutation.mutate(t.id); }}
                                >
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                </Button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && templates.length > 0 && (
                <p className="text-center text-gray-400 py-10">Nenhum template para o idioma selecionado.</p>
              )}
            </div>
          )}

          {showForm && (
            <NotificationTemplateForm
              template={editingTemplate}
              onSave={handleSave}
              onClose={() => { setShowForm(false); setEditingTemplate(null); }}
            />
          )}
        </TabsContent>

        {/* Tab: Histórico */}
        <TabsContent value="history">
          <CommunicationHistoryTab />
        </TabsContent>

        {/* Tab: Motoristas */}
        <TabsContent value="drivers">
          <DriverMessagesTab />
        </TabsContent>

        {/* Tab: Analytics */}
        <TabsContent value="analytics">
          <AnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}