import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, History, User, Clock, MessageSquare, FileText } from 'lucide-react';
import moment from 'moment';

export default function TripHistoryView({ tripId, tripType }) {
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['tripHistory', tripId],
    queryFn: async () => {
      const records = await base44.entities.TripHistory.filter({ trip_id: tripId }, '-created_date', 100);
      return records;
    },
    enabled: !!tripId
  });

  const addCommentMutation = useMutation({
    mutationFn: async (comment) => {
      const response = await base44.functions.invoke('addTripComment', {
        trip_id: tripId,
        trip_type: tripType,
        comment
      });
      if (response.data.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries(['tripHistory', tripId]);
    },
    onError: (error) => {
      alert(`Erro ao adicionar comentário: ${error.message}`);
      console.error(error);
    }
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  const getEventIcon = (type) => {
    if (type.includes('Comentário')) return <MessageSquare className="w-4 h-4 text-blue-500" />;
    if (type.includes('Status')) return <History className="w-4 h-4 text-purple-500" />;
    if (type.includes('Criada')) return <FileText className="w-4 h-4 text-green-500" />;
    return <Clock className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b">
        <History className="w-5 h-5 text-gray-500" />
        <h3 className="font-semibold text-gray-900">Histórico da Viagem</h3>
      </div>

      <ScrollArea className="flex-1 pr-4 mb-4 -mr-4">
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-4">Nenhum registro encontrado.</p>
        ) : (
          <div className="space-y-4 pl-2">
            {history.map((item) => {
              // Garantir que a data seja tratada corretamente
              let dateInput = item.created_date;
              
              // Se for string e parecer ISO sem offset, assume UTC
              if (typeof dateInput === 'string' && !dateInput.endsWith('Z') && !dateInput.includes('+') && !dateInput.includes('-')) {
                dateInput += 'Z';
              }

              return (
                <div key={item.id} className="relative pl-6 border-l-2 border-gray-200 last:border-l-0 pb-2">
                  <div className="absolute -left-[9px] top-0 bg-white p-1 rounded-full border border-gray-200">
                    {getEventIcon(item.event_type)}
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-gray-900">{item.event_type}</span>
                      <span className="text-xs text-gray-500">
                        {moment(dateInput).utcOffset(-3).format('DD/MM/YYYY HH:mm')}
                      </span>
                    </div>
                    
                    {item.comment && (
                      <p className="text-gray-700 mb-2 whitespace-pre-wrap bg-white p-2 rounded border border-gray-200">
                        {item.comment}
                      </p>
                    )}

                    {item.details && Object.keys(item.details).length > 0 && (
                      <div className="text-xs text-gray-600 mt-1 space-y-1">
                        {item.details.old_status && item.details.new_status && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{item.details.old_status}</Badge>
                            <span>→</span>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {item.details.new_status}
                            </Badge>
                          </div>
                        )}
                        {item.details.driver_name && (
                          <p>Motorista: <strong>{item.details.driver_name}</strong></p>
                        )}
                        {/* Add more specific detail rendering as needed */}
                      </div>
                    )}

                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                      <User className="w-3 h-3" />
                      <span>{item.user_name || 'Sistema'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="mt-auto pt-2 border-t">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Adicionar observação interna..."
          className="min-h-[80px] mb-2 resize-none text-sm"
        />
        <div className="flex justify-end">
          <Button 
            type="button" 
            size="sm" 
            disabled={!newComment.trim() || addCommentMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleSubmitComment}
          >
            {addCommentMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Adicionar Comentário
          </Button>
        </div>
      </div>
    </div>
  );
}