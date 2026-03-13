import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function DashboardFornecedor() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Redireciona qualquer acesso à antiga dashboard para a nova página inicial (Painel de Solicitações)
    navigate(createPageUrl('MinhasSolicitacoesFornecedor') + location.search, { replace: true });
  }, [navigate, location]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-600">Redirecionando...</p>
    </div>
  );
}