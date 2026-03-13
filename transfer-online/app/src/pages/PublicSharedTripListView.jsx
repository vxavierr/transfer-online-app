import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Calendar, Clock, MapPin, User, Car, Phone, AlertCircle, CheckCircle, XCircle, Plane, ArrowRight, FileDown, Edit, ExternalLink, UserCheck } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export default function PublicSharedTripListView() {
  // Force deployment refresh
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  
  // State for Driver Info Dialog
  const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false);
  const [selectedTripForDriver, setSelectedTripForDriver] = useState(null);
  const [driverForm, setDriverForm] = useState({
      driverName: '',
      driverPhone: '',
      driverDocument: '',
      vehicleModel: '',
      vehiclePlate: '',
      vehicleColor: '',
      serviceCost: ''
  });
  const [savingDriver, setSavingDriver] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let token = params.get('token');

    if (!token) {
      setError('Link inválido. Token não encontrado.');
      setLoading(false);
      return;
    }

    // Sanitize token: remove trailing brackets ] or ) which are common copy-paste errors
    // Also remove any URL encoded closing brackets %5D
    token = token.replace(/[\])]$/, '');

    // If the URL has the bad token, replace it in the browser history for cleanliness
    if (token !== params.get('token')) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('token', token);
        window.history.replaceState({}, '', newUrl);
    }

    fetchData(token);
    
    // Auto-refresh a cada 60s
    const interval = setInterval(() => fetchData(token, true), 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async (token, isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const response = await base44.functions.invoke('getSharedTripList', { token });
      if (response.data.success) {
        setData(response.data);
      } else {
        setError(response.data.error || 'Erro ao carregar lista.');
      }
    } catch (err) {
      console.error("PublicSharedTripListView error:", err);
      // Extract meaningful error message if available
      const errorMessage = err.response?.data?.error || err.message || 'Erro de conexão';
      
      // Don't prefix with "Erro de conexão" if it's a 404 (Not Found) or 403 (Forbidden) or 410 (Gone)
      // These are logic errors (link invalid, expired, etc), not connection issues
      if (err.response && (err.response.status === 404 || err.response.status === 403 || err.response.status === 410)) {
          setError(errorMessage);
      } else {
          setError(`Erro de conexão: ${errorMessage}. Tente recarregar a página.`);
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200 shadow-lg">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Indisponível</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { list, trips } = data;

  const handleOpenDriverDialog = (trip) => {
      if (trip.subcontractorInfoStatus === 'pending_review') {
          if (!confirm('As informações enviadas já estão em análise. Deseja corrigi-las?')) {
              return;
          }
      } else if (trip.subcontractorInfoStatus === 'approved') {
          if (!confirm('As informações já foram aprovadas. Deseja editá-las? Isso exigirá uma nova aprovação.')) {
              return;
          }
      }
      setSelectedTripForDriver(trip);
      setDriverForm({
          driverName: trip.subcontractorDriverName || '',
          driverPhone: trip.subcontractorDriverPhone || '',
          driverDocument: trip.subcontractorDriverDocument || '',
          vehicleModel: trip.subcontractorVehicleModel || '',
          vehiclePlate: trip.subcontractorVehiclePlate || '',
          vehicleColor: trip.subcontractorVehicleColor || '',
          serviceCost: trip.subcontractor_cost || ''
      });
      setIsDriverDialogOpen(true);
  };

  const handleSaveDriverInfo = async () => {
      setSavingDriver(true);
      try {
          const params = new URLSearchParams(window.location.search);
          const token = params.get('token');
          
          await base44.functions.invoke('updateSubcontractorDriverInfo', {
              token,
              tripId: selectedTripForDriver.id,
              driverName: driverForm.driverName,
              driverPhone: driverForm.driverPhone,
              driverDocument: driverForm.driverDocument,
              vehicleModel: driverForm.vehicleModel,
              vehiclePlate: driverForm.vehiclePlate,
              vehicleColor: driverForm.vehicleColor,
              serviceCost: parseFloat(driverForm.serviceCost) || 0
          });
          
          setIsDriverDialogOpen(false);
          fetchData(token); // Refresh data
      } catch (error) {
          console.error("Error saving driver info:", error);
          setError("Erro ao salvar informações. Tente novamente.");
      } finally {
          setSavingDriver(false);
      }
  };

  const generatePassengerListPDF = (trip) => {
    const doc = new jsPDF();
    const primaryColor = [37, 99, 235]; // Blue-600
    const grayColor = [107, 114, 128]; // Gray-500

    // Cabeçalho
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text("Lista de Passageiros", 14, 20);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    
    // Identificador em destaque (ex: VAN1 em negrito)
    if (trip.displayId) {
        const parts = trip.displayId.split('-');
        doc.setFont(undefined, 'bold');
        doc.text(parts[0], 14, 28);
        if (parts.length > 1) {
            doc.setFont(undefined, 'normal');
            const prefixWidth = doc.getTextWidth(parts[0]);
            doc.text(`-${parts.slice(1).join('-')}`, 14 + prefixWidth, 28);
        }
    } else {
        const title = trip.name || "Detalhes da Viagem";
        doc.setFont(undefined, 'normal');
        doc.text(title, 14, 28);
    }

    // Detalhes da Viagem
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.rect(14, 35, 182, 35, 'FD');

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("Detalhes da Viagem:", 18, 42);
    doc.setFont(undefined, 'normal');

    const tripDate = trip.date ? format(parseISO(trip.date), "dd/MM/yyyy") : '-';
    
    // Prefer subcontractor vehicle info if available, otherwise fallback
    const vehicleInfo = trip.subcontractorVehiclePlate 
        ? `${trip.subcontractorVehicleModel || ''} (${trip.subcontractorVehiclePlate})` 
        : (trip.vehiclePlate 
            ? `${trip.vehicleModel || ''} (${trip.vehiclePlate})` 
            : (trip.vehicleType || trip.vehicle_type_category || 'N/A'));

    // Linha 1
    doc.text(`Data: ${tripDate}`, 18, 50);
    doc.text(`Hora: ${trip.time || '-'}`, 80, 50);
    doc.text(`Veículo: ${vehicleInfo}`, 140, 50);

    // Linha 2
    doc.text(`Origem: ${trip.origin || '-'}`, 18, 58);
    doc.text(`Destino: ${trip.destination || '-'}`, 18, 66);
    
    // Motorista (se houver)
    const driverName = trip.subcontractorDriverName || trip.driverName;
    if (driverName) {
        doc.text(`Motorista: ${driverName}`, 140, 58);
    }

    // Tabela
    let y = 80;
    
    // Cabeçalho Tabela
    const drawTableHeader = (posY) => {
        doc.setFillColor(243, 244, 246);
        doc.rect(14, posY, 182, 10, 'F');
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...grayColor);
        doc.text("#", 18, posY + 7);
        doc.text("Nome do Passageiro", 35, posY + 7);
        doc.text("Documento", 110, posY + 7);
        doc.text("Veículo Alocado", 155, posY + 7);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
    };

    drawTableHeader(y);
    y += 10;

    // Passageiros
    let passengersList = [];
    if (trip.passengers && Array.isArray(trip.passengers) && trip.passengers.length > 0) {
        passengersList = [...trip.passengers]; // Cria uma cópia para ordenar
    } else if (trip.passengerName) {
        passengersList = [{ 
            passenger_name: trip.passengerName, 
            document_number: trip.passengerDocument || '-',
            assigned_vehicle: vehicleInfo 
        }];
    }

    // Ordenar passageiros alfabeticamente
    passengersList.sort((a, b) => {
        const nameA = (a.passenger_name || a.name || '').toLowerCase();
        const nameB = (b.passenger_name || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });

    if (passengersList.length > 0) {
        passengersList.forEach((p, index) => {
            if (index % 2 === 0) doc.setFillColor(255, 255, 255);
            else doc.setFillColor(252, 252, 252);
            
            doc.rect(14, y, 182, 10, 'F');

            const pName = p.passenger_name || p.name || '-';
            const pDoc = p.document_number || p.documentId || p.document_id || '-';
            // Se o passageiro tiver veículo específico, usa. Senão usa o da viagem.
            const pVehicle = p.assigned_vehicle || vehicleInfo;

            doc.text(`${index + 1}`, 18, y + 7);
            doc.text(pName, 35, y + 7);
            doc.text(pDoc, 110, y + 7);
            doc.text(pVehicle, 155, y + 7);

            y += 10;

            if (y > 270) {
                doc.addPage();
                y = 20;
                drawTableHeader(y);
                y += 10;
            }
        });
    } else {
        doc.text("Lista de passageiros não disponível.", 18, y + 7);
    }

    // Rodapé
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 285);
    doc.text("TransferOnline", 180, 285, { align: "right" });

    doc.save(`Lista_Passageiros_${trip.displayId || 'Viagem'}.pdf`);
  };

  const generatePassengerListExcel = () => {
    const wb = XLSX.utils.book_new();
    const allData = [];

    // Header Row
    const header = [
        "Data", 
        "Hora", 
        "Identificador", 
        "Nome do Passageiro", 
        "Documento", 
        "Veículo", 
        "Placa", 
        "Motorista", 
        "Telefone Motorista", 
        "Origem", 
        "Destino", 
        "Voo", 
        "Status"
    ];
    allData.push(header);

    const dataRows = [];

    trips.forEach(trip => {
        const tripDate = trip.date ? format(parseISO(trip.date), "dd/MM/yyyy") : '-';
        const vehicleInfo = trip.subcontractorVehiclePlate 
            ? `${trip.subcontractorVehicleModel || ''}` 
            : (trip.vehicleModel || trip.vehicleType || trip.vehicle_type_category || '-');
        const plateInfo = trip.subcontractorVehiclePlate || trip.vehiclePlate || '-';
        const driverName = trip.subcontractorDriverName || trip.driverName || '-';
        const driverPhone = trip.subcontractorDriverPhone || trip.driverPhone || '-';
        
        let passengersList = [];
        if (trip.passengers && Array.isArray(trip.passengers) && trip.passengers.length > 0) {
            passengersList = [...trip.passengers];
        } else if (trip.passengerName) {
            passengersList = [{ 
                passenger_name: trip.passengerName, 
                document_number: trip.passengerDocument || '-'
            }];
        }

        passengersList.forEach(p => {
            const pName = p.passenger_name || p.name || '-';
            const pDoc = p.document_number || p.documentId || p.document_id || '-';
            
            dataRows.push([
                tripDate,
                trip.time || '-',
                trip.displayId || '-',
                pName,
                pDoc,
                vehicleInfo,
                plateInfo,
                driverName,
                driverPhone,
                trip.origin || '-',
                trip.destination || '-',
                trip.flightNumber || '-',
                trip.status || '-'
            ]);
        });
    });

    // Ordenar alfabeticamente por veículo (índice 5)
    dataRows.sort((a, b) => {
        const vehicleA = (a[5] || '').toString().toLowerCase();
        const vehicleB = (b[5] || '').toString().toLowerCase();
        if (vehicleA < vehicleB) return -1;
        if (vehicleA > vehicleB) return 1;
        return 0;
    });

    allData.push(...dataRows);

    const ws = XLSX.utils.aoa_to_sheet(allData);
    
    // Auto-width columns roughly
    const wscols = header.map(h => ({ wch: h.length + 5 }));
    // Adjust some specific columns to be wider
    wscols[3] = { wch: 30 }; // Passenger Name
    wscols[9] = { wch: 30 }; // Origin
    wscols[10] = { wch: 30 }; // Destination
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Lista de Passageiros");
    XLSX.writeFile(wb, `Lista_Passageiros_${list.name || 'Export'}.xlsx`);
  };

  const formatDuration = (minutes) => {
      if (!minutes || minutes < 0) return '';
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = Math.round(minutes % 60);
      if (hours > 0) return `${hours}h ${remainingMinutes}min`;
      return `${remainingMinutes}min`;
  };

  const getStatusBadge = (status, driverStatus) => {
    // Prioridade para status do motorista se em andamento
    if (driverStatus && ['a_caminho', 'chegou_origem', 'passageiro_embarcou', 'finalizada'].includes(driverStatus)) {
       const map = {
         'a_caminho': { label: 'Motorista a Caminho', color: 'bg-blue-100 text-blue-800' },
         'chegou_origem': { label: 'Motorista na Origem', color: 'bg-indigo-100 text-indigo-800' },
         'passageiro_embarcou': { label: 'Em Viagem', color: 'bg-purple-100 text-purple-800' },
         'finalizada': { label: 'Concluída', color: 'bg-green-100 text-green-800' }
       };
       const s = map[driverStatus] || { label: driverStatus, color: 'bg-gray-100' };
       return <Badge className={s.color}>{s.label}</Badge>;
    }

    const map = {
      'confirmada': { label: 'Confirmada', color: 'bg-green-100 text-green-800' },
      'pendente': { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      'cancelada': { label: 'Cancelada', color: 'bg-red-100 text-red-800' },
      'concluida': { label: 'Concluída', color: 'bg-gray-100 text-gray-800' },
      'em_andamento': { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800' }
    };
    const s = map[status] || { label: status, color: 'bg-gray-100' };
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                  <div className="text-sm text-blue-600 font-semibold uppercase tracking-wider">
                      {list.supplierName}
                  </div>
                  {list.controlNumber && (
                      <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-200 font-mono font-bold px-2 py-0.5 shadow-sm">
                          #{list.controlNumber}
                      </Badge>
                  )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{list.name}</h1>
              {list.coordinator && (
                <div className="flex items-center gap-2 mt-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <span className="text-sm">Coordenação: <strong>{list.coordinator}</strong></span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{trips.length}</div>
              <div className="text-sm text-gray-500">Viagens Listadas</div>
            </div>
          </div>
        </div>

        {/* Trips List */}
        <div className="space-y-4">
          {trips.map((trip) => (
            <Card key={trip.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4">
                  
                  {/* Top Row: Time, ID, Status */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg font-bold text-xl text-center min-w-[90px] flex flex-col justify-center">
                        <span className="leading-none">{trip.time}</span>
                        <div className="text-sm font-bold text-blue-600 mt-1 leading-none">
                          {format(parseISO(trip.date), 'dd/MM')}
                        </div>
                      </div>
                      <div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="flex flex-wrap gap-2 items-center">
    <div className="font-bold text-gray-900 text-lg">{trip.passengerName}</div>
    {trip.passengers && trip.passengers[0]?.tags && trip.passengers[0].tags.length > 0 && (
        <div className="flex gap-1">
            {trip.passengers[0].tags.map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-yellow-100 text-yellow-800 border-yellow-200">
                    {tag}
                </Badge>
            ))}
        </div>
    )}
</div>
                            {trip.passengers && trip.passengers[0]?.tags && trip.passengers[0].tags.length > 0 && (
                                <div className="flex gap-1">
                                    {trip.passengers[0].tags.map((tag, idx) => (
                                        <Badge key={idx} variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-yellow-100 text-yellow-800 border-yellow-200">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <div className="text-xs text-gray-500 font-mono">{trip.displayId}</div>
                          {trip.vehicle_type_category && (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-auto border-blue-200 text-blue-700 bg-blue-50 uppercase font-bold tracking-wide">
                              {trip.vehicle_type_category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-2">
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 gap-1 bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
                            onClick={() => handleOpenDriverDialog(trip)}
                            title="Informar Motorista/Veículo"
                        >
                            <Car className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Motorista</span>
                        </Button>

                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 gap-1 bg-white hover:bg-blue-50 text-blue-700 border-blue-200"
                            onClick={() => generatePassengerListPDF(trip)}
                            title="Baixar Lista de Passageiros em PDF"
                        >
                            <FileDown className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Lista PDF</span>
                            <span className="sm:hidden">PDF</span>
                        </Button>

                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 gap-1 bg-white hover:bg-green-50 text-green-700 border-green-200"
                            onClick={generatePassengerListExcel}
                            title="Baixar Lista Geral em Excel"
                        >
                            <FileDown className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Excel</span>
                            <span className="sm:hidden">XLS</span>
                        </Button>
                      </div>

                      {getStatusBadge(trip.status, trip.driverTripStatus)}
                      
                      {/* ETA Display - Apenas quando passageiro embarcou */}
                      {(trip.eta > 0) && trip.driverTripStatus === 'passageiro_embarcou' && (
                        <div className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1 rounded-full shadow-sm animate-pulse">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs font-bold">
                            ETA {format(new Date(Date.now() + trip.eta * 60000), 'HH:mm')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Route with Stops */}
                  <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                    {/* Origem */}
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                      <div>
                        <div className="text-xs text-gray-500 uppercase">Origem</div>
                        <div className="font-medium text-sm leading-tight">{trip.origin}</div>
                        {trip.flightNumber && (
                          <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                            <Plane className="w-3 h-3" /> Voo: {trip.flightNumber}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Paradas Intermediárias */}
                    {Array.isArray(trip.stops) && trip.stops.length > 0 && (
                      <div className="relative pl-1">
                        <div className="absolute left-[3px] top-0 bottom-0 w-0.5 bg-gray-300" />
                        <div className="space-y-3 py-1">
                          {trip.stops
                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                            .map((stop, idx) => (
                              <div key={idx} className="flex items-start gap-2 pl-3 relative">
                                <div className="absolute left-[-4px] top-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 ring-2 ring-gray-50" />
                                <div>
                                  <div className="text-xs text-gray-500 uppercase">Parada {idx + 1}</div>
                                  <div className="font-medium text-sm leading-tight">{stop.address}</div>
                                  {stop.notes && <div className="text-xs text-gray-400">{stop.notes}</div>}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Destino */}
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                      <div>
                        <div className="text-xs text-gray-500 uppercase">Destino</div>
                        <div className="font-medium text-sm leading-tight">{trip.destination}</div>
                      </div>
                    </div>
                    </div>

                    {/* Observações do Parceiro */}
                    {trip.partner_notes && (
                      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex gap-3">
                          <div className="bg-yellow-100 p-1.5 rounded-full h-fit shrink-0">
                              <AlertCircle className="w-4 h-4 text-yellow-700" />
                          </div>
                          <div>
                              <div className="text-xs font-bold text-yellow-800 uppercase mb-1">Observação do Coordenador</div>
                              <p className="text-sm text-yellow-900 leading-relaxed">{trip.partner_notes}</p>
                          </div>
                      </div>
                    )}

                    {/* Coordinators Info */}
                    {trip.coordinators && trip.coordinators.length > 0 && (
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1" className="border-none">
                                <AccordionTrigger className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg hover:no-underline hover:bg-indigo-100/80 transition-colors duration-200 flex flex-row items-center justify-between [&[data-state=open]]:rounded-b-none">
                                    <div className="text-xs font-bold text-indigo-800 uppercase flex items-center gap-1.5">
                                        <UserCheck className="w-3.5 h-3.5" />
                                        Coordenadores Atribuídos ({trip.coordinators.length})
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="bg-indigo-50 border-x border-b border-indigo-100 p-3 rounded-b-lg flex flex-col gap-2 -mt-1 pt-4">
                                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                                            {trip.coordinators.map((coord, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-sm text-indigo-900 bg-white/60 px-2 py-1 rounded border border-indigo-100">
                                                    <span className="font-semibold">{coord.name}</span>
                                                    {coord.phone && (
                                                        <>
                                                            <span className="text-indigo-300">|</span>
                                                            <a href={`https://wa.me/${coord.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                                                <Phone className="w-3 h-3" /> 
                                                                {coord.phone}
                                                            </a>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}

                  {/* Bottom Row: Driver Info Status & Data */}
                  <div className="flex flex-col gap-2 pt-2 border-t mt-1">
                    
                    {/* Status Alerts for Partner */}
                    {trip.subcontractorInfoStatus === 'pending_review' && (
                        <div className="bg-yellow-50 border border-yellow-200 p-2 rounded text-xs text-yellow-800 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>Informações em análise pelo fornecedor.</span>
                        </div>
                    )}
                    {trip.subcontractorInfoStatus === 'rejected' && (
                        <div className="bg-red-50 border border-red-200 p-2 rounded text-xs text-red-800">
                            <div className="flex items-center gap-2 font-semibold">
                                <AlertCircle className="w-3 h-3" />
                                <span>Informações Rejeitadas</span>
                            </div>
                            {trip.subcontractorInfoRejectedReason && (
                                <p className="mt-1 ml-5 italic">"{trip.subcontractorInfoRejectedReason}"</p>
                            )}
                            <Button 
                                variant="link" 
                                size="sm" 
                                className="h-auto p-0 text-red-700 underline mt-1 ml-5 text-xs"
                                onClick={() => handleOpenDriverDialog(trip)}
                            >
                                Corrigir Dados
                            </Button>
                        </div>
                    )}

                    {/* Display Driver Info (Only if Approved OR if it's the partner viewing their own submission - maybe show 'pending' state visual) 
                        Logic: Show if approved OR show if system driver (fallback). 
                        If partner submitted pending info, maybe show it but greyed out? 
                        Let's show approved info prominently.
                    */}
                    {( (trip.subcontractorDriverName || trip.driverName) ) && (
                        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 bg-gray-50/50 p-2 rounded-lg">
                            <div className="flex items-center gap-2">
                                <div className="bg-green-100 p-1.5 rounded-full shrink-0">
                                    <Car className="w-4 h-4 text-green-700" />
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">
                                        Motorista {trip.subcontractorInfoStatus === 'approved' ? '(Parceiro Aprovado)' : ''}
                                    </div>
                                    <div className="text-sm font-semibold text-gray-900">
                                        {trip.subcontractorDriverName || trip.driverName}
                                    </div>
                                    <div className="text-xs text-gray-600 flex items-center gap-1">
                                        <Phone className="w-3 h-3" />
                                        {trip.subcontractorDriverPhone || trip.driverPhone}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="h-8 w-px bg-gray-200 hidden md:block" />
                            <div>
                                <div className="text-xs text-gray-500">Veículo</div>
                                <div className="text-sm text-gray-900">
                                    {trip.subcontractorVehicleModel || trip.vehicleModel} 
                                    <span className="text-gray-400 mx-1">|</span> 
                                    <span className="font-mono font-medium">
                                        {trip.subcontractorVehiclePlate || trip.vehiclePlate}
                                    </span>
                                    {(trip.subcontractorVehicleColor) && (
                                            <span className="text-xs text-gray-500 ml-1">
                                                ({trip.subcontractorVehicleColor})
                                            </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Foto da Placa */}
                    {trip.vehicle_plate_photo_url && (
                        <div className="mt-1">
                            <a 
                                href={trip.vehicle_plate_photo_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-2 rounded-lg transition-colors border border-blue-100 hover:border-blue-200"
                            >
                                <img src={trip.vehicle_plate_photo_url} alt="Placa do Veículo" className="w-8 h-8 rounded object-cover border border-gray-200" />
                                <span>Ver Foto da Placa / Confirmação de Veículo</span>
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    )}
                  </div>

                  {/* Receptivity Status (if applicable) */}
                  {(trip.receptivityStatus === 'efetuada' || trip.receptivityStatus === 'nao_efetuada') && (
                    <div className={`text-xs px-3 py-1.5 rounded mt-1 ${
                      trip.receptivityStatus === 'efetuada' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {trip.receptivityStatus === 'efetuada' 
                        ? '✅ Receptivo/Embarque Realizado' 
                        : `⚠️ Passageiro não localizado/No-show${trip.receptivityNote ? ': ' + trip.receptivityNote : ''}`}
                    </div>
                  )}

                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
        <Dialog open={isDriverDialogOpen} onOpenChange={setIsDriverDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Informar Motorista e Veículo</DialogTitle>
                    <DialogDescription>
                        Informe os dados do motorista e veículo que realizará esta viagem.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="driverName">Nome do Motorista *</Label>
                        <Input
                            id="driverName"
                            value={driverForm.driverName}
                            onChange={(e) => setDriverForm({ ...driverForm, driverName: e.target.value })}
                            placeholder="Nome completo"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="driverPhone">Telefone/WhatsApp *</Label>
                            <Input
                                id="driverPhone"
                                value={driverForm.driverPhone}
                                onChange={(e) => setDriverForm({ ...driverForm, driverPhone: e.target.value })}
                                placeholder="(11) 99999-9999"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="driverDocument">RG (Opcional)</Label>
                            <Input
                                id="driverDocument"
                                value={driverForm.driverDocument}
                                onChange={(e) => setDriverForm({ ...driverForm, driverDocument: e.target.value })}
                                placeholder="RG do motorista"
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="vehicleModel">Modelo do Veículo *</Label>
                        <Input
                            id="vehicleModel"
                            value={driverForm.vehicleModel}
                            onChange={(e) => setDriverForm({ ...driverForm, vehicleModel: e.target.value })}
                            placeholder="Ex: Toyota Corolla, Sprinter"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="vehiclePlate">Placa *</Label>
                            <Input
                                id="vehiclePlate"
                                value={driverForm.vehiclePlate}
                                onChange={(e) => setDriverForm({ ...driverForm, vehiclePlate: e.target.value })}
                                placeholder="ABC-1234"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="vehicleColor">Cor</Label>
                            <Input
                                id="vehicleColor"
                                value={driverForm.vehicleColor}
                                onChange={(e) => setDriverForm({ ...driverForm, vehicleColor: e.target.value })}
                                placeholder="Ex: Prata, Branco"
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="serviceCost">Valor Cobrado pelo Serviço (R$)</Label>
                        <Input
                            id="serviceCost"
                            type="number"
                            value={driverForm.serviceCost}
                            onChange={(e) => setDriverForm({ ...driverForm, serviceCost: e.target.value })}
                            placeholder="0.00"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDriverDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSaveDriverInfo} disabled={savingDriver || !driverForm.driverName || !driverForm.driverPhone || !driverForm.vehicleModel || !driverForm.vehiclePlate}>
                        {savingDriver ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Salvar Informações
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}