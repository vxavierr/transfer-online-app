import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Package, Calendar, Map } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

import PriceAdjustment from '../components/admin/PriceAdjustment';
import AdditionalItemsManager from '../components/admin/AdditionalItemsManager';
import PricingRulesManager from '../components/admin/PricingRulesManager';
import FrequentLocationsManager from '../components/admin/FrequentLocationsManager';

export default function GestaoRotas() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const { data: routes, isLoading: loadingRoutes } = useQuery({
    queryKey: ['routes'],
    queryFn: () => base44.entities.Route.list(),
    initialData: []
  });

  const { data: additionalItems, isLoading: loadingItems } = useQuery({
    queryKey: ['additionalItems'],
    queryFn: () => base44.entities.AdditionalItem.list(),
    initialData: []
  });

  const { data: pricingRules, isLoading: loadingRules } = useQuery({
    queryKey: ['pricingRules'],
    queryFn: () => base44.entities.PricingRule.list(),
    initialData: []
  });

  const { data: frequentLocations, isLoading: loadingLocations } = useQuery({
    queryKey: ['frequentLocations'],
    queryFn: () => base44.entities.FrequentLocation.list('-display_order'),
    initialData: []
  });

  // Verificar se é admin
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser.role !== 'admin') {
          window.location.href = '/';
          return;
        }
        setIsCheckingAuth(false);
      } catch (error) {
        base44.auth.redirectToLogin();
      }
    };

    checkAuth();
  }, []);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  const isLoading = loadingRoutes || loadingItems || loadingRules || loadingLocations;

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* Formas Abstratas Animadas - Apenas Desktop */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-80 h-80 bg-gradient-to-br from-orange-200/15 to-yellow-200/10 rounded-full blur-3xl animate-blob-management"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-gradient-to-br from-blue-300/15 to-cyan-200/10 rounded-full blur-3xl animate-blob-management animation-delay-5000"></div>
        <div className="absolute top-1/2 right-10 w-72 h-72 bg-gradient-to-br from-green-200/10 to-blue-300/15 rounded-full blur-3xl animate-blob-management animation-delay-8000"></div>
      </div>

      <div className="max-w-7xl mx-auto p-6 relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Gestão de Rotas e Tarifas
          </h1>
          <p className="text-gray-600">Configure preços, itens adicionais, regras de precificação e locais frequentes</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : (
          <Tabs defaultValue="adjustment" className="space-y-6">
            <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-2 lg:grid-cols-4 gap-2">
              <TabsTrigger value="adjustment" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Reajuste Geral
              </TabsTrigger>
              <TabsTrigger value="items" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Itens Adicionais
              </TabsTrigger>
              <TabsTrigger value="pricing-rules" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Regras de Preço
              </TabsTrigger>
              <TabsTrigger value="frequent-locations" className="flex items-center gap-2">
                <Map className="w-4 h-4" />
                Locais Frequentes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="adjustment">
              <PriceAdjustment routes={routes} />
            </TabsContent>

            <TabsContent value="items">
              <AdditionalItemsManager items={additionalItems} />
            </TabsContent>

            <TabsContent value="pricing-rules">
              <PricingRulesManager rules={pricingRules} routes={routes} />
            </TabsContent>

            <TabsContent value="frequent-locations">
              <FrequentLocationsManager locations={frequentLocations} />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <style jsx>{`
        @keyframes blob-management {
          0%, 100% {
            transform: translate(0px, 0px) scale(1) rotate(0deg);
          }
          33% {
            transform: translate(50px, -40px) scale(1.1) rotate(90deg);
          }
          66% {
            transform: translate(-40px, 50px) scale(0.95) rotate(180deg);
          }
        }

        .animate-blob-management {
          animation: blob-management 28s infinite ease-in-out;
        }

        .animation-delay-5000 {
          animation-delay: 5s;
        }

        .animation-delay-8000 {
          animation-delay: 8s;
        }
      `}</style>
    </div>
  );
}