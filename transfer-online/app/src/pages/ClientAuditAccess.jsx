import React from 'react';
import { getClientAuditAccessData } from '@/functions/getClientAuditAccessData';
import { Loader2, AlertCircle } from 'lucide-react';
import ClientAuditHeader from '@/components/client-audit/ClientAuditHeader';
import ClientAuditSupplierCard from '@/components/client-audit/ClientAuditSupplierCard';

export default function ClientAuditAccess() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    const fetchData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setError('Link inválido.');
        setLoading(false);
        return;
      }

      try {
        const response = await getClientAuditAccessData({ token });
        setData(response.data);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-600" />
          <p className="text-gray-600">Carregando auditoria...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900">Acesso indisponível</h1>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <ClientAuditHeader client={data?.client} accessLink={data?.access_link} />
        <div className="grid gap-6">
          {(data?.suppliers || []).map((supplier) => (
            <ClientAuditSupplierCard key={supplier.id} supplier={supplier} token={new URLSearchParams(window.location.search).get('token')} />
          ))}
        </div>
      </div>
    </div>
  );
}