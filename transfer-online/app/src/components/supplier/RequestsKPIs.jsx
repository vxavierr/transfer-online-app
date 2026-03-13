import React from 'react';
import { AlertTriangle, UserPlus, Flame, Clock } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import DashboardGrid from '@/components/dashboard/DashboardGrid';

export default function RequestsKPIs({
  pendingResponseCount,
  needDriverCount,
  todayCount,
  todayNotStartedCount
}) {
  return (
    <DashboardGrid cols={4}>
      <StatCard 
        title="Pendentes Resposta" 
        value={pendingResponseCount} 
        icon={AlertTriangle} 
        variant="red" 
        description="🚨 AÇÃO!"
        className="transform hover:scale-105 transition-all shadow-xl"
      />
      <StatCard 
        title="S/ Motorista" 
        value={needDriverCount} 
        icon={UserPlus} 
        variant="orange" 
        description="⚠️ Urgente"
        className="transform hover:scale-105 transition-all shadow-xl"
      />
      <StatCard 
        title="Hoje" 
        value={todayCount} 
        icon={Flame} 
        variant="blue" 
        description="🔥 Monitorar"
        className="transform hover:scale-105 transition-all shadow-xl"
      />
      <StatCard 
        title="S/ Comando" 
        value={todayNotStartedCount} 
        icon={Clock} 
        variant="yellow" 
        description="⏰ Aguarda"
        className="transform hover:scale-105 transition-all shadow-xl"
      />
    </DashboardGrid>
  );
}