import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function DriverMessageFloatingAlert({ driverId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  // Only fetch if we have a driverId
  const { data: messages = [] } = useQuery({
    queryKey: ['driverMessages', driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const response = await base44.functions.invoke('getDriverMessages', { driverId });
      return response.data || [];
    },
    enabled: !!driverId,
    refetchInterval: 10000, // Check every 10 seconds
    refetchOnWindowFocus: true
  });

  useEffect(() => {
    if (messages && Array.isArray(messages)) {
      const count = messages.filter(m => !m.is_read).length;
      setUnreadCount(count);
    }
  }, [messages]);

  // Don't show if no unread messages or if we are already on the messages tab in dashboard
  const isMessagesTab = location.pathname.includes('DashboardMotorista') && location.search.includes('tab=messages');
  
  if (unreadCount === 0 || isMessagesTab) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="fixed bottom-20 right-4 z-50"
      >
        <button
          onClick={() => navigate(createPageUrl('DashboardMotorista') + '?tab=messages')}
          className="relative bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg shadow-blue-600/30 transition-all duration-300 flex items-center justify-center group"
        >
          <MessageSquare className="w-6 h-6" />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white min-w-[24px]">
            {unreadCount}
          </span>
          
          {/* Tooltip/Label */}
          <span className="absolute right-full mr-3 bg-white text-gray-800 text-sm font-medium px-3 py-1.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Novas mensagens
          </span>
          
          {/* Ping animation */}
          <span className="absolute -z-10 top-0 left-0 w-full h-full bg-blue-400 rounded-full animate-ping opacity-20"></span>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}