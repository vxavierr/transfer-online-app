import React from 'react';
import { Building2, MapPin, Car, Receipt, Package } from 'lucide-react';

export const getCorporateOnboardingSteps = () => [
    {
      title: "Bem-vindo ao Portal Corporativo",
      content: "Aqui você pode solicitar viagens de forma rápida e fácil. Nosso sistema compara automaticamente os melhores preços entre seus fornecedores homologados.",
      icon: <Building2 className="w-8 h-8 text-white" />
    },
    {
      title: "1. Preencha os Detalhes",
      content: "Comece informando a origem, destino, data e horário. Para aeroportos, não esqueça do número do voo para monitoramento em tempo real.",
      icon: <MapPin className="w-8 h-8 text-white" />
    },
    {
      title: "2. Escolha o Veículo",
      content: "O sistema buscará cotações em todos os fornecedores. Escolha a opção que melhor atende sua necessidade (Ex: Sedan, Blindado) com o melhor custo.",
      icon: <Car className="w-8 h-8 text-white" />
    },
    {
      title: "3. Centros de Custo",
      content: "É obrigatório informar o centro de custo. Você pode ratear o valor entre múltiplos centros se necessário, facilitando a gestão financeira.",
      icon: <Receipt className="w-8 h-8 text-white" />
    },
    {
      title: "4. Acompanhamento",
      content: "Após solicitar, acompanhe o status de suas viagens, aprovações e vouchers na aba 'Minhas Solicitações' no menu lateral.",
      icon: <Package className="w-8 h-8 text-white" />
    }
];