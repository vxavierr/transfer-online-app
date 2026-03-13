import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MapPin, Users, Clock, ChevronRight, Car, Info, List } from 'lucide-react';
import { motion } from 'framer-motion';

const VEHICLE_TYPES = {
  sedan_executivo: 'Sedan Executivo',
  suv: 'SUV',
  van: 'Van',
  van_executiva: 'Van Executiva',
  micro_onibus: 'Micro-ônibus'
};

export default function RouteSelector({ routes, onSelectRoute, selectedRoute, transferType }) {
  const [openDialog, setOpenDialog] = React.useState(null);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const calculateTotalPrice = (route) => {
    return route.base_price + (route.additional_expenses || 0);
  };

  const parseNeighborhoods = (coveredAreas) => {
    if (!coveredAreas) return [];
    return coveredAreas
      .split(',')
      .map(area => area.trim())
      .filter(area => area.length > 0);
  };

  const NeighborhoodsList = ({ neighborhoods, columns = 1 }) => {
    if (neighborhoods.length === 0) {
      return <p className="text-sm text-gray-500">Nenhum bairro especificado</p>;
    }

    const gridClass = columns > 1 ? `grid-cols-1 md:grid-cols-${columns}` : 'grid-cols-1';

    return (
      <div 
        className={`grid gap-2 ${gridClass}`}
        style={{ maxHeight: '400px', overflowY: 'auto' }}
      >
        {neighborhoods.map((neighborhood, idx) => (
          <div 
            key={idx} 
            className="flex items-center gap-2 text-sm text-gray-700 p-2 bg-blue-50 rounded"
          >
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full flex-shrink-0" />
            <span>{neighborhood}</span>
          </div>
        ))}
      </div>
    );
  };

  const NeighborhoodsButton = ({ route, isOrigin }) => {
    if (!route.covered_areas) return null;

    const neighborhoods = parseNeighborhoods(route.covered_areas);
    const locationLabel = isOrigin ? 'origem' : 'destino';

    return (
      <>
        {/* Desktop: Tooltip */}
        <TooltipProvider>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button 
                type="button"
                className="hidden md:inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors ml-2 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100"
                onClick={(e) => e.stopPropagation()}
              >
                <List className="w-3.5 h-3.5" />
                Ver Bairros Atendidos
              </button>
            </TooltipTrigger>
            <TooltipContent 
              side="top" 
              className="max-w-2xl bg-white border-2 border-blue-200 shadow-xl p-4"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900 text-base">
                    Bairros Atendidos ({locationLabel})
                  </h3>
                </div>
                <NeighborhoodsList neighborhoods={neighborhoods} columns={3} />
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Mobile: Dialog */}
        <Dialog open={openDialog === route.id} onOpenChange={(open) => setOpenDialog(open ? route.id : null)}>
          <DialogTrigger asChild>
            <button 
              type="button"
              className="md:hidden inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors ml-2 bg-blue-50 px-2 py-1 rounded-md active:bg-blue-100"
              onClick={(e) => e.stopPropagation()}
            >
              <List className="w-3.5 h-3.5" />
              Ver Bairros
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-blue-900">
                <MapPin className="w-5 h-5" />
                Bairros Atendidos
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Esta rota atende os seguintes bairros na {locationLabel}:
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto pr-2">
              <NeighborhoodsList neighborhoods={neighborhoods} columns={1} />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  };

  const getRouteLabel = (route) => {
    if (transferType === 'arrival') {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="font-semibold text-gray-900">{route.origin}</span>
          </div>
          <div className="flex items-start gap-2 ml-6">
            <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-gray-600">{route.destination}</span>
              <NeighborhoodsButton route={route} isOrigin={false} />
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="font-semibold text-gray-900">{route.origin}</span>
            <NeighborhoodsButton route={route} isOrigin={true} />
          </div>
          <div className="flex items-center gap-2 ml-6">
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
            <span className="text-gray-600">{route.destination}</span>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {routes.map((route, index) => (
        <motion.div
          key={route.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card
            className={`cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
              selectedRoute?.id === route.id
                ? 'ring-2 ring-blue-600 shadow-lg'
                : 'hover:ring-1 hover:ring-blue-300'
            }`}
            onClick={() => onSelectRoute(route)}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Car className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-600">
                  {VEHICLE_TYPES[route.vehicle_type] || route.vehicle_type || 'Veículo'}
                </span>
              </div>

              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 pr-4">
                  {getRouteLabel(route)}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatPrice(calculateTotalPrice(route))}
                  </div>
                  <div className="text-xs text-gray-500">valor total</div>
                </div>
              </div>

              {route.description && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{route.description}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-4 text-sm text-gray-600">
                {route.duration_minutes && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{route.duration_minutes} min</span>
                  </div>
                )}
                {route.max_passengers && (
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>até {route.max_passengers} passageiros</span>
                  </div>
                )}
              </div>

              {route.additional_expenses > 0 && (
                <div className="mt-3 pt-3 border-t text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Preço base:</span>
                    <span>{formatPrice(route.base_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Despesas adicionais:</span>
                    <span>{formatPrice(route.additional_expenses)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}