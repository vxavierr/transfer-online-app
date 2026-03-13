import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

const PLACEHOLDERS = [
  { key: "{{recipient_name}}", desc: "Nome do destinatário" },
  { key: "{{trip_number}}", desc: "Número da viagem" },
  { key: "{{passenger_name}}", desc: "Nome do passageiro" },
  { key: "{{driver_name}}", desc: "Nome do motorista" },
  { key: "{{driver_phone}}", desc: "Telefone do motorista" },
  { key: "{{vehicle_info}}", desc: "Modelo e placa" },
  { key: "{{origin}}", desc: "Origem" },
  { key: "{{destination}}", desc: "Destino" },
  { key: "{{timeline_url}}", desc: "Link de rastreamento" },
  { key: "{{#timeline_url}}texto{{/timeline_url}}", desc: "Bloco condicional (só renderiza se URL existir)" },
];

const RECIPIENTS = [
  { key: "send_to_passenger", label: "Passageiro" },
  { key: "send_to_requester", label: "Solicitante" },
  { key: "send_to_client_contact", label: "Contato do Cliente" },
  { key: "send_to_additional_phones", label: "Telefones Adicionais" },
];

export default function NotificationTemplateForm({ template, onSave, onClose }) {
  const [form, setForm] = useState({
    event_type: "",
    channel: "whatsapp",
    language: "pt",
    subject_template: "",
    body_template: "",
    is_enabled: true,
    send_to_passenger: true,
    send_to_requester: true,
    send_to_client_contact: false,
    send_to_additional_phones: false,
    description: "",
    ...(template || {})
  });

  const insertPlaceholder = (key) => {
    setForm(f => ({ ...f, body_template: f.body_template + key }));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template?.id ? "Editar Template" : "Novo Template"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Evento / Canal / Idioma */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Evento</Label>
              <Select value={form.event_type} onValueChange={v => setForm({ ...form, event_type: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="chegou_origem">Chegou à Origem</SelectItem>
                  <SelectItem value="passageiro_embarcou">Passageiro Embarcou</SelectItem>
                  <SelectItem value="chegou_destino">Chegou ao Destino</SelectItem>
                  <SelectItem value="finalizada">Viagem Finalizada</SelectItem>
                  <SelectItem value="a_caminho">A Caminho</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Canal</Label>
              <Select value={form.channel} onValueChange={v => setForm({ ...form, channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">📱 WhatsApp</SelectItem>
                  <SelectItem value="email">📧 Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Idioma</Label>
              <Select value={form.language} onValueChange={v => setForm({ ...form, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">🇧🇷 Português</SelectItem>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Descrição interna */}
          <div className="space-y-1">
            <Label>Descrição interna</Label>
            <Input
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: WhatsApp PT - Chegou à Origem"
            />
          </div>

          {/* Assunto (apenas email) */}
          {form.channel === "email" && (
            <div className="space-y-1">
              <Label>Assunto do Email</Label>
              <Input
                value={form.subject_template}
                onChange={e => setForm({ ...form, subject_template: e.target.value })}
                placeholder="Ex: ✅ Motorista chegou - Viagem {{trip_number}}"
              />
            </div>
          )}

          {/* Corpo */}
          <div className="space-y-1">
            <Label>Corpo da Mensagem</Label>
            <Textarea
              value={form.body_template}
              onChange={e => setForm({ ...form, body_template: e.target.value })}
              rows={8}
              className="font-mono text-sm"
              placeholder="Escreva o corpo da mensagem..."
            />
          </div>

          {/* Placeholders */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-600">Clique para inserir placeholder no corpo:</p>
            <div className="flex flex-wrap gap-1">
              {PLACEHOLDERS.map(p => (
                <button
                  key={p.key}
                  type="button"
                  title={p.desc}
                  onClick={() => insertPlaceholder(p.key)}
                  className="text-xs bg-white border border-gray-200 rounded px-2 py-1 hover:bg-blue-50 hover:border-blue-300 transition-colors font-mono"
                >
                  {p.key.length > 25 ? p.key.substring(0, 14) + '…' : p.key}
                </button>
              ))}
            </div>
          </div>

          {/* Destinatários */}
          <div className="space-y-2">
            <Label className="font-semibold">Enviar para:</Label>
            <div className="grid grid-cols-2 gap-2">
              {RECIPIENTS.map(r => (
                <div key={r.key} className="flex items-center gap-2">
                  <Checkbox
                    id={r.key}
                    checked={!!form[r.key]}
                    onCheckedChange={v => setForm({ ...form, [r.key]: v })}
                  />
                  <label htmlFor={r.key} className="text-sm cursor-pointer">{r.label}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Ativo */}
          <div className="flex items-center gap-3 pt-1">
            <Switch
              checked={form.is_enabled !== false}
              onCheckedChange={v => setForm({ ...form, is_enabled: v })}
            />
            <Label>{form.is_enabled !== false ? "Template Ativo" : "Template Inativo"}</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => onSave(form)}
            disabled={!form.event_type || !form.body_template}
          >
            Salvar Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}