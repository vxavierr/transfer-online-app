import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarDays, Copy, Check, Mail, Loader2, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr + 'T00:00:00'), "dd/MM/yyyy (EEE)", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

function buildHtmlTable(trips) {
  const rows = trips.map(t => {
    const d = t.original_data || t;
    const phone = d.driver_phone || '-';
    const vehicle = [d.vehicle_model, d.vehicle_color, d.vehicle_plate].filter(Boolean).join(' • ') || '-';
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;white-space:nowrap">${formatDate(t.date)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;white-space:nowrap">${t.time || '-'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${t.origin || '-'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${t.destination || '-'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${t.passenger_name || '-'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${t.driver_name || 'A definir'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;white-space:nowrap">${phone}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${vehicle}</td>
      </tr>`;
  }).join('');

  return `
<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px">
  <thead>
    <tr style="background:#1e40af;color:#fff">
      <th style="padding:10px 12px;text-align:left">Data</th>
      <th style="padding:10px 12px;text-align:left">Hora</th>
      <th style="padding:10px 12px;text-align:left">Origem</th>
      <th style="padding:10px 12px;text-align:left">Destino</th>
      <th style="padding:10px 12px;text-align:left">Passageiro</th>
      <th style="padding:10px 12px;text-align:left">Motorista</th>
      <th style="padding:10px 12px;text-align:left">Telefone</th>
      <th style="padding:10px 12px;text-align:left">Veículo</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>`;
}

export default function TripScheduleSummaryDialog({ open, onClose, selectedTrips }) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderName, setSenderName] = useState('TransferOnline');
  const [emailSubject, setEmailSubject] = useState('Resumo de Agenda de Viagens');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const tableRef = useRef(null);

  const sortedTrips = [...selectedTrips].sort((a, b) => {
    const da = new Date(`${a.date || '9999-01-01'}T${a.time || '00:00'}:00`);
    const db = new Date(`${b.date || '9999-01-01'}T${b.time || '00:00'}:00`);
    return da - db;
  });

  const htmlTable = buildHtmlTable(sortedTrips);

  const fullEmailBody = `
    <div style="font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:24px">
      <h2 style="color:#1e40af;margin-bottom:4px">Resumo de Agenda de Viagens</h2>
      <p style="color:#6b7280;margin-bottom:24px;font-size:13px">${sortedTrips.length} viagem(ns) • Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
      ${htmlTable}
      <p style="color:#9ca3af;font-size:11px;margin-top:20px">Enviado por ${senderName}</p>
    </div>`;

  const handleCopyHtml = async () => {
    try {
      // Copy as rich text so it pastes as a formatted table in Gmail/Outlook
      const blob = new Blob([fullEmailBody], { type: 'text/html' });
      const item = new ClipboardItem({ 'text/html': blob });
      await navigator.clipboard.write([item]);
    } catch {
      // Fallback: copy plain HTML string
      await navigator.clipboard.writeText(fullEmailBody);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async () => {
    if (!recipientEmail) return;
    setSending(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: recipientEmail,
        subject: emailSubject,
        body: fullEmailBody,
        from_name: senderName,
      });
      setSent(true);
    } catch (e) {
      alert('Erro ao enviar e-mail: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSent(false);
    setSending(false);
    setCopied(false);
    setRecipientEmail('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            Resumo de Agenda — {sortedTrips.length} viagem(ns)
          </DialogTitle>
        </DialogHeader>

        {/* Preview da tabela */}
        <div className="overflow-x-auto border rounded-xl shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-800 text-white">
                {['Data', 'Hora', 'Origem', 'Destino', 'Passageiro', 'Motorista', 'Telefone', 'Veículo'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedTrips.map((t, i) => {
                const d = t.original_data || t;
                const phone = d.driver_phone || '-';
                const vehicle = [d.vehicle_model, d.vehicle_color, d.vehicle_plate].filter(Boolean).join(' • ') || '-';
                return (
                  <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-800">{formatDate(t.date)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-700">{t.time || '-'}</td>
                    <td className="px-3 py-2 text-gray-700 max-w-[160px] truncate" title={t.origin}>{t.origin || '-'}</td>
                    <td className="px-3 py-2 text-gray-700 max-w-[160px] truncate" title={t.destination}>{t.destination || '-'}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{t.passenger_name || '-'}</td>
                    <td className={`px-3 py-2 ${t.driver_name ? 'text-gray-900' : 'text-amber-600 italic'}`}>
                      {t.driver_name || 'A definir'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-700">{phone}</td>
                    <td className="px-3 py-2 text-gray-700 text-xs">{vehicle}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Envio por e-mail */}
        <div className="mt-4 space-y-3 border-t pt-4">
          <p className="text-sm font-semibold text-gray-700">Enviar por e-mail</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Destinatário</label>
              <Input
                type="email"
                placeholder="email@empresa.com"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Assunto</label>
              <Input
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
              />
            </div>
          </div>
        </div>

        {sent && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-center gap-2">
            <Check className="w-4 h-4" /> E-mail enviado com sucesso para <strong>{recipientEmail}</strong>!
          </div>
        )}

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={handleClose}>Fechar</Button>
          <Button variant="outline" onClick={handleCopyHtml} className="gap-2">
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado! Cole no e-mail' : 'Copiar Tabela'}
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={!recipientEmail || sending || sent}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Enviando...' : sent ? 'Enviado!' : 'Enviar por E-mail'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}