import React from 'react';
import { Info } from 'lucide-react';

export default function TripNotes({ notes = '', partnerNotes = '' }) {
  let displayNotes = notes || '';

  // Add partner notes if available
  if (partnerNotes) {
    displayNotes = displayNotes ? `${displayNotes}\n\n${partnerNotes}` : partnerNotes;
  }

  if (displayNotes.includes('Otimizado por IA') || displayNotes.includes('Veículo flexível criado por IA')) {
    const clean = displayNotes
      .replace(/Otimizado por IA.*?(\.|$)/gi, '')
      .replace(/Veículo flexível criado por IA.*?(\.|$)/gi, '')
      .replace(/Criados \d+ grupos.*?(\.|$)/gi, '')
      .replace(/.*?passageiros com.*?(\.|$)/gi, '')
      .replace(/.*?janela total.*?(\.|$)/gi, '')
      .replace(/.*?passageiros agrupados.*?(\.|$)/gi, '')
      .replace(/.*?passageiros pré-atribuídos.*?(\.|$)/gi, '')
      .replace(/.*?mesmo destino.*?(\.|$)/gi, '')
      .replace(/.*?viagens individuais.*?(\.|$)/gi, '')
      .replace(/\.\./g, '.')
      .replace(/^[.,\s]+|[.,\s]+$/g, '')
      .trim();
    
    if (clean.length < 3) return null;
    displayNotes = clean;
  }

  if (!displayNotes) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-xs text-amber-700 font-bold uppercase mb-1">Observações da Viagem</div>
          <p className="text-sm text-gray-800 leading-relaxed font-medium whitespace-pre-wrap">{displayNotes}</p>
        </div>
      </div>
    </div>
  );
}