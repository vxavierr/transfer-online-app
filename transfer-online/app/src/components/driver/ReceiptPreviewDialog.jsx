import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { BrowserService } from '@/native';

export default function ReceiptPreviewDialog({ open, onOpenChange, imageUrl }) {
  if (!imageUrl) return null;

  const handleDownload = () => {
    BrowserService.open(imageUrl);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-base">Comprovante de Abastecimento</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-4 flex flex-col items-center gap-3">
          <img 
            src={imageUrl} 
            alt="Comprovante" 
            className="w-full max-h-[60vh] object-contain rounded-lg border border-gray-200"
          />
          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" /> Abrir em nova aba
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}