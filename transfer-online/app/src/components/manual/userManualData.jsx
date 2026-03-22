export const roleManualOrder = ['admin', 'corporate', 'supplier', 'driver'];

export const roleManuals = {
  admin: {
    title: 'Manual do Administrador',
    audience: 'Equipe de administração, operação central e gestão.',
    intro: 'Este manual reúne as funções principais do ambiente administrativo para controle operacional, financeiro, comercial e de governança da plataforma.',
    menus: [
      {
        menu: 'Dashboard Principal',
        description: 'Centro de comando da operação diária.',
        features: [
          'Acompanhar volumes de viagens, pendências, confirmações, cancelamentos e viagens em andamento.',
          'Buscar viagens por passageiro, cliente, motorista, número, fornecedor ou rota.',
          'Abrir detalhes completos, editar solicitações, aceitar viagens e gerir motorista e veículo.',
          'Selecionar várias viagens para compartilhar links, gerar links de pagamento e resumo de agenda.',
          'Visualizar mapa consolidado e filas que exigem ação imediata.'
        ]
      },
      {
        menu: 'Gestão de Eventos',
        description: 'Área de controle de operação especial e logística de eventos.',
        features: [
          'Criar e acompanhar eventos, viagens vinculadas e distribuição operacional.',
          'Gerenciar acessos temporários para equipes envolvidas em eventos.',
          'Controlar links compartilhados para acompanhamento externo de viagens e listas.'
        ]
      },
      {
        menu: 'Gestão de Viagens',
        description: 'Módulo para viagens corporativas e monitoramento avançado.',
        features: [
          'Criar solicitações master/corporativas e acompanhar roteiros e fornecedores.',
          'Monitorar localização em tempo real de viagens e motoristas ativos.',
          'Consultar telemetria e relatórios de km percorrido para apoio operacional e auditoria.'
        ]
      },
      {
        menu: 'Cotações',
        description: 'Jornada comercial e pré-operação.',
        features: [
          'Gerenciar cotações recebidas, acompanhar respostas e converter oportunidades.',
          'Criar cotação manual para necessidades operacionais ou comerciais específicas.',
          'Manter trechos frequentes para acelerar montagem de propostas recorrentes.'
        ]
      },
      {
        menu: 'Rede de Fornecedores',
        description: 'Gestão da rede operacional terceira.',
        features: [
          'Cadastrar e manter fornecedores, suas regras e dados operacionais.',
          'Aprovar motoristas, veículos e registros pendentes.',
          'Acompanhar veículos de fornecedores e permissões do módulo 3/planos.'
        ]
      },
      {
        menu: 'Clientes e Usuários',
        description: 'Governança de contas e acessos.',
        features: [
          'Gerenciar clientes, usuários e permissões administrativas por página.',
          'Organizar tags de passageiros e dados auxiliares de relacionamento.',
          'Controlar quem pode ver ou operar cada parte do sistema.',
          'Gerar links temporários de auditoria para gestores de clientes com validade, acesso a fornecedores associados e visibilidade de documentos, veículos, motoristas, histórico de aprovação e comentários.'
        ]
      },
      {
        menu: 'Financeiro',
        description: 'Visão de resultados e pagamentos.',
        features: [
          'Acompanhar relatórios financeiros de fornecedores.',
          'Analisar lucratividade e performance financeira de motoristas.',
          'Usar dados para validação de margem, custo e eficiência operacional.'
        ]
      },
      {
        menu: 'Marketing e Qualidade',
        description: 'Frente comercial, retenção e reputação.',
        features: [
          'Gerenciar leads, cupons promocionais e avaliações de clientes.',
          'Acompanhar indicadores de SEO e presença digital.',
          'Usar feedbacks para ajustes de processo e experiência.'
        ]
      },
      {
        menu: 'Configurações',
        description: 'Parâmetros mestres e monitoramento.',
        features: [
          'Ajustar configurações do sistema, rotas, tipos de veículos e templates de notificação.',
          'Acompanhar logs de SMS, monitoramento de sistema e temas sazonais.',
          'Consultar o manual do usuário para onboarding e padronização de uso.'
        ]
      }
    ],
    quickTips: [
      'Use o Dashboard Principal como ponto de partida antes de entrar em páginas específicas.',
      'Revise aprovações e monitoramento com frequência para evitar gargalos operacionais.',
      'Sempre valide permissões administrativas quando novos usuários entrarem na operação.',
      'Ao gerar um link de auditoria, confirme cliente, prazo de validade e escopo antes de compartilhar com o gestor externo.'
    ]
  },
  corporate: {
    title: 'Manual do Cliente Corporativo',
    audience: 'Solicitantes corporativos e administradores do cliente.',
    intro: 'Este manual explica como solicitar viagens, acompanhar pedidos, analisar uso do serviço e administrar o time corporativo dentro da plataforma.',
    menus: [
      {
        menu: 'Solicitar Viagem',
        description: 'Tela principal para criação de viagens corporativas.',
        features: [
          'Escolher tipo de serviço: só ida, ida e volta, por hora ou jornadas mais complexas quando disponíveis.',
          'Informar origem, destino, data, horário, passageiros, idioma do motorista e observações.',
          'Selecionar centros de custo, forma de faturamento e responsável financeiro quando necessário.',
          'Comparar opções de fornecedores e seguir para confirmação da solicitação.'
        ]
      },
      {
        menu: 'Minhas Solicitações',
        description: 'Painel de acompanhamento das viagens solicitadas.',
        features: [
          'Buscar por número, passageiro, motorista, rota, fornecedor ou veículo.',
          'Filtrar por status, período, tipo de serviço e ordenação.',
          'Abrir detalhes completos da viagem, ver motorista designado e histórico de tentativas de fornecedor.',
          'Copiar resumo, gerar link da timeline, emitir ordem de serviço em PDF e clonar uma solicitação antiga.',
          'Avaliar a viagem após a conclusão ou reenviar o link de avaliação ao passageiro.'
        ]
      },
      {
        menu: 'Análise de Viagens',
        description: 'Visão de consumo e acompanhamento gerencial.',
        features: [
          'Acompanhar padrões de uso, volume e comportamento das viagens do cliente.',
          'Usar a análise para revisar políticas internas e eficiência operacional.',
          'Apoiar revisões de orçamento e relacionamento com fornecedores.'
        ]
      },
      {
        menu: 'Auditoria Temporária por Link',
        description: 'Acesso externo controlado para gestores e auditores do cliente.',
        features: [
          'Abrir o link recebido para consultar apenas os fornecedores vinculados ao cliente liberado.',
          'Visualizar documentação de motoristas e veículos, além do histórico de aprovação corporativa quando existir.',
          'Registrar comentários, solicitações e apontamentos diretamente para o fornecedor responsável durante a auditoria.',
          'Respeitar a validade do link, pois o acesso expira automaticamente após o prazo definido pela administração.'
        ]
      },
      {
        menu: 'Gerenciar Funcionários',
        description: 'Disponível para administradores do cliente.',
        features: [
          'Convidar colaboradores, revisar acessos e organizar quem pode solicitar viagens.',
          'Controlar o perfil de cada usuário dentro da conta corporativa.',
          'Manter a base de solicitantes atualizada para evitar erros operacionais.'
        ]
      },
      {
        menu: 'Meus Dados',
        description: 'Área de dados pessoais e conta.',
        features: [
          'Atualizar informações pessoais usadas na operação.',
          'Revisar dados de contato para garantir recebimento de notificações.',
          'Manter o perfil consistente para uso correto dos fluxos corporativos.'
        ]
      }
    ],
    quickTips: [
      'Use filtros em Minhas Solicitações para localizar rapidamente viagens antigas ou em andamento.',
      'Prefira clonar solicitações recorrentes para ganhar velocidade e manter padrão.',
      'Revise centros de custo e dados do passageiro antes de confirmar para evitar retrabalho.',
      'Ao usar um link de auditoria, registre comentários objetivos para facilitar o retorno do fornecedor.'
    ]
  },
  supplier: {
    title: 'Manual do Fornecedor',
    audience: 'Fornecedores, equipes operacionais e usuários internos do parceiro.',
    intro: 'Este manual organiza as principais rotinas do portal do fornecedor, incluindo operação diária, frota, manutenção veicular, viagens próprias, eventos, faturamento e comunicação.',
    menus: [
      {
        menu: 'Dashboard Operacional',
        description: 'Centro de comando do fornecedor.',
        features: [
          'Acompanhar viagens totais, confirmadas, pendentes, canceladas e em andamento.',
          'Pesquisar viagens por número, passageiro, cliente, motorista, veículo e rota.',
          'Filtrar por tipo, data e status para priorizar a operação do dia.',
          'Abrir detalhes, aceitar/recusar solicitações, designar motorista e acompanhar conflitos de agenda.',
          'Visualizar agenda por lista ou calendário operacional.'
        ]
      },
      {
        menu: 'Solicitações da Plataforma',
        description: 'Recebimento e resposta a viagens vindas da plataforma principal.',
        features: [
          'Aceitar ou recusar solicitações dentro do prazo de resposta.',
          'Confirmar valores, registrar motivo de recusa e acompanhar histórico.',
          'Definir motorista, veículo e comunicação operacional após aceite.'
        ]
      },
      {
        menu: 'Nova Viagem / Viagens Próprias',
        description: 'Operação para clientes próprios do fornecedor.',
        features: [
          'Criar novas viagens próprias quando o módulo estiver habilitado.',
          'Editar viagens próprias e reservas diretas já cadastradas.',
          'Controlar passageiros, rota, preço, motorista e status operacional.'
        ]
      },
      {
        menu: 'Gestão Financeira',
        description: 'Faturamento, pagamentos e resultados.',
        features: [
          'Gerenciar faturamento de viagens e documentos financeiros.',
          'Lançar faturas manuais para cobranças avulsas, informando cliente, descrição, vencimento e forma de recebimento.',
          'Acompanhar pagamentos e relatório financeiro consolidado.',
          'Usar os relatórios para leitura de margem, recebimento e custo operacional.'
        ]
      },
      {
        menu: 'Operação e Frota',
        description: 'Recursos de execução diária.',
        features: [
          'Manter veículos, motoristas e coordenadores atualizados.',
          'Acompanhar alertas documentais de motoristas e frota.',
          'Gerenciar receptivos e mapa em tempo real quando o recurso estiver habilitado.',
          'Usar parceiros/subcontratação quando essa função estiver ativa para o fornecedor.',
          'Manter documentação e histórico de aprovação organizados, pois gestores de clientes podem auditá-los por link temporário autorizado.'
        ]
      },
      {
        menu: 'Manutenção da Frota',
        description: 'Controle completo da manutenção veicular do fornecedor.',
        features: [
          'Cadastrar os veículos reais da frota com placa, modelo, quilometragem, combustível e status operacional.',
          'Criar planos preventivos por veículo com periodicidade em dias e/ou quilômetros.',
          'Registrar serviços executados, custos, oficina responsável, peças trocadas e próximos vencimentos.',
          'Centralizar oficinas e prestadores para histórico, contato e apoio operacional.',
          'Acompanhar rapidamente o que está vencido, próximo e quanto a frota consumiu em manutenção.'
        ],
        stepByStep: [
          'Cadastre primeiro cada veículo real da frota para separar ativos operacionais de tipos de veículo comercial.',
          'Crie os planos preventivos mais importantes, como óleo, pneus, freios, suspensão e revisões periódicas.',
          'Sempre que um serviço for executado, registre a manutenção com data, KM, custo e observações.',
          'Use a visão geral do módulo para identificar o que está vencido ou próximo do vencimento.',
          'Revise a quilometragem dos veículos com frequência para manter os alertas corretos.'
        ]
      },
      {
        menu: 'Eventos e Logística',
        description: 'Rotina especial de eventos.',
        features: [
          'Gerenciar eventos, viagens relacionadas e links compartilhados.',
          'Acompanhar dashboard do evento quando o módulo estiver liberado.',
          'Organizar execução logística com visibilidade operacional centralizada.'
        ]
      },
      {
        menu: 'Cotações e Clientes',
        description: 'Frente comercial e relacionamento.',
        features: [
          'Gerenciar cotações recebidas e respostas comerciais.',
          'Enviar mensagens a motoristas quando o recurso estiver habilitado.',
          'Administrar clientes próprios do fornecedor e sua carteira interna.'
        ]
      },
      {
        menu: 'Minha Empresa',
        description: 'Administração interna do fornecedor.',
        features: [
          'Gerenciar funcionários internos e dados cadastrais da empresa.',
          'Atualizar informações que impactam faturamento, operação e comunicações.',
          'Garantir que a empresa esteja pronta para receber e executar viagens.'
        ]
      }
    ],
    quickTips: [
      'Trate o Dashboard Operacional como fila principal de trabalho do time.',
      'Defina motorista e veículo o quanto antes para evitar gargalos perto do horário da viagem.',
      'Revise documentos e pagamentos com frequência para não impactar disponibilidade operacional.',
      'Use faturas manuais para cobranças que não nasceram de viagens já vinculadas no sistema.',
      'Use o módulo de manutenção da frota como rotina semanal para evitar paradas inesperadas dos veículos.',
      'Considere que documentos e aprovações podem ser revisados por clientes autorizados em auditorias temporárias, então mantenha tudo atualizado.'
    ]
  },
  driver: {
    title: 'Manual do Motorista',
    audience: 'Motoristas cadastrados na operação.',
    intro: 'Este manual explica como acompanhar viagens, abrir detalhes, usar ações rápidas, manter documentos em dia e consultar pagamentos dentro do portal do motorista.',
    menus: [
      {
        menu: 'Minhas Viagens',
        description: 'Tela principal do motorista.',
        features: [
          'Visualizar viagens em abas: aguardando, em andamento, próximas, finalizadas e mensagens.',
          'Abrir detalhes completos da viagem para execução operacional.',
          'Usar ações rápidas como copiar dados da viagem, navegar para origem/destino e adicionar ao calendário.',
          'Acompanhar alertas de documentação e pendências que podem bloquear o uso do sistema.'
        ]
      },
      {
        menu: 'Detalhes da Viagem',
        description: 'Ambiente operacional de execução.',
        features: [
          'Consultar passageiro, origem, destino, observações, contatos e dados do veículo.',
          'Executar atualização de status da corrida conforme a etapa operacional disponível.',
          'Usar o link seguro da viagem para centralizar a execução e o acompanhamento.'
        ]
      },
      {
        menu: 'Mensagens',
        description: 'Comunicação entre operação e motorista.',
        features: [
          'Ler mensagens enviadas pela equipe operacional.',
          'Acompanhar recados ligados a viagens e orientações de execução.',
          'Usar essa aba como referência para alinhamentos rápidos.'
        ]
      },
      {
        menu: 'Meus Pagamentos',
        description: 'Consulta financeira individual.',
        features: [
          'Acompanhar valores e histórico de pagamento relacionados às viagens.',
          'Usar a visão financeira para conferência e organização pessoal.',
          'Validar se viagens concluídas já refletem no fluxo financeiro.'
        ]
      },
      {
        menu: 'Meus Documentos',
        description: 'Regularização documental.',
        features: [
          'Enviar CNH e documentos do veículo quando exigidos.',
          'Corrigir pendências documentais antes do vencimento.',
          'Evitar bloqueios de acesso mantendo a documentação sempre válida.'
        ]
      },
      {
        menu: 'Meus Dados',
        description: 'Cadastro do motorista.',
        features: [
          'Atualizar dados pessoais e contatos principais.',
          'Manter telefone e informações corretas para notificações e operação.',
          'Centralizar ajustes de cadastro em um único ponto.'
        ]
      }
    ],
    quickTips: [
      'Verifique a aba “Aguardando” no início do dia e antes de sair para a operação.',
      'Abra os detalhes da viagem com antecedência para revisar endereço, horário e observações.',
      'Regularize documentos assim que receber alertas para não correr risco de bloqueio.'
    ]
  }
};