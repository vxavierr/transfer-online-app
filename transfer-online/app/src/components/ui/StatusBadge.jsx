import React from 'react';
import { Badge } from '@/components/ui/badge';

const getStatusConfig = (status, type) => {
  // Cores padrão (Tailwind classes)
  const colors = {
    success: 'bg-green-100 text-green-800 border-green-300',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    danger: 'bg-red-100 text-red-800 border-red-300',
    info: 'bg-blue-100 text-blue-800 border-blue-300',
    neutral: 'bg-gray-100 text-gray-800 border-gray-300',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
    orange: 'bg-orange-100 text-orange-800 border-orange-300',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  };

  // Mapeamento de Status por Tipo
  const configs = {
    // Status de Solicitação/Cotação
    request: {
      aguardando_resposta: { label: 'Aguardando Resposta', color: colors.warning },
      aceito: { label: 'Aceito', color: colors.success },
      recusado: { label: 'Recusado', color: colors.danger },
      timeout: { label: 'Expirado', color: colors.neutral },
      confirmado: { label: 'Confirmado', color: colors.info },
      aguardando_escolha: { label: 'Aguardando Escolha', color: colors.purple },
      pendente: { label: 'Pendente', color: colors.warning },
      em_andamento: { label: 'Em Andamento', color: colors.info },
      concluida: { label: 'Concluída', color: 'bg-gray-800 text-white border-gray-600' },
      cancelada: { label: 'Cancelada', color: colors.danger }
    },
    // Status de Motorista (Viagem)
    trip: {
      aguardando: { label: 'Aguardando', color: colors.neutral },
      a_caminho: { label: 'A Caminho', color: colors.info },
      chegou_origem: { label: 'Na Origem', color: colors.indigo },
      passageiro_embarcou: { label: 'Em Viagem', color: colors.purple },
      parada_adicional: { label: 'Parada', color: colors.orange },
      chegou_destino: { label: 'No Destino', color: colors.success },
      aguardando_confirmacao_despesas: { label: 'Aguardando Conf.', color: colors.warning },
      finalizada: { label: 'Finalizada', color: colors.emerald },
      no_show: { label: 'Não Compareceu', color: colors.danger },
      cancelada_motorista: { label: 'Cancelada (Mot.)', color: colors.danger }
    },
    // Status de Funcionário/Usuário
    user_status: {
      active: { label: 'Ativo', color: colors.success },
      inactive: { label: 'Inativo', color: colors.danger },
      true: { label: 'Ativo', color: colors.success },
      false: { label: 'Inativo', color: colors.danger }
    },
    // Funções de Usuário
    role: {
      manager: { label: 'Gerente', color: colors.purple },
      dispatcher: { label: 'Despachante', color: colors.info },
      driver: { label: 'Motorista', color: colors.success },
      admin: { label: 'Admin', color: colors.warning },
      user: { label: 'Usuário', color: colors.neutral }
    },
    // Status de Pagamento
    payment: {
      pendente: { label: 'Pendente', color: colors.warning },
      pago: { label: 'Pago', color: colors.success },
      faturado: { label: 'Faturado', color: colors.info },
      reembolsado: { label: 'Reembolsado', color: colors.neutral },
      falhou: { label: 'Falhou', color: colors.danger }
    }
  };

  // Tenta encontrar a configuração específica
  if (configs[type] && configs[type][status]) {
    return configs[type][status];
  }
  
  // Tenta encontrar tratando booleanos como string para status de usuário
  if (type === 'user_status' && (status === true || status === false)) {
      return configs.user_status[status.toString()];
  }

  // Fallback genérico se o status existir como chave em algum lugar (opcional, mas arriscado) ou retorno padrão
  return { label: status, color: colors.neutral };
};

export default function StatusBadge({ status, type = 'request', className = '', ...props }) {
  const config = getStatusConfig(status, type);
  
  return (
    <Badge className={`${config.color} border ${className}`} {...props}>
      {config.label}
    </Badge>
  );
}