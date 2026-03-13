import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DriverApprovalHistory({ flow }) {
  if (!flow || !flow.approver_history?.length) return null;

  return (
    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
      <h3 className="font-semibold mb-3 text-indigo-900 flex items-center gap-2">
        <CheckCircle className="w-4 h-4" />
        Histórico de Aprovação Corporativa
        {flow.clientName && (
          <span className="text-xs font-normal text-indigo-600">— {flow.clientName}</span>
        )}
      </h3>
      <div className="space-y-2">
        {flow.approver_history.map((entry, idx) => (
          <div key={idx} className="bg-white rounded border border-indigo-100 p-3 flex gap-3 items-start">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${entry.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {entry.status === 'approved'
                ? <CheckCircle className="w-4 h-4" />
                : <XCircle className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="font-medium text-sm text-gray-900">{entry.approver_name}</span>
                  <span className="text-xs text-gray-500 ml-2">{entry.approver_email}</span>
                </div>
                {entry.timestamp && (
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {format(new Date(entry.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                )}
              </div>
              <div className="mt-0.5">
                <Badge className={`text-[10px] ${entry.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {entry.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                </Badge>
              </div>
              {entry.comments && (
                <p className="text-xs text-gray-600 mt-1 italic">"{entry.comments}"</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}