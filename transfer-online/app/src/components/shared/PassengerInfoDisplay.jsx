import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { User, Mail, Phone, FileText } from 'lucide-react';

export default function PassengerInfoDisplay({ 
  passengerName, 
  passengerEmail, 
  passengerPhone, 
  passengerDocument,
  passengersDetails = [],
  title = "Dados do Passageiro"
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-gray-500 text-xs">Nome Principal</p>
            <p className="font-medium">{passengerName || '-'}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-gray-500 text-xs flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email
            </p>
            <p className="break-all">{passengerEmail || '-'}</p>
          </div>

          <div className="space-y-1">
            <p className="text-gray-500 text-xs flex items-center gap-1">
              <Phone className="w-3 h-3" /> Telefone
            </p>
            <p>{passengerPhone || '-'}</p>
          </div>

          {passengerDocument && (
            <div className="space-y-1">
              <p className="text-gray-500 text-xs flex items-center gap-1">
                <FileText className="w-3 h-3" /> Documento
              </p>
              <p>{passengerDocument}</p>
            </div>
          )}
        </div>

        {passengersDetails && passengersDetails.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="font-semibold text-xs text-gray-500 mb-2">Lista de Passageiros ({passengersDetails.length})</p>
            <div className="space-y-2">
              {passengersDetails.map((pax, idx) => (
                <div key={idx} className="bg-gray-50 p-2 rounded text-xs flex justify-between items-center">
                  <span className="font-medium">{pax.name}</span>
                  <span className="text-gray-500">
                    {pax.document_type}: {pax.document_number}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}