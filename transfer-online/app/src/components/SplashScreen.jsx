import React from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';

export default function SplashScreen({ splashUrl, defaultLogoUrl }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800"
    >
      <div className="flex flex-col items-center justify-center space-y-6 p-8">
        {splashUrl ? (
          // Prioridade 1: Splash Screen configurado
          <motion.img
            src={splashUrl}
            alt="TransferOnline Splash"
            className="max-w-[280px] w-full h-auto object-contain"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
        ) : defaultLogoUrl ? (
          // Prioridade 2: Logo Padrão configurado
          <motion.img
            src={defaultLogoUrl}
            alt="TransferOnline Logo"
            className="max-w-[200px] w-full h-auto object-contain"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
        ) : (
          // Prioridade 3: Fallback com ícone de calendário (quando nada está configurado)
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-2xl mb-4">
              <Calendar className="w-12 h-12 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">TransferOnline</h1>
            <p className="text-blue-100 text-lg">Sistema de Reservas</p>
          </motion.div>
        )}
        
        <motion.div
          className="flex space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </motion.div>
      </div>
    </motion.div>
  );
}