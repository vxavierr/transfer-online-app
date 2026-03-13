import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Share2, Copy, Loader2, Link as LinkIcon, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ShareTripsDialog({ 
  open, 
  onClose, 
  selectedTrips = [], // Array of trip objects { id, type, ... }
  totalFiltered = 0 
}) {
  const [step, setStep] = useState('config'); // config | success
  const [listName, setListName] = useState('');
  const [coordinatorName, setCoordinatorName] = useState('');
  const [expiryHours, setExpiryHours] = useState('48');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!listName) {
      alert('Por favor, dê um nome para a lista.');
      return;
    }

    if (selectedTrips.length === 0) {
      alert('Nenhuma viagem selecionada.');
      return;
    }

    setIsLoading(true);
    try {
      const tripIds = selectedTrips.map(t => t.id);
      
      const response = await base44.functions.invoke('createSharedTripList', {
        name: listName,
        coordinatorName,
        tripIds,
        expiresInHours: parseInt(expiryHours)
      });

      if (response.data.success) {
        const link = `${window.location.origin}${response.data.publicPath}`;
        setGeneratedLink(link);
        setStep('success');
      } else {
        alert('Erro ao gerar link: ' + response.data.error);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao conectar com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    alert('Link copiado!');
  };

  const handleClose = () => {
    setStep('config');
    setListName('');
    setCoordinatorName('');
    setGeneratedLink('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            {step === 'config' ? 'Compartilhar Viagens' : 'Link Gerado!'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {step === 'config' ? 'Configure as opções de compartilhamento para gerar um link público.' : 'Seu link de compartilhamento foi gerado com sucesso.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'config' ? (
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Você selecionou <strong>{selectedTrips.length}</strong> viagens para compartilhar.</span>
            </div>

            <div className="space-y-2">
              <Label>Nome do Evento / Lista *</Label>
              <Input 
                placeholder="Ex: Evento Corporativo SP - 12/12" 
                value={listName}
                onChange={e => setListName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Nome do Coordenador (Opcional)</Label>
              <Input 
                placeholder="Ex: Maria Silva" 
                value={coordinatorName}
                onChange={e => setCoordinatorName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Validade do Link</Label>
              <Select value={expiryHours} onValueChange={setExpiryHours}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 Horas</SelectItem>
                  <SelectItem value="48">48 Horas</SelectItem>
                  <SelectItem value="72">3 Dias</SelectItem>
                  <SelectItem value="168">7 Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LinkIcon className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900">Link Público Criado!</h3>
              <p className="text-sm text-gray-500">
                Compartilhe este link com seu cliente. Eles poderão visualizar o status das viagens em tempo real sem precisar de login.
              </p>
            </div>

            <div className="flex gap-2">
              <Input value={generatedLink} readOnly className="bg-gray-50" />
              <Button onClick={handleCopy} size="icon" variant="outline">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'config' ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleGenerate} disabled={isLoading || !listName} className="bg-blue-600 hover:bg-blue-700">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Share2 className="w-4 h-4 mr-2" />}
                Gerar Link
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} className="w-full">Concluído</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}