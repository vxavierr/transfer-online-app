import React, { useState } from 'react';
import { generateClientAuditAccessLink } from '@/functions/generateClientAuditAccessLink';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Loader2, ShieldCheck } from 'lucide-react';

export default function ClientAuditAccessDialog({ client, open, onOpenChange }) {
  const [auditorName, setAuditorName] = useState('');
  const [auditorEmail, setAuditorEmail] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [generatedExpiry, setGeneratedExpiry] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!client?.id) return;
    setLoading(true);
    setError('');
    try {
      const response = await generateClientAuditAccessLink({
        clientId: client.id,
        auditorName,
        auditorEmail,
        expiresInHours: Number(expiresInHours)
      });
      setGeneratedLink(response.data.accessUrl);
      setGeneratedExpiry(response.data.expiresAt);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (value) => {
    if (!value) {
      setAuditorName('');
      setAuditorEmail('');
      setExpiresInHours(72);
      setGeneratedLink('');
      setGeneratedExpiry('');
      setError('');
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Gerar acesso temporário de auditoria
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-blue-50 p-4 text-sm text-blue-900">
            Cliente: <strong>{client?.name}</strong>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome do gestor</Label>
              <Input value={auditorName} onChange={(e) => setAuditorName(e.target.value)} placeholder="Ex: João Martins" />
            </div>
            <div className="space-y-2">
              <Label>Email do gestor</Label>
              <Input value={auditorEmail} onChange={(e) => setAuditorEmail(e.target.value)} placeholder="gestor@cliente.com" type="email" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Validade em horas</Label>
            <Input value={expiresInHours} onChange={(e) => setExpiresInHours(e.target.value)} type="number" min="1" />
          </div>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {generatedLink && (
            <div className="space-y-2 rounded-lg border bg-gray-50 p-4">
              <Label>Link gerado</Label>
              <div className="flex gap-2">
                <Input value={generatedLink} readOnly className="font-mono text-xs" />
                <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(generatedLink)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">Validade até: {new Date(generatedExpiry).toLocaleString('pt-BR')}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Fechar</Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Gerar link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}