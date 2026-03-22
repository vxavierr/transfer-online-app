import React from 'react';
import { CheckCircle } from 'lucide-react';

export default function CorporateRequestSuccess({ 
  serviceType, 
  isRoundTrip, 
  requestNumber, 
  returnRequestNumber 
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {serviceType === 'multi_trip' ? 'Viagens Criadas!' : isRoundTrip ? 'Solicitações Enviadas!' : 'Solicitação Enviada!'}
        </h2>
        <p className="text-gray-600 text-base mb-2">
          {serviceType === 'multi_trip'
            ? 'Suas viagens foram criadas e enviadas com sucesso aos fornecedores.'
            : isRoundTrip
            ? 'Suas solicitações de ida e volta foram enviadas com sucesso ao fornecedor.'
            : 'Sua solicitação foi enviada com sucesso ao fornecedor.'}
        </p>

        {requestNumber && (
          <div className="space-y-3 mb-6">
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <p className="text-sm text-green-700 mb-1 font-semibold">
                {serviceType === 'multi_trip' ? '📋 Solicitações:' : isRoundTrip ? '✈️ Viagem de IDA:' : 'Número da Solicitação:'}
              </p>
              <p className="text-2xl font-bold text-green-600">{requestNumber}</p>
            </div>

            {isRoundTrip && returnRequestNumber && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-700 mb-1 font-semibold">🔄 Viagem de VOLTA:</p>
                <p className="text-2xl font-bold text-blue-600">{returnRequestNumber}</p>
              </div>
            )}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-blue-900"><strong>📧 Próximos Passos:</strong></p>
          <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
            <li>O fornecedor receberá {serviceType === 'multi_trip' ? 'todas as solicitações' : isRoundTrip ? 'ambas as solicitações' : 'sua solicitação'}</li>
            <li>Você receberá notificações sobre o status</li>
            <li>Acompanhe em "Minhas Solicitações"</li>
          </ul>
        </div>
        <p className="text-sm text-gray-600">Redirecionando para suas solicitações...</p>
      </div>
    </div>
  );
}