import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PlaneIcon, Home, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TransferTypeSelector({ onSelectType, selectedType }) {
  const transferTypes = [
    {
      id: 'arrival',
      title: 'Chegada no Aeroporto',
      description: 'Do aeroporto para hotéis, residências ou outros endereços',
      icon: PlaneIcon,
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 'departure',
      title: 'Saída para o Aeroporto',
      description: 'Do seu endereço para o aeroporto, a tempo para seu voo',
      icon: Home,
      gradient: 'from-green-500 to-green-600'
    }
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {transferTypes.map((type, index) => (
        <motion.div
          key={type.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card
            className={`cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 ${
              selectedType === type.id
                ? 'ring-4 ring-blue-500 shadow-2xl'
                : 'hover:ring-2 hover:ring-blue-300'
            }`}
            onClick={() => onSelectType(type.id)}
          >
            <CardContent className="p-8">
              <div className={`w-16 h-16 bg-gradient-to-br ${type.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                <type.icon className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {type.title}
              </h3>
              
              <p className="text-gray-600 mb-4">
                {type.description}
              </p>

              <div className="flex items-center text-sm text-blue-600 font-medium">
                <span>Selecionar</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}