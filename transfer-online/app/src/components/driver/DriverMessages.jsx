import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageSquare, CheckCheck, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DriverMessages({ driverId }) {
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['driverMessages', driverId],
    queryFn: async () => {
      if (!driverId) return [];
      // Use backend function to fetch messages to ensure we bypass any RLS/permission issues
      const response = await base44.functions.invoke('getDriverMessages', { driverId });
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      throw new Error(response.data?.error || 'Failed to fetch messages');
    },
    enabled: !!driverId,
    refetchInterval: 10000 // Poll every 10 seconds
  });

  if (error) {
    console.error("Error fetching messages:", error);
  }

  useEffect(() => {
    if (messages) {
      setUnreadCount(messages.filter(m => !m.is_read).length);
    }
  }, [messages]);

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId) => {
      return await base44.entities.DriverMessage.update(messageId, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['driverMessages']);
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadMessages = messages.filter(m => !m.is_read);
      const promises = unreadMessages.map(m => 
        base44.entities.DriverMessage.update(m.id, { is_read: true })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['driverMessages']);
    }
  });

  const getIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = (type, isRead) => {
    if (isRead) return 'bg-white';
    switch (type) {
      case 'warning': return 'bg-amber-50';
      case 'critical': return 'bg-red-50';
      case 'success': return 'bg-green-50';
      default: return 'bg-blue-50';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Mensagens
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white hover:bg-red-600">
              {unreadCount} nova(s)
            </Badge>
          )}
        </h3>
        {unreadCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-blue-600"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
          >
            <CheckCheck className="w-4 h-4 mr-1" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {messages.length === 0 ? (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="p-6 text-center text-gray-500 text-sm">
            Nenhuma mensagem recebida.
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {messages.map((msg) => (
              <Card 
                key={msg.id} 
                className={`transition-colors border-l-4 ${
                  !msg.is_read ? 'border-l-blue-500 shadow-sm' : 'border-l-gray-200 opacity-80'
                } ${getBgColor(msg.type, msg.is_read)}`}
                onClick={() => !msg.is_read && markAsReadMutation.mutate(msg.id)}
              >
                <CardContent className="p-4 relative">
                  <div className="flex gap-3">
                    <div className="mt-1 flex-shrink-0">
                      {getIcon(msg.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className={`text-sm font-semibold ${!msg.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {msg.title}
                        </h4>
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">
                          {msg.created_date ? format(new Date(msg.created_date), "dd/MM HH:mm", { locale: ptBR }) : ''}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 whitespace-pre-line ${!msg.is_read ? 'text-gray-800' : 'text-gray-600'}`}>
                        {msg.message}
                      </p>
                      {msg.sent_via_whatsapp && (
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-green-600 font-medium">
                          <CheckCheck className="w-3 h-3" />
                          Enviado também via WhatsApp
                        </div>
                      )}
                    </div>
                  </div>
                  {!msg.is_read && (
                    <div className="absolute right-2 bottom-2">
                      <span className="block w-2 h-2 bg-blue-500 rounded-full"></span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}