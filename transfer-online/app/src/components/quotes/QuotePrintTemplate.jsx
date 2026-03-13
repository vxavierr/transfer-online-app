import React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function QuotePrintTemplate({ quote }) {
  if (!quote) return null;

  const formatPrice = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, "dd/MM/yyyy", { locale: ptBR }) : dateStr;
  };

  const formatFullDate = (dateStr) => {
     if (!dateStr) return '';
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : dateStr;
  };

  const getServiceTypeLabel = (type) => {
    if (!type) return '';
    const types = {
      'transfer': 'Transfer',
      'one_way': 'Transfer',
      'round_trip': 'Transfer (Ida e Volta)',
      'hourly': 'À Disposição',
      'hourly_5': 'Diária 5 Horas',
      'hourly_10': 'Diária 10 Horas',
      'hourly_custom': 'Diária Personalizada'
    };
    return types[type] || type;
  };

  // Coletar todos os itens adicionais (globais e por trecho) para detalhamento
  let allAdditionalItems = [];
  
  // 1. Itens globais (tenta selected_additional_items e additional_items)
  if (Array.isArray(quote.selected_additional_items)) {
    allAdditionalItems.push(...quote.selected_additional_items);
  } else if (Array.isArray(quote.additional_items)) {
    allAdditionalItems.push(...quote.additional_items);
  }

  // 2. Itens por trecho (Agency Legs)
  if (quote.agency_quoted_legs && Array.isArray(quote.agency_quoted_legs)) {
      quote.agency_quoted_legs.forEach((leg, index) => {
          const legItems = leg.selected_additional_items || leg.additional_items;
          if (Array.isArray(legItems) && legItems.length > 0) {
             allAdditionalItems.push(...legItems.map(i => ({...i, _ctx: `(Trecho ${index + 1})`})));
          }
      });
  } 
  
  // 3. Itens por trecho (Quoted Trips - fallback)
  if (quote.quoted_trips && Array.isArray(quote.quoted_trips) && (!quote.agency_quoted_legs || quote.agency_quoted_legs.length === 0)) {
      quote.quoted_trips.forEach((trip, index) => {
          const tripItems = trip.selected_additional_items || trip.additional_items;
          if (Array.isArray(tripItems) && tripItems.length > 0) {
             allAdditionalItems.push(...tripItems.map(i => ({...i, _ctx: `(Trecho ${index + 1})`})));
          }
      });
  }

  // Calcular total considerando quantidade
  const additionalItemsTotal = allAdditionalItems.reduce((acc, item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 1;
      return acc + (price * quantity);
  }, 0);

  // Verifica se há múltiplas opções de veículos (para ocultar total)
  const hasMultipleVehicleOptions = quote.agency_quoted_legs?.some(leg => leg.vehicle_options && leg.vehicle_options.length > 1);

  // Cálculo robusto do valor total
  // Base value (admin_quote_price) + Additional Items
  let baseValue = Number(quote.admin_quote_price) || 
                    Number(quote.total_price) || 
                    Number(quote.calculated_price) ||
                    (quote.quoted_trips?.reduce((acc, t) => acc + (Number(t.price) || 0), 0));

  // Se não tiver valor base definido, mas tiver trechos de agência com opção única, soma eles
  if (!baseValue && quote.agency_quoted_legs?.length > 0 && !hasMultipleVehicleOptions) {
      baseValue = quote.agency_quoted_legs.reduce((acc, leg) => {
          const price = leg.vehicle_options?.[0]?.price;
          return acc + (Number(price) || 0);
      }, 0);
  }

  baseValue = baseValue || 0;
                    
  const totalValue = baseValue + additionalItemsTotal;

  // Preparar lista unificada de trechos para exibição (sempre 3 slots)
  let displayLegs = [];
  if (quote.agency_quoted_legs && quote.agency_quoted_legs.length > 0) {
      displayLegs = quote.agency_quoted_legs.map(leg => ({ ...leg, _type: 'agency' }));
  } else if (quote.quoted_trips && quote.quoted_trips.length > 0) {
      displayLegs = quote.quoted_trips.map(trip => ({ ...trip, _type: 'quoted' }));
  } else {
      // Single quote normalization
      displayLegs.push({
          _type: 'standard',
          service_type: quote.service_type,
          date: quote.date,
          time: quote.time,
          origin: quote.origin,
          destination: quote.destination,
          notes: quote.notes,
          vehicle_type_name: quote.vehicle_type_name,
          price: baseValue, // Exibir preço no primeiro trecho para standard
          passengers: quote.passengers,
          selected_additional_items: quote.selected_additional_items
      });
      if (quote.return_date) {
          displayLegs.push({
              _type: 'standard',
              service_type: 'Volta', // Label visual
              date: quote.return_date,
              time: quote.return_time,
              origin: quote.destination, // Invertido implícito para volta
              destination: quote.origin,
              notes: 'Retorno',
              vehicle_type_name: quote.vehicle_type_name,
              price: null,
              passengers: quote.passengers
          });
      }
  }

  // Preencher até 3 slots para manter layout fixo na impressão
  while (displayLegs.length < 3) {
      displayLegs.push({ _isEmpty: true });
  }

  return (
    <div id="printable-quote-content" className="bg-white font-sans text-gray-900 mx-auto w-full">
      <style>{`
        @media print {
          @page { 
            margin: 5mm; 
            size: A4 portrait; 
            @bottom-right {
              content: "Folha " counter(page) " / " counter(pages);
              font-size: 9px;
              color: #9CA3AF;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
          }
          body * {
            visibility: hidden;
          }
          #printable-quote-modal-container, #printable-quote-modal-container * {
            visibility: visible;
          }
          #printable-quote-modal-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            z-index: 9999 !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            display: block !important;
            transform: none !important;
            border: none !important;
          }
          html, body {
            height: auto;
            overflow: visible;
          }
          /* Forçar impressão de cores de fundo e gráficos */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .no-print { display: none !important; }

          /* Garantir que slots vazios fiquem invisíveis na impressão, sobrescrevendo a regra global */
          .empty-slot, .empty-slot * {
            visibility: hidden !important;
          }
          
          #printable-quote-content {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            box-shadow: none !important;
            margin: 0 auto !important;
          }

          /* Tabela para repetição de cabeçalho e rodapé */
          table { width: 100%; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tbody { display: table-row-group; }
          
          /* Otimizações Específicas para Impressão */
          .shadow-sm, .shadow, .rounded-lg, .rounded-md, .rounded {
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .print-break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: block !important;
            margin-bottom: 0.5rem !important;
          }
          
          /* Reduzir espaçamentos verticais para caber mais */
          h1 { font-size: 1.25rem !important; margin-bottom: 0.1rem !important; line-height: 1.1 !important; }
          h2 { font-size: 1rem !important; margin-bottom: 0.1rem !important; }
          h3 { font-size: 0.75rem !important; margin-bottom: 0.25rem !important; padding-bottom: 0.1rem !important; }
          p { margin-bottom: 0.05rem !important; }
          section { margin-bottom: 0.25rem !important; }
          
          /* Ajustar textos para leitura melhor */
          .text-sm { font-size: 0.85rem !important; line-height: 1.3 !important; }
          .text-xs { font-size: 0.75rem !important; line-height: 1.2 !important; }
          .text-base { font-size: 1rem !important; }
          .text-lg { font-size: 1.125rem !important; }
          .text-xl { font-size: 1.25rem !important; }
          
          /* Espaçamentos mais naturais */
          .p-8 { padding: 1.5rem !important; }
          .p-3 { padding: 0.75rem !important; }
          .p-2 { padding: 0.5rem !important; }
          .gap-2 { gap: 0.5rem !important; }
          .mb-4 { margin-bottom: 1rem !important; }
          .mb-2 { margin-bottom: 0.5rem !important; }
          .pb-4 { padding-bottom: 1rem !important; }
          .pt-4 { padding-top: 1rem !important; }
          .h-4 { height: 1rem !important; }
        }
      `}</style>

      <table className="w-full">
        <thead>
          <tr>
            <td>
              {/* Header */}
              <header className="border-b border-blue-600 pb-2 mb-2 flex justify-between items-center pt-2">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 flex-shrink-0">
                     <img 
                       src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68effdb75fcac474f3f66b8f/57204d3c2_logo-icone.jpg" 
                       alt="TransferOnline Logo" 
                       className="w-full h-full object-contain"
                     />
                   </div>
                   <div>
                     <h1 className="text-lg font-bold text-blue-600 leading-tight">TransferOnline</h1>
                     <div className="flex gap-2">
                       <p className="text-[9px] text-gray-500">Soluções em Transporte Executivo</p>
                       <p className="text-[9px] text-gray-400">CNPJ: 28.077.532/0001-46</p>
                     </div>
                   </div>
                </div>
                <div className="text-right">
                  <h2 className="text-sm font-bold text-gray-800">Cotação #{quote.quote_number || 'Nova'}</h2>
                  <p className="text-[10px] text-gray-500">
                    {formatFullDate(new Date().toISOString())}
                  </p>
                </div>
              </header>
              <div className="h-2"></div>
            </td>
          </tr>
        </thead>
        
        <tbody>
          <tr>
            <td>
              {/* Client Info */}
              <section className="mb-2">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs bg-gray-50 p-2 rounded border border-gray-100">
                  <div className="flex gap-1">
                    <span className="font-bold text-gray-500 uppercase w-20 flex-shrink-0">Cliente:</span>
                    <span className="font-bold text-gray-900 truncate">{quote.customer_name || quote.client_name || '-'}</span>
                  </div>
                  <div className="flex gap-1">
                    <span className="font-bold text-gray-500 uppercase w-16 flex-shrink-0">Email:</span>
                    <span className="text-gray-900 truncate">{quote.customer_email || '-'}</span>
                  </div>
                  {quote.customer_phone && (
                    <div className="flex gap-1">
                      <span className="font-bold text-gray-500 uppercase w-20 flex-shrink-0">Telefone:</span>
                      <span className="text-gray-900">{quote.customer_phone}</span>
                    </div>
                  )}
                  {quote.requester_name && (
                    <div className="flex gap-1">
                      <span className="font-bold text-gray-500 uppercase w-20 flex-shrink-0">Solicitante:</span>
                      <span className="text-gray-900 truncate">{quote.requester_name}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Trip Details - Layout Unificado com 3 Slots */}
              <section className="mb-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">Detalhes da Viagem</h3>
                
                <div className="space-y-2">
                  {displayLegs.map((leg, idx) => (
                    <div 
                      key={idx} 
                      className={`bg-white p-2 rounded-lg border border-gray-200 shadow-sm print-break-inside-avoid ${leg._isEmpty ? 'invisible empty-slot' : ''}`}
                      aria-hidden={leg._isEmpty}
                    >
                      {/* Header do Trecho */}
                      <div className="flex justify-between items-center mb-1 border-b border-gray-100 pb-1">
                        <div className="font-bold text-blue-800 text-sm flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs uppercase tracking-wide">Trecho {idx + 1}</span>
                          <span className="text-gray-700 font-bold uppercase text-xs border border-gray-200 px-2 py-0.5 rounded bg-gray-50">
                            {getServiceTypeLabel(leg.service_type || 'Transfer')}
                          </span>
                          <span className="ml-1">{formatDate(leg.date || new Date().toISOString())} às {leg.time || '00:00'}</span>
                        </div>
                        {/* Preço (apenas para não-agência ou se tiver preço explícito, e não for vazio) */}
                        {!leg._isEmpty && (leg.price !== undefined && leg.price !== null && leg._type !== 'agency') && (
                           <div className="font-bold text-gray-900 text-lg">{formatPrice(leg.price)}</div>
                        )}
                      </div>
                      
                      {/* Rota */}
                      <div className="text-xs text-gray-800 mb-1">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-[10px] font-bold text-gray-400 uppercase w-8 flex-shrink-0">De:</span>
                          <span className="font-medium truncate">{leg.origin || 'Endereço de Origem'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase w-8 flex-shrink-0">Para:</span>
                          <span className="font-medium truncate">{leg.destination || 'Endereço de Destino'}</span>
                        </div>
                        {leg.notes && (
                          <div className="mt-0.5 text-[10px] text-gray-600 border-t border-gray-100 pt-0.5">
                            <span className="font-bold text-gray-400 uppercase mr-1">Obs:</span>
                            {leg.notes}
                          </div>
                        )}
                      </div>

                      {/* Opções de Veículos (Modo Agência) */}
                      {leg.vehicle_options && leg.vehicle_options.length > 0 && (
                        <div className="mt-2">
                          <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-1">Opções de Veículos</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {leg.vehicle_options.map((opt, optIdx) => (
                              <div key={optIdx} className="flex justify-between items-center p-1.5 bg-gray-50 rounded border border-gray-100">
                                <span className="font-medium text-gray-700 text-sm">{opt.vehicle_type_name}</span>
                                <span className="font-bold text-green-700 text-base">{opt.price ? formatPrice(opt.price) : 'Sob Consulta'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Info do Veículo (Modo Padrão/Cotado) */}
                      {!leg.vehicle_options && (
                          <div className="flex flex-wrap gap-3 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            <span className="font-medium">Veículo: {leg.vehicle_type_name || quote.vehicle_type_name || '-'}</span>
                            {(leg.passengers || quote.passengers) && <span>Pax: {leg.passengers || quote.passengers}</span>}
                            {leg.flight_number && <span>Voo: {leg.flight_number}</span>}
                          </div>
                      )}

                      {/* Itens Adicionais */}
                      {leg.selected_additional_items && leg.selected_additional_items.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-100">
                          <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Itens Adicionais</h4>
                          <div className="flex flex-wrap gap-2">
                            {leg.selected_additional_items.map((item, i) => (
                              <span key={i} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-50 text-yellow-800 border border-yellow-100">
                                {item.name} (+{formatPrice(item.price)})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Totals */}
              {!hasMultipleVehicleOptions && (
              <section className="mb-4 break-inside-avoid">
                <div className="flex justify-end">
                  <div className="w-full md:w-1/2 bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm">
                    {allAdditionalItems.length > 0 && (
                      <div className="space-y-1 mb-2 pb-2 border-b border-gray-200">
                        <div className="flex justify-between text-xs text-gray-600 font-medium mb-1">
                            <span>Valor da Viagem (Base)</span>
                            <span>{formatPrice(baseValue)}</span>
                        </div>
                        {allAdditionalItems.map((item, idx) => {
                           const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                           return (
                             <div key={idx} className="flex justify-between text-[10px] text-gray-500 pl-2">
                                <span>+ {(Number(item.quantity) || 1) > 1 ? `${item.quantity}x ` : ''}{item.name} {item._ctx || ''}</span>
                                <span>{formatPrice(itemTotal)}</span>
                             </div>
                           );
                        })}
                        <div className="flex justify-between text-[10px] text-gray-600 font-medium pt-1 mt-1 border-t border-gray-100 border-dashed">
                            <span>Total Adicionais</span>
                            <span>{formatPrice(additionalItemsTotal)}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-green-900 font-bold uppercase tracking-wide text-sm">VALOR TOTAL</span>
                      <span className="text-xl font-extrabold text-green-700">
                        {formatPrice(totalValue)}
                      </span>
                    </div>
                    <p className="text-[10px] text-green-700 text-right mt-0.5 opacity-80">
                      * Valores expressos em Reais (BRL)
                    </p>
                  </div>
                </div>
              </section>
              )}

              {/* Notes & Terms - Exibição robusta de todos os campos de notas */}
              <section className="mb-4 border-t border-gray-200 pt-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Observações e Condições</h3>
                <div className="space-y-2 text-sm text-gray-700">

                  {/* Termos Padrão */}
                  <div className="bg-gray-50 p-2 rounded border-l-4 border-gray-600">
                    <span className="font-bold block mb-1 text-gray-700 text-[10px] uppercase">Condições Gerais</span>
                    <ul className="list-disc list-inside space-y-0.5 text-[10px] text-gray-600">
                        <li>Para Rodovias, necessário apresentação de listagem de documentos com nome e RG;</li>
                        <li>Condição de pagamento negociado antecipadamente;</li>
                        <li>Despesas com estacionamento inclusas;</li>
                        <li>Sujeito a disponibilidade;</li>
                        <li>Tolerância de espera em Aeroportos de 00:30 minutos;</li>
                        <li>Taxa de serviço inclusa;</li>
                        <li>Abertura de ordem de compra x Chave Pix: CNPJ 28.077.532/0001-46</li>
                    </ul>
                  </div>
                    
                  {/* Notas Profissionais (Termos) */}
                  {quote.professional_notes && (
                    <div className="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                      <span className="font-bold block mb-1 text-blue-700 text-xs uppercase">Termos e Condições</span>
                      <div className="whitespace-pre-line leading-relaxed">{quote.professional_notes}</div>
                    </div>
                  )}

                  {/* Notas Administrativas (Internas/Extras) */}
                  {quote.admin_notes && (
                    <div className="bg-gray-50 p-3 rounded border-l-4 border-gray-400">
                      <span className="font-bold block mb-1 text-gray-700 text-xs uppercase">Informações Adicionais</span>
                      <div className="whitespace-pre-line leading-relaxed">{quote.admin_notes}</div>
                    </div>
                  )}
                </div>
              </section>
            </td>
          </tr>
        </tbody>
        
        <tfoot>
          <tr>
            <td>
              <div className="h-4"></div> {/* Espaçador */}
              {/* Footer */}
              <footer className="border-t border-gray-200 pt-6 text-center text-xs text-gray-400 mt-auto break-inside-avoid pb-4">
                <p className="font-semibold text-gray-500">TransferOnline - Soluções em Transporte Executivo</p>
                <p className="mt-1">www.transferonline.com.br • (11) 5102-3892 • contato@transferonline.com.br</p>
                <p className="mt-2 text-[10px] text-gray-300">Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </footer>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}