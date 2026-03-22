import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Building2, FileText, Mail, Phone, UserCheck } from 'lucide-react';
import ClientAuditCommentForm from './ClientAuditCommentForm';
import DriverApprovalHistory from '@/components/admin/DriverApprovalHistory';
import ClientAuditFleetOverview from './ClientAuditFleetOverview';

function DocumentButton({ href, label }) {
  if (!href) return <span className="text-xs text-gray-400">Não enviado</span>;
  return (
    <Button asChild variant="outline" size="sm">
      <a href={href} target="_blank" rel="noreferrer">
        <FileText className="w-4 h-4 mr-2" />
        {label}
      </a>
    </Button>
  );
}

export default function ClientAuditSupplierCard({ supplier, token }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">{supplier.name}</h2>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
            {supplier.email && <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{supplier.email}</span>}
            {supplier.phone_number && <span className="flex items-center gap-1"><Phone className="w-4 h-4" />{supplier.phone_number}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="border border-blue-200 bg-blue-100 text-blue-700">{supplier.drivers?.length || 0} motorista(s)</Badge>
          <Badge className="border border-slate-200 bg-slate-100 text-slate-700">{supplier.supplier_vehicles?.length || 0} veículo(s)</Badge>
        </div>
      </div>

      <ClientAuditFleetOverview supplier={supplier} />

      {(supplier.drivers || []).length > 0 ? (
        <Accordion type="multiple" className="mt-5 space-y-3">
          {(supplier.drivers || []).map((driver) => (
            <AccordionItem key={driver.id} value={driver.id} className="rounded-xl border px-4">
              <AccordionTrigger>
                <div className="flex flex-col items-start text-left">
                  <span className="font-medium text-gray-900">{driver.name}</span>
                  <span className="text-xs text-gray-500">{driver.phone_number} {driver.email ? `• ${driver.email}` : ''}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pb-2">
                  <div className="rounded-xl border bg-gray-50 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-gray-900">Documentação do motorista</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>CPF: {driver.document_id || '-'}</p>
                      <p>CNH: {driver.license_number || '-'}</p>
                      <p>Vencimento CNH: {driver.license_expiry || '-'}</p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <DocumentButton href={driver.license_document_url} label="CNH" />
                        <DocumentButton href={driver.aso_document_url} label="ASO" />
                        <DocumentButton href={driver.pgr_document_url} label="PGR" />
                      </div>
                    </div>
                  </div>

                  {driver.approval_flow && (
                    <div className="rounded-xl border bg-white p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <UserCheck className="w-4 h-4 text-green-600" />
                        Histórico de aprovação
                      </h3>
                      <DriverApprovalHistory flow={driver.approval_flow} />
                    </div>
                  )}

                  <ClientAuditCommentForm token={token} supplier={supplier} driver={driver} />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed bg-slate-50 p-4 text-sm text-slate-500">
          Nenhum motorista associado a este fornecedor.
        </div>
      )}

      {(supplier.comments || []).length > 0 && (
        <div className="mt-4 rounded-xl border bg-amber-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-amber-900">Interações já registradas</h3>
          <div className="space-y-2">
            {supplier.comments.slice(0, 5).map((comment) => (
              <div key={comment.id} className="rounded-lg border border-amber-200 bg-white p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900">{comment.author_name}</span>
                  <span className="text-xs text-gray-500">{new Date(comment.created_date).toLocaleString('pt-BR')}</span>
                </div>
                <p className="mt-1 text-gray-700">{comment.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}