import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

export default function PortalCorporativo() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const user = await base44.auth.me();
        
        if (user) {
          const isSuperAdminEmail = user.email === 'fernandotransferonline@gmail.com';
          const isAdmin = user.role === 'admin' || isSuperAdminEmail;

          if (isAdmin) {
            navigate(createPageUrl('AdminDashboard'), { replace: true });
          } else {
            navigate(createPageUrl('SolicitarViagemCorporativa'), { replace: true });
          }
        } else {
          // Se não estiver logado, redireciona para login e volta para esta mesma página para decidir
          base44.auth.redirectToLogin(window.location.href);
        }
      } catch (error) {
        // Em caso de erro (ex: não autenticado), força login
        base44.auth.redirectToLogin(window.location.href);
      }
    };

    handleRedirect();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Verificando credenciais...</p>
      </div>
    </div>
  );
}