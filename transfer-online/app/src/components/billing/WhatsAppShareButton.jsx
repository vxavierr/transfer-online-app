import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BrowserService } from '@/native';

const formatPrice = (price) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price || 0);

export default function WhatsAppShareButton({ selectedRequests, filteredRequests, clients, supplier }) {
  const handleShare = () => {
    const selected = filteredRequests.filter(r => selectedRequests.includes(r.id));
    const total = selected.reduce((sum, r) => sum + (r.chosen_supplier_cost + (r.total_additional_expenses_approved || 0)), 0);

    // Agrupa por cliente
    const byClient = {};
    selected.forEach(r => {
      const client = clients.find(c => c.id === r.client_id);
      const clientName = client?.name || r.billing_responsible_name || 'Cliente';
      if (!byClient[clientName]) byClient[clientName] = [];
      byClient[clientName].push(r);
    });

    const lines = [];
    lines.push(`🚗 *Resumo de Faturamento - ${supplier?.name || ''}*`);
    lines.push(`📅 Emitido em: ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}`);
    lines.push('');

    Object.entries(byClient).forEach(([clientName, trips]) => {
      const clientTotal = trips.reduce((sum, r) => sum + (r.chosen_supplier_cost + (r.total_additional_expenses_approved || 0)), 0);
      lines.push(`🏢 *${clientName}*`);

      trips.forEach((r, idx) => {
        const tripValue = r.chosen_supplier_cost + (r.total_additional_expenses_approved || 0);
        const dateStr = r.date ? format(new Date(r.date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR }) : '-';
        lines.push(`  ${idx + 1}. ${r.request_number || ''}`);
        lines.push(`     📆 ${dateStr} às ${r.time || '-'}`);
        lines.push(`     📍 ${r.origin || '-'} → ${r.destination || '-'}`);
        lines.push(`     👥 ${r.passengers || 1} passageiro${(r.passengers || 1) > 1 ? 's' : ''}`);
        lines.push(`     💰 ${formatPrice(tripValue)}`);
      });

      lines.push(`     Subtotal: *${formatPrice(clientTotal)}*`);
      lines.push('');
    });

    lines.push(`─────────────────`);
    lines.push(`✅ *Total Geral: ${formatPrice(total)}*`);
    lines.push(`📌 ${selected.length} viagem${selected.length !== 1 ? 'ns' : ''} selecionada${selected.length !== 1 ? 's' : ''}`);

    const message = encodeURIComponent(lines.join('\n'));
    BrowserService.open(`https://wa.me/?text=${message}`, '_blank');
  };

  return (
    <Button
      onClick={handleShare}
      variant="outline"
      className="border-green-600 text-green-700 hover:bg-green-50"
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      WhatsApp ({selectedRequests.length})
    </Button>
  );
}