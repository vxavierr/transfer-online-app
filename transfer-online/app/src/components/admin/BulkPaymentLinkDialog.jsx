import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Copy, Check, Loader2, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function BulkPaymentLinkDialog({ open, onClose, selectedTrips }) {
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');

  // Only service_request trips have payment link generation
  const eligibleTrips = selectedTrips.filter(t => t.type === 'service_request' && t.price > 0);
  const nonEligible = selectedTrips.filter(t => t.type !== 'service_request' || t.price <= 0);

  const totalAmount = eligibleTrips.reduce((sum, t) => sum + (t.price || 0), 0);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleGenerate = async () => {
    if (eligibleTrips.length === 0) return;
    setLoading(true);
    try {
      const ids = eligibleTrips.map(t => t.id);
      const res = await base44.functions.invoke('generateBulkPaymentLink', {
        serviceRequestIds: ids,
        recipientEmail: recipientEmail || undefined,
      });
      if (res?.data?.payment_link) {
        setPaymentLink(res.data.payment_link);
      } else {
        alert('Erro ao gerar link: ' + (res?.data?.error || 'Erro desconhecido'));
      }
    } catch (e) {
      alert('Erro ao gerar link: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setPaymentLink(null);
    setCopied(false);
    setRecipientEmail('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Gerar Link de Pagamento Agrupado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Eligible trips */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Viagens incluídas ({eligibleTrips.length}):
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-2 bg-gray-50">
              {eligibleTrips.map(t => (
                <div key={t.id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-white">
                  <div>
                    <span className="font-medium text-blue-700">{t.display_id}</span>
                    <span className="text-gray-500 ml-2 text-xs">{t.passenger_name}</span>
                  </div>
                  <span className="font-medium text-green-700">{formatCurrency(t.price)}</span>
                </div>
              ))}
              {eligibleTrips.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-2">Nenhuma viagem corporativa elegível selecionada.</p>
              )}
            </div>
          </div>

          {/* Non-eligible warning */}
          {nonEligible.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <strong>{nonEligible.length} viagem(ns)</strong> não incluídas (apenas solicitações corporativas com valor definido são suportadas).
            </div>
          )}

          {/* Total */}
          {eligibleTrips.length > 0 && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
              <span className="font-medium text-blue-900">Total a cobrar:</span>
              <span className="font-bold text-xl text-blue-700">{formatCurrency(totalAmount)}</span>
            </div>
          )}

          {/* Optional email */}
          {!paymentLink && eligibleTrips.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                E-mail do responsável pelo pagamento (opcional)
              </label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
              />
            </div>
          )}

          {/* Generated link */}
          {paymentLink && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-700">✅ Link gerado com sucesso!</p>
              <div className="flex items-center gap-2">
                <Input value={paymentLink} readOnly className="text-xs font-mono" />
                <Button size="icon" variant="outline" onClick={handleCopy} className="flex-shrink-0">
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
                <a href={paymentLink} target="_blank" rel="noopener noreferrer">
                  <Button size="icon" variant="outline" className="flex-shrink-0">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            {paymentLink ? 'Fechar' : 'Cancelar'}
          </Button>
          {!paymentLink && (
            <Button
              onClick={handleGenerate}
              disabled={loading || eligibleTrips.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</>
              ) : (
                <><CreditCard className="w-4 h-4 mr-2" /> Gerar Link</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}