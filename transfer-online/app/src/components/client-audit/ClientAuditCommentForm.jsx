import React, { useState } from 'react';
import { submitClientAuditComment } from '@/functions/submitClientAuditComment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2 } from 'lucide-react';

export default function ClientAuditCommentForm({ token, supplier, driver }) {
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [category, setCategory] = useState('comment');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');
    try {
      await submitClientAuditComment({
        token,
        supplierId: supplier.id,
        driverId: driver?.id,
        driverVehicleId: '',
        authorName,
        authorEmail,
        category,
        message
      });
      setMessage('');
      setSuccess('Mensagem enviada ao fornecedor.');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border bg-gray-50 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Seu nome" required />
        <Input value={authorEmail} onChange={(e) => setAuthorEmail(e.target.value)} placeholder="Seu email" type="email" />
      </div>
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger>
          <SelectValue placeholder="Tipo da interação" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="comment">Comentário</SelectItem>
          <SelectItem value="request">Solicitação</SelectItem>
          <SelectItem value="issue">Apontamento</SelectItem>
        </SelectContent>
      </Select>
      <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`Escreva aqui sua mensagem para ${supplier.name}...`} required className="min-h-[110px]" />
      {success && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <Button type="submit" disabled={loading} className="w-full md:w-auto">
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
        Enviar ao fornecedor
      </Button>
    </form>
  );
}