import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ServiceOrderPDFDialog({ serviceRequest, open, onClose }) {
  const [language, setLanguage] = useState('pt');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePDF = async () => {
    if (!serviceRequest) return;
    
    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('generateServiceOrderPDF', {
        requestId: serviceRequest.id,
        requestType: serviceRequest.type,
        language
      });

      if (response.data && response.data.pdfBase64) {
        // Convert base64 to blob and download
        const byteCharacters = atob(response.data.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Ordem_Servico_${serviceRequest.request_number || 'OS'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        onClose();
      } else {
        alert('Erro ao gerar PDF: Resposta inválida');
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erro desconhecido';
      alert(`Erro ao gerar PDF: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Exportar Ordem de Serviço
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
            Você está gerando a Ordem de Serviço para a solicitação <strong>{serviceRequest?.request_number}</strong>.
          </div>
          
          <div className="space-y-2">
            <Label>Selecione o Idioma do Documento</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">Português (Brasil)</SelectItem>
                <SelectItem value="en">English (Internacional)</SelectItem>
                <SelectItem value="es">Español (Latam)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button onClick={handleGeneratePDF} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-700">
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}