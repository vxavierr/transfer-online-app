import React from 'react';
import { ShieldCheck, Clock8 } from 'lucide-react';

export default function ClientAuditHeader({ client, accessLink }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            <ShieldCheck className="w-4 h-4" />
            Auditoria temporária liberada
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{client?.name}</h1>
          <p className="text-sm text-gray-600">Acesso temporário para consulta de fornecedores, motoristas, veículos e aprovações.</p>
        </div>
        <div className="rounded-xl border bg-white px-4 py-3 text-sm text-gray-700">
          <div className="flex items-center gap-2 font-medium text-gray-900">
            <Clock8 className="w-4 h-4 text-amber-500" />
            Validade do acesso
          </div>
          <p className="mt-1">{new Date(accessLink?.expires_at).toLocaleString('pt-BR')}</p>
          {accessLink?.auditor_name && <p className="mt-2 text-xs text-gray-500">Gestor: {accessLink.auditor_name}</p>}
        </div>
      </div>
    </div>
  );
}