import React from 'react';
import { Button } from '@/components/ui/button';
import GenericTable from '@/components/ui/GenericTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { 
  Eye, 
  Users, 
  CheckCircle, 
  DollarSign, 
  ArrowRight, 
  Trash2, 
  Printer, 
  Plane, 
  Clock,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function QuoteTable({
  quotes,
  partners = [],
  onViewDetails,
  onQuote,
  onAssignPartner,
  onUpdateStatus,
  onConvert,
  onDelete,
  onPrint,
  formatPrice,
  hideQuoteButton = false,
  hideActions = false
}) {
  const columns = [
    {
      header: 'Nº Cotação',
      render: (quote) => (
        <div>
          <div className="font-mono font-semibold text-blue-600">
            {quote.quote_number}
          </div>
          {quote.admin_quote_price && (
            <div className="text-sm text-green-600 font-semibold mt-1">
              {formatPrice(quote.admin_quote_price)}
            </div>
          )}
          {quote.partner_cost && !quote.admin_quote_price && (
            <div className="text-sm text-gray-500 mt-1">
              Custo: {formatPrice(quote.partner_cost)}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Cliente',
      render: (quote) => (
        <div>
          <div className="font-medium text-gray-900">{quote.customer_name}</div>
          <div className="text-sm text-gray-500">{quote.customer_email}</div>
        </div>
      )
    },
    {
      header: 'Rota',
      render: (quote) => (
        <div className="text-sm max-w-[300px]">
          {(quote.quoted_trips && quote.quoted_trips.length > 0) || (quote.agency_quoted_legs && quote.agency_quoted_legs.length > 0) ? (
            <div className="space-y-3">
              {quote.quoted_trips?.map((trip, index) => (
                <div key={`qt-${index}`} className="border-l-2 border-blue-200 pl-2">
                  <div className="font-medium text-blue-700 text-xs leading-tight mb-1">
                    {trip.origin} <ArrowRight className="inline-block w-3 h-3 mx-0.5 text-gray-400" /> {trip.destination}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                    {(trip.origin_flight_number || trip.destination_flight_number) && (
                      <span className="flex items-center gap-1 bg-blue-50 px-1.5 py-0.5 rounded text-blue-700">
                        <Plane className="w-3 h-3" />
                        {trip.origin_flight_number || trip.destination_flight_number}
                      </span>
                    )}
                    {trip.time && (
                      <span className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded">
                        <Clock className="w-3 h-3" />
                        {trip.time}
                      </span>
                    )}
                    {trip.passengers && (
                      <span className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded">
                        <Users className="w-3 h-3" />
                        {trip.passengers}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {quote.agency_quoted_legs?.map((leg, index) => (
                <div key={`al-${index}`} className="border-l-2 border-orange-200 pl-2">
                  <div className="font-medium text-orange-700 text-xs leading-tight mb-1">
                    <span className="font-bold mr-1">#{index + 1}</span>
                    {leg.origin} <ArrowRight className="inline-block w-3 h-3 mx-0.5 text-gray-400" /> {leg.destination}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                    {leg.date && (
                      <span className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(leg.date + 'T12:00:00'), "dd/MM", { locale: ptBR })}
                      </span>
                    )}
                    {leg.time && (
                      <span className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded">
                        <Clock className="w-3 h-3" />
                        {leg.time}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div className="font-medium truncate" title={quote.origin}>{quote.origin}</div>
              <div className="text-gray-500 truncate" title={quote.destination}>→ {quote.destination}</div>
              
              <div className="flex flex-wrap gap-2 mt-1.5">
                {(quote.origin_flight_number || quote.destination_flight_number) && (
                  <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                    <Plane className="w-3 h-3" />
                    {quote.origin_flight_number || quote.destination_flight_number}
                  </span>
                )}
                
                {quote.time && (
                  <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    <Clock className="w-3 h-3" />
                    {quote.time}
                  </span>
                )}

                {quote.passengers && (
                  <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    <Users className="w-3 h-3" />
                    {quote.passengers}
                  </span>
                )}
              </div>

              {quote.distance_km > 0 && (
                <div className="text-xs text-gray-400 mt-1">{quote.distance_km} km</div>
              )}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Data',
      render: (quote) => (
        <div className="text-sm">
          {(quote.quoted_trips && quote.quoted_trips.length > 0) || (quote.agency_quoted_legs && quote.agency_quoted_legs.length > 0) ? (
            <div className="text-blue-700 font-medium">
              Várias Datas
            </div>
          ) : (
            <div>
              <div>{quote.date ? format(new Date(quote.date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR }) : '-'}</div>
              <div className="text-gray-500">{quote.time}</div>
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Parceiro',
      render: (quote) => {
        const partner = partners.find(p => p.id === quote.partner_id);
        return partner ? (
          <div className="text-sm">
            <div className="font-medium text-gray-900">{partner.name}</div>
            <StatusBadge status={quote.partner_status} type="request" className="mt-1 text-xs" />
          </div>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (quote) => <StatusBadge status={quote.status} type="request" />
    },
    !hideActions && {
      header: 'Ações',
      render: (quote) => {
        const partner = partners.find(p => p.id === quote.partner_id);
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails(quote)}
              title="Ver detalhes"
            >
              <Eye className="w-4 h-4" />
            </Button>
            {!partner && (quote.status === 'pendente' || quote.status === 'em_analise') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAssignPartner(quote)}
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                title="Atribuir a parceiro"
              >
                <Users className="w-4 h-4" />
              </Button>
            )}
            {partner && quote.partner_status === 'aguardando_resposta' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAssignPartner(quote)}
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                title="Registrar resposta do parceiro"
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
            )}
            {!hideQuoteButton && (quote.status === 'pendente' || quote.status === 'em_analise' || quote.partner_status === 'resposta_recebida') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onQuote(quote)}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                title="Cotar preço"
              >
                <DollarSign className="w-4 h-4" />
              </Button>
            )}
            {quote.status === 'aceito' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onConvert(quote)}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                title="Converter em Viagem"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(quote)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                title="Excluir Cotação"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}

            {onPrint && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPrint(quote)}
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                title="Visualizar para Impressão"
              >
                <Printer className="w-4 h-4" />
              </Button>
            )}
          </div>
        );
      }
    }
  ].filter(Boolean);

  return (
    <GenericTable 
      columns={columns}
      data={quotes}
      emptyMessage="Nenhuma cotação encontrada"
    />
  );
}