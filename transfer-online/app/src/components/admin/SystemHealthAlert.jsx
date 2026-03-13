import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, CheckCircle2, ChevronRight, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function SystemHealthAlert() {
  const { data: healthData, isLoading } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: () => base44.functions.invoke('checkSystemIntegrations'),
    refetchInterval: 60000, // Check every minute
    retry: false
  });

  const services = healthData?.data?.services || [];
  const issues = services.filter(s => s.status !== 'online');
  
  const hasErrors = issues.some(s => s.status === 'error');
  const hasWarnings = issues.some(s => s.status === 'warning');

  if (isLoading || issues.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-6"
      >
        <div className={`rounded-xl border p-4 shadow-sm relative overflow-hidden ${
          hasErrors 
            ? 'bg-red-50 border-red-200 text-red-900' 
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-start gap-4 relative z-10">
            <div className={`p-2 rounded-full shrink-0 ${
              hasErrors ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
            }`}>
              {hasErrors ? <XCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-base mb-1">
                {hasErrors 
                  ? 'Atenção: Serviços Críticos Indisponíveis' 
                  : 'Alerta de Monitoramento do Sistema'}
              </h3>
              <p className="text-sm opacity-90 mb-3">
                {issues.length} {issues.length === 1 ? 'serviço apresenta' : 'serviços apresentam'} instabilidade ou erros de configuração.
              </p>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {issues.map((issue, idx) => (
                  <span 
                    key={idx}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      issue.status === 'error'
                        ? 'bg-red-100 text-red-800 border-red-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}
                  >
                    {issue.service}
                  </span>
                ))}
              </div>

              <Link 
                to={createPageUrl('MonitoramentoSistema')}
                className={`inline-flex items-center text-sm font-medium hover:underline ${
                  hasErrors ? 'text-red-700' : 'text-amber-700'
                }`}
              >
                Ver detalhes e diagnósticos
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
          
          {/* Decorative background element */}
          <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-10 ${
            hasErrors ? 'bg-red-500' : 'bg-amber-500'
          }`} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}