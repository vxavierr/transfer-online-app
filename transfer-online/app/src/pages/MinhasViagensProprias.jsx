import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/ui/StatusBadge';
import SupplierBookingDialog from '@/components/supplier/SupplierBookingDialog';
import { 
  Loader2, 
  Search, 
  Plus, 
  Car, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  DollarSign, 
  Filter,
  FileText,
  Printer
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';

export default function MinhasViagensProprias() {
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [supplier, setSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewBookingDialog, setShowNewBookingDialog] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        
        if (!currentUser.supplier_id) {
          alert('Acesso restrito a fornecedores.');
          navigate('/DashboardFornecedor');
          return;
        }

        setUser(currentUser);
        
        const supplierData = await base44.entities.Supplier.get(currentUser.supplier_id);
        
        if (!supplierData.module3_enabled || supplierData.module3_subscription_level === 0) {
          alert('Módulo 3 não habilitado. Contate o suporte.');
          navigate('/DashboardFornecedor');
          return;
        }
        
        setSupplier(supplierData);
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Erro auth:', error);
        window.location.href = '/AccessPortal?returnUrl=%2FMinhasViagensProprias';
      }
    };
    checkAuth();
  }, [navigate]);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['supplierOwnBookings', supplier?.id],
    queryFn: async () => {
        if (!supplier?.id) return [];
        return await base44.entities.SupplierOwnBooking.filter({ 
            supplier_id: supplier.id 
        }, { created_date: -1 }); // Sort by newest
    },
    enabled: !!supplier
  });

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.booking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.passenger_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.origin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.destination?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Minhas Viagens Próprias</h1>
            <p className="text-gray-500">Gerencie as viagens dos seus clientes diretos</p>
          </div>
          <Button 
            onClick={() => {
                setBookingToEdit(null);
                setShowNewBookingDialog(true);
            }} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Viagem
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por número, passageiro ou endereço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="w-full md:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Carregando viagens...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
            <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma viagem encontrada</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Tente ajustar os filtros de busca' 
                : 'Cadastre sua primeira viagem própria agora mesmo'}
            </p>
            <Button 
                onClick={() => {
                    setBookingToEdit(null);
                    setShowNewBookingDialog(true);
                }} 
                variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Viagem
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredBookings.map((booking) => (
              <Card key={booking.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Left Status Bar */}
                    <div className={`w-full md:w-2 h-2 md:h-auto ${
                        booking.status === 'concluida' ? 'bg-green-500' :
                        booking.status === 'cancelada' ? 'bg-red-500' :
                        booking.status === 'em_andamento' ? 'bg-blue-500' :
                        booking.status === 'confirmada' ? 'bg-indigo-500' :
                        'bg-yellow-500'
                    }`} />
                    
                    <div className="flex-1 p-6">
                      <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-gray-900">{booking.booking_number}</span>
                            <StatusBadge status={booking.status} type="trip_status" />
                            {booking.service_type === 'hourly' && (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                    <Clock className="w-3 h-3 mr-1" /> {booking.hours}h
                                </Badge>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-500 gap-4">
                            <span className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {format(parseISO(booking.date), "dd 'de' MMMM", { locale: ptBR })}
                            </span>
                            <span className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {booking.time}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(booking.price || 0)}
                            </div>
                            <div className="text-sm text-gray-500">
                                {booking.payment_method || 'Não definido'}
                            </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6 mb-4">
                        <div className="space-y-3">
                            <div className="flex items-start gap-2">
                                <div className="mt-1"><MapPin className="w-4 h-4 text-green-600" /></div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">ORIGEM</p>
                                    <p className="text-sm text-gray-900">{booking.origin}</p>
                                    {booking.origin_flight_number && (
                                        <Badge variant="secondary" className="mt-1 text-[10px]">
                                            Voo: {booking.origin_flight_number}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <div className="mt-1"><MapPin className="w-4 h-4 text-red-600" /></div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">DESTINO</p>
                                    <p className="text-sm text-gray-900">{booking.destination}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-start gap-2">
                                <div className="mt-1"><User className="w-4 h-4 text-gray-400" /></div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">PASSAGEIRO</p>
                                    <p className="text-sm text-gray-900 font-medium">{booking.passenger_name}</p>
                                    <p className="text-xs text-gray-500">
                                        {booking.passenger_phone} • {booking.passengers} pax
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <div className="mt-1"><Car className="w-4 h-4 text-gray-400" /></div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">MOTORISTA</p>
                                    {booking.driver_name ? (
                                        <>
                                            <p className="text-sm text-gray-900 font-medium">{booking.driver_name}</p>
                                            <p className="text-xs text-gray-500">
                                                {booking.vehicle_model} • {booking.vehicle_plate}
                                            </p>
                                        </>
                                    ) : (
                                        <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                                            Pendente atribuição
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 border-t pt-4">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                                setBookingToEdit(booking);
                                setShowNewBookingDialog(true);
                            }}
                            className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                        >
                            <FileText className="w-4 h-4 mr-1" />
                            Editar Viagem
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {showNewBookingDialog && supplier && (
            <SupplierBookingDialog 
                open={showNewBookingDialog}
                onOpenChange={setShowNewBookingDialog}
                bookingToEdit={bookingToEdit}
                supplierId={supplier.id}
            />
        )}
      </div>
    </div>
  );
}