import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Upload, Calendar, FileSpreadsheet, Users, Truck, Settings, ArrowRight, AlertTriangle, CheckCircle, Plane, Trash2, ShieldCheck, Download, Eraser, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from 'xlsx';

export default function GerenciarEventos() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewEventDialog, setShowNewEventDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);

  // Form State
  const [newEvent, setNewEvent] = useState({
    event_name: "",
    event_code: "",
    event_type: "airport_arrivals",
    start_date: "",
    end_date: "",
    client_name: "",
    agency_name: "",
    requester_name: "",
    strict_vehicle_assignment: false,
    file: null
  });

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedEventForImport, setSelectedEventForImport] = useState(null);
  const [importFile, setImportFile] = useState(null);

  const [importResult, setImportResult] = useState(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [eventToClear, setEventToClear] = useState(null);
  const [showClearDialog, setShowClearDialog] = useState(false);

  const [eventToEdit, setEventToEdit] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const [progress, setProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      let query = {};
      
      // Lógica de Permissão
      if (user.role === 'admin') {
        // Admin vê tudo
      } else if (user.event_access_active) {
        // Gestor de Eventos Temporário: vê eventos onde é manager
        query.manager_user_id = user.id;
        
        // Opcional: Verificar validade do acesso (double check client-side, server rules should enforce too)
        const expiry = new Date(user.event_access_valid_until);
        if (expiry < new Date()) {
            // Acesso expirado
            toast({ title: "Acesso Expirado", description: "Seu acesso ao módulo de eventos expirou.", variant: "destructive" });
            navigate('/');
            return;
        }
      } else if (user.supplier_id) {
        // Fornecedor vê seus eventos
        query.supplier_id = user.supplier_id;
      } else {
        // Sem permissão
        navigate('/');
        return;
      }

      const eventsData = await base44.entities.Event.filter(query, 'start_date', 100);
      setEvents(eventsData);
    } catch (error) {
      console.error("Erro ao carregar eventos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    setIsSubmitting(true);
    setProcessingStatus("Iniciando exclusão...");
    setProgress(0);

    try {
      let completed = false;
      let totalDeleted = 0;
      
      // Loop para processar exclusão em ciclos até o backend confirmar conclusão
      while (!completed) {
          const response = await base44.functions.invoke('deleteEventFull', { eventId: eventToDelete.id });

          if (response.data && response.data.success) {
              if (response.data.completed) {
                  completed = true;
                  setProcessingStatus("Concluído!");
                  setProgress(100);
                  
                  toast({
                    title: "Evento excluído",
                    description: "O evento e todos os seus dados foram removidos com sucesso.",
                    className: "bg-green-50 border-green-200"
                  });
              } else {
                  // Atualizar progresso visual (estimado, já que não sabemos o total exato, incrementamos visualmente)
                  totalDeleted += (response.data.deletedCount || 0);
                  setProcessingStatus(`Excluindo dados... (${totalDeleted} registros removidos)`);
                  // Animação de progresso "fake" mas útil para indicar atividade contínua
                  setProgress(prev => Math.min(prev + 10, 90));
                  
                  // Pequena pausa para não floodar o navegador/rede
                  await new Promise(r => setTimeout(r, 500));
              }
          } else {
              throw new Error(response.data?.error || "Falha ao excluir evento");
          }
      }

      loadData();
      setShowDeleteDialog(false);
      setEventToDelete(null);

    } catch (error) {
      console.error("Erro ao excluir evento:", error);
      const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : "Erro desconhecido");
      
      // Tratamento especial para Timeout (504)
      if (errorMessage.includes("504") || errorMessage.includes("timeout") || errorMessage.includes("Network Error")) {
          toast({
            title: "Exclusão em andamento (Lento)",
            description: "A operação demorou muito, mas está processando. Por favor, clique em 'Excluir' novamente para continuar de onde parou.",
            className: "bg-amber-50 border-amber-200 text-amber-800"
          });
      } else {
          toast({
            title: "Erro ao excluir",
            description: errorMessage,
            variant: "destructive"
          });
      }
    } finally {
      setIsSubmitting(false);
      setProcessingStatus("");
      setProgress(0);
    }
  };

  const handleClearEventData = async () => {
    if (!eventToClear) return;
    setIsSubmitting(true);

    try {
        const response = await base44.functions.invoke('clearEventData', { eventId: eventToClear.id });
        
        if (response.data && response.data.success) {
            toast({
                title: "Dados limpos",
                description: `Foram removidos ${response.data.details.passengersDeleted} passageiros e ${response.data.details.tripsDeleted} viagens. O evento foi resetado.`,
                className: "bg-green-50 border-green-200"
            });
            loadData();
        } else {
            throw new Error(response.data?.error || "Falha ao limpar dados");
        }
    } catch (error) {
        console.error("Erro ao limpar dados do evento:", error);
        toast({
            title: "Erro ao limpar dados",
            description: error.message || "Não foi possível limpar os dados do evento.",
            variant: "destructive"
        });
    } finally {
        setShowClearDialog(false);
        setEventToClear(null);
        setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewEvent({ ...newEvent, file: e.target.files[0] });
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      // Agora a função retorna um JSON com o base64 do arquivo
      const response = await base44.functions.invoke('generateEventImportTemplate');
      
      if (response.data && response.data.fileBase64) {
        const byteCharacters = atob(response.data.fileBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', response.data.filename || 'modelo_importacao_eventos.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error("Resposta inválida do servidor");
      }
    } catch (error) {
      console.error("Erro ao baixar modelo:", error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o modelo. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleImportFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  // Utility to parse Excel file
  const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Use header: 1 to get raw array of arrays, easier to find header row manually
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          resolve(rawData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  const processBatchImport = async (rawData, eventId, eventData = null) => {
    setIsProcessingBatch(true);
    setProgress(0);
    
    // Find header row (simple logic: looking for "nome" or "passageiro")
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(rawData.length, 20); i++) {
        const row = rawData[i];
        if (!row || !Array.isArray(row)) continue;
        const rowString = row.join(' ').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (rowString.includes('nome') || rowString.includes('passageiro') || rowString.includes('name')) {
            headerRowIndex = i;
            break;
        }
    }

    const headers = rawData[headerRowIndex];

    // Identificar índice da coluna de Nome para relatórios de erro
    let nameColIndex = -1;
    if (headers && Array.isArray(headers)) {
        nameColIndex = headers.findIndex(h => {
            if (!h) return false;
            const hStr = String(h).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return hStr.includes('nome') || hStr.includes('passageiro') || hStr.includes('name') || hStr.includes('passenger');
        });
    }
    // Se não achar, tenta o primeiro (melhor que nada)
    if (nameColIndex === -1) nameColIndex = 0;

    const dataRows = rawData.slice(headerRowIndex + 1).filter(r => r && r.length > 0);
    const totalRows = dataRows.length;

    const BATCH_SIZE = 5; // Process 5 rows at a time (Reduced to prevent Rate Limits)
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let allErrors = [];

    // Create event first if it's a new event
    let currentEventId = eventId;
    if (!currentEventId && eventData) {
        try {
            setProcessingStatus("Criando evento...");
            const createRes = await base44.functions.invoke("importEventData", {
                importMode: 'create_event_only',
                eventData
            });
            if (!createRes.data || !createRes.data.success) {
                throw new Error(createRes.data?.error || "Falha ao criar evento");
            }
            currentEventId = createRes.data.eventId;
        } catch (err) {
            toast({ title: "Erro", description: err.message, variant: "destructive" });
            setIsProcessingBatch(false);
            setIsSubmitting(false);
            return;
        }
    }

    // Process batches
    for (let i = 0; i < totalRows; i += BATCH_SIZE) {
        const batch = dataRows.slice(i, i + BATCH_SIZE);
        const currentBatchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalRows / BATCH_SIZE);
        
        // Cálculo do tempo estimado (1.5s de delay fixo + ~1s estimado de requisição = ~2.5s por lote)
        const remainingBatches = totalBatches - currentBatchNumber;
        const estimatedSecondsLeft = Math.ceil(remainingBatches * 2.5);
        const minutes = Math.floor(estimatedSecondsLeft / 60);
        const seconds = estimatedSecondsLeft % 60;
        const timeString = minutes > 0 ? `${minutes}min ${seconds}s` : `${seconds}s`;

        setProcessingStatus(`Lote ${currentBatchNumber}/${totalBatches} (${Math.min(i + BATCH_SIZE, totalRows)}/${totalRows} pax) • Restante: ~${timeString}`);
        setProgress(Math.round(((i) / totalRows) * 100));

        try {
            // Prepare payload with headers + batch data
            const payload = {
                importMode: 'append_batch',
                targetEventId: currentEventId,
                headers: headers,
                rowsData: batch,
                batchStartIndex: headerRowIndex + 2 + i // Excel Row Index (Header + 1 + Current Index + 1 for 1-based)
            };

            const response = await base44.functions.invoke("importEventData", payload);
            
            if (response.data && response.data.success) {
                createdCount += response.data.createdCount || 0;
                updatedCount += response.data.updatedCount || 0;
                skippedCount += response.data.skippedCount || 0;
                if (response.data.errors) {
                    allErrors = [...allErrors, ...response.data.errors];
                }
            } else {
                allErrors.push(`Erro no lote ${currentBatchNumber}: ${response.data?.error || "Falha desconhecida"}`);
            }
        } catch (err) {
            console.error(`Erro no lote ${currentBatchNumber}:`, err);

            // Extrair nomes dos passageiros afetados neste lote para facilitar correção
            const affectedNames = batch.map(row => {
                const name = row[nameColIndex];
                return name ? String(name).trim() : 'Sem Nome';
            }).filter(n => n !== 'Sem Nome').join(', ');

            const errorMessage = err.message || "Timeout ou falha de rede";
            allErrors.push(`FALHA NO LOTE ${currentBatchNumber} (${errorMessage}). Passageiros não importados: [${affectedNames || 'Nomes não identificados'}]. Verifique estas linhas na planilha.`);
        }

        // Larger delay to be gentle and avoid Rate Limits
        await new Promise(r => setTimeout(r, 1500));
    }

    setProgress(100);
    setProcessingStatus("Concluído!");
    
    // Finalize
    setImportResult({
        successCount: createdCount, 
        createdCount,
        updatedCount,
        skippedCount,
        totalRows,
        errors: allErrors,
        currentTotalCount: 0 // Will be populated if last batch response had it, but we can't easily get it from batched calls unless we store last response
    });

    // Hack: Se a última resposta tiver currentTotalCount, poderiamos usar.
    // Mas como é loop, só temos o acumulado.
    // O ideal é chamar loadData e pegar do evento.
    // Mas para garantir, podemos fazer uma chamada rápida para pegar o evento atualizado.
    try {
        const updatedEvent = await base44.entities.Event.get(currentEventId);
        setImportResult(prev => ({ ...prev, currentTotalCount: updatedEvent.passenger_count }));
    } catch (e) { console.error(e); }

    // Always show result dialog as requested
    setShowResultDialog(true);

    if (allErrors.length === 0 && skippedCount === 0) {
        toast({
            title: "Importação Concluída!",
            description: `${createdCount} novos, ${updatedCount} atualizados.`,
            className: "bg-green-50 border-green-200"
        });
    }

    // Reset UI (keep dialog open until user closes it via button in dialog)
    setShowNewEventDialog(false);
    setImportModalOpen(false);
    setNewEvent({
        event_name: "",
        event_type: "airport_arrivals",
        start_date: "",
        end_date: "",
        client_name: "",
        agency_name: "",
        requester_name: "",
        strict_vehicle_assignment: false,
        file: null
    });
    setImportFile(null);
    setSelectedEventForImport(null);
    setIsProcessingBatch(false);
    setIsSubmitting(false);
    loadData();
  };

  const handleCreateEvent = async () => {
    if (!newEvent.event_name || !newEvent.start_date) {
      toast({ title: "Campos obrigatórios", description: "Nome do evento e data de início são obrigatórios.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    const eventData = {
        event_name: newEvent.event_name,
        event_code: newEvent.event_code,
        event_type: newEvent.event_type,
        start_date: newEvent.start_date,
        end_date: newEvent.end_date || newEvent.start_date,
        client_name: newEvent.client_name,
        agency_name: newEvent.agency_name,
        requester_name: newEvent.requester_name,
        strict_vehicle_assignment: newEvent.strict_vehicle_assignment,
        supplier_id: currentUser.supplier_id || null,
        manager_user_id: currentUser.event_access_active ? currentUser.id : null
    };

    try {
      if (newEvent.file) {
          // Com arquivo: fluxo normal de criação + importação
          const rawData = await parseExcelFile(newEvent.file);
          await processBatchImport(rawData, null, eventData);
      } else {
          // Sem arquivo: apenas criar evento
          const response = await base44.functions.invoke("importEventData", {
              importMode: 'create_event_only',
              eventData
          });

          if (response.data && response.data.success) {
              toast({ 
                  title: "Evento criado!", 
                  description: "Evento criado com sucesso. Você pode importar a planilha de passageiros posteriormente.",
                  className: "bg-green-50 border-green-200"
              });
              setShowNewEventDialog(false);
              setNewEvent({
                  event_name: "",
                  event_code: "",
                  event_type: "airport_arrivals",
                  start_date: "",
                  end_date: "",
                  client_name: "",
                  agency_name: "",
                  requester_name: "",
                  strict_vehicle_assignment: false,
                  file: null
              });
              loadData();
          } else {
              throw new Error(response.data?.error || "Falha ao criar evento");
          }
      }
    } catch (error) {
      console.error("Erro:", error);
      toast({ title: "Erro ao criar evento", description: error.message, variant: "destructive" });
    } finally {
        if (!newEvent.file) setIsSubmitting(false); // Se tiver arquivo, processBatchImport gerencia o loading
    }
  };

  const handleAppendData = async () => {
    if (!importFile || !selectedEventForImport) return;

    setIsSubmitting(true);
    try {
      const rawData = await parseExcelFile(importFile);
      await processBatchImport(rawData, selectedEventForImport.id);
    } catch (error) {
      console.error("Erro na importação:", error);
      toast({ title: "Erro ao processar arquivo", description: error.message, variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (event) => {
      setEventToEdit({ ...event });
      setShowEditDialog(true);
  };

  const handleUpdateEvent = async () => {
      if (!eventToEdit) return;
      setIsSubmitting(true);
      try {
          await base44.entities.Event.update(eventToEdit.id, {
              event_name: eventToEdit.event_name,
              event_code: eventToEdit.event_code,
              event_type: eventToEdit.event_type,
              start_date: eventToEdit.start_date,
              end_date: eventToEdit.end_date,
              client_name: eventToEdit.client_name,
              agency_name: eventToEdit.agency_name,
              requester_name: eventToEdit.requester_name,
              strict_vehicle_assignment: eventToEdit.strict_vehicle_assignment
          });
          toast({ title: "Evento atualizado", description: "As informações foram salvas com sucesso.", className: "bg-green-50 border-green-200" });
          loadData();
          setShowEditDialog(false);
      } catch (error) {
          console.error("Erro ao atualizar:", error);
          toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      } finally {
          setIsSubmitting(false);
      }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Eventos</h1>
          <p className="text-gray-500">Gerencie chegadas em massa e logística de eventos</p>
        </div>
        <Button onClick={() => setShowNewEventDialog(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-5 h-5 mr-2" />
          Novo Evento
        </Button>
      </div>

      <div className="grid gap-6">
        {events.length === 0 ? (
          <Card className="text-center p-12">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold">Nenhum evento encontrado</h3>
              <p className="text-gray-500 max-w-sm">
                Crie seu primeiro evento importando uma planilha de passageiros para começar a organizar a logística.
              </p>
              <Button onClick={() => setShowNewEventDialog(true)} variant="outline">
                Criar Primeiro Evento
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Card key={event.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${event.event_type === 'airport_arrivals' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                      {event.event_type === 'airport_arrivals' ? (
                        <Plane className={`w-5 h-5 ${event.event_type === 'airport_arrivals' ? 'text-blue-600' : 'text-purple-600'}`} />
                      ) : (
                        <Truck className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                    {event.event_code && (
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
                            {event.event_code}
                        </span>
                    )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      event.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {event.status === 'active' ? 'Ativo' : 'Pendente'}
                    </span>
                  </div>
                  <CardTitle className="text-lg mt-3">{event.event_name}</CardTitle>
                  <CardDescription className="flex flex-col gap-1 mt-1">
                    <span className="flex items-center gap-1 text-xs">
                        <Calendar className="w-3 h-3" /> 
                        Início: {format(new Date(event.start_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                        {event.end_date && (
                             <> • Fim: {format(new Date(event.end_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}</>
                        )}
                    </span>
                    {[event.client_name, event.agency_name].filter(Boolean).length > 0 && (
                        <span className="text-xs font-medium text-gray-700">
                            {[event.client_name, event.agency_name].filter(Boolean).join(" • ")}
                        </span>
                    )}
                    {event.requester_name && (
                        <span className="text-xs text-gray-500">Solicitante: {event.requester_name}</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{event.passenger_count || 0} Passageiros importados</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Settings className="w-4 h-4" />
                      <span>Configurar Logística</span>
                    </div>
                    
                    <div className="grid gap-2 mt-2">
                        <Button 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                            onClick={() => navigate(createPageUrl('EventDetails') + `?id=${event.id}`)}
                        >
                            Gerenciar Painel <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>

                        <div className="grid grid-cols-5 gap-2">
                            <Button 
                                variant="outline"
                                className="text-blue-600 border-blue-200 hover:bg-blue-50 px-2"
                                onClick={() => handleEditClick(event)}
                                title="Editar Informações"
                            >
                                <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                                variant="outline"
                                className="text-green-700 border-green-200 hover:bg-green-50 px-2"
                                onClick={() => {
                                    setSelectedEventForImport(event);
                                    setImportModalOpen(true);
                                }}
                                title="Importar Dados"
                            >
                                <Upload className="w-4 h-4" />
                            </Button>
                            <Button 
                                variant="outline"
                                className="text-gray-700 border-gray-200 hover:bg-gray-50 px-2"
                                onClick={() => navigate(createPageUrl('EventDetails') + `?id=${event.id}&tab=reports`)}
                                title="Relatórios"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                            </Button>
                            <Button 
                                variant="outline"
                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2"
                                onClick={() => {
                                    setEventToClear(event);
                                    setShowClearDialog(true);
                                }}
                                title="Limpar Dados (Resetar)"
                            >
                                <Eraser className="w-4 h-4" />
                            </Button>
                            <Button 
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                                onClick={() => {
                                    setEventToDelete(event);
                                    setShowDeleteDialog(true);
                                }}
                                title="Excluir Evento"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showNewEventDialog} onOpenChange={setShowNewEventDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Novo Evento</DialogTitle>
            <DialogDescription>
              Preencha os detalhes do evento. A planilha de passageiros é opcional neste momento.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3 space-y-2">
                    <Label>Nome do Evento</Label>
                    <Input 
                        value={newEvent.event_name}
                        onChange={(e) => setNewEvent({...newEvent, event_name: e.target.value})}
                        placeholder="Ex: Congresso Nacional 2025"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Cód. Controle</Label>
                    <Input 
                        value={newEvent.event_code}
                        onChange={(e) => setNewEvent({...newEvent, event_code: e.target.value})}
                        placeholder="Ex: #001"
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input 
                  value={newEvent.client_name}
                  onChange={(e) => setNewEvent({...newEvent, client_name: e.target.value})}
                  placeholder="Nome do Cliente"
                />
              </div>
              <div className="space-y-2">
                <Label>Agência</Label>
                <Input 
                  value={newEvent.agency_name}
                  onChange={(e) => setNewEvent({...newEvent, agency_name: e.target.value})}
                  placeholder="Agência Responsável"
                />
              </div>
              <div className="space-y-2">
                <Label>Solicitante</Label>
                <Input 
                  value={newEvent.requester_name}
                  onChange={(e) => setNewEvent({...newEvent, requester_name: e.target.value})}
                  placeholder="Nome do Solicitante"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Evento</Label>
                <Select 
                  value={newEvent.event_type}
                  onValueChange={(val) => setNewEvent({...newEvent, event_type: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="airport_arrivals">Transfers Aeroporto</SelectItem>
                    <SelectItem value="door_to_door">Porta a Porta</SelectItem>
                    <SelectItem value="multi_segment">Múltiplos Segmentos (Misto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Início</Label>
                  <Input 
                    type="date"
                    value={newEvent.start_date}
                    onChange={(e) => setNewEvent({...newEvent, start_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Fim</Label>
                  <Input 
                    type="date"
                    value={newEvent.end_date}
                    onChange={(e) => setNewEvent({...newEvent, end_date: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {newEvent.event_type === 'door_to_door' && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 space-y-3">
                    <div className="flex items-center gap-2 text-amber-800 font-medium">
                        <ShieldCheck className="w-5 h-5" />
                        <span>Logística Interestadual (Regulamentada)</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <Label htmlFor="strict-mode" className="text-sm text-gray-700 font-normal">
                            Exigir embarque em veículo específico? (Lista de passageiros fixa)
                        </Label>
                        <Switch 
                            id="strict-mode"
                            checked={newEvent.strict_vehicle_assignment}
                            onCheckedChange={(checked) => setNewEvent({...newEvent, strict_vehicle_assignment: checked})}
                        />
                    </div>
                    <p className="text-xs text-amber-600">
                        Se ativado, cada passageiro será vinculado a um veículo específico (tipo Aeroporto), exigindo check-in no veículo correto. 
                        Desative para permitir que passageiros embarquem em qualquer veículo disponível (logística flexível).
                    </p>
                </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Planilha de Passageiros (Opcional)</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs text-blue-600 hover:text-blue-800"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Baixar Modelo
                </Button>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                />
                <label htmlFor="file-upload" className="cursor-pointer block">
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                    <FileSpreadsheet className="w-6 h-6 text-green-600" />
                  </div>
                  {newEvent.file ? (
                    <span className="text-sm font-medium text-green-700">{newEvent.file.name}</span>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-gray-900">Clique para selecionar</span>
                      <p className="text-xs text-gray-500 mt-1">Suporta arquivos .xlsx e .xls</p>
                    </>
                  )}
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * Use o modelo padrão para garantir a importação correta dos dados.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewEventDialog(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button onClick={handleCreateEvent} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  {newEvent.file ? <Upload className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  {newEvent.file ? "Criar e Importar" : "Criar Evento"}
                </>
              )}
            </Button>
            </DialogFooter>
            {isSubmitting && (
            <div className="px-6 pb-6 space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                    <span>{processingStatus}</span>
                    <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
            </div>
            )}
            </DialogContent>
            </Dialog>

            <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Importar Dados Adicionais</DialogTitle>
                            <DialogDescription>
                                Adicione passageiros ou atualize dados existentes para: <span className="font-bold text-gray-900">{selectedEventForImport?.event_name}</span>.
                                <br/><br/>
                                <span className="text-xs bg-yellow-100 text-yellow-800 p-1 rounded">
                                    Nota: O sistema atualizará passageiros existentes se encontrar o mesmo nome, data e tipo de viagem.
                                </span>
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <Label>Nova Planilha (Chegada, Saída ou Mista)</Label>
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 text-xs text-blue-600 hover:text-blue-800"
                                    onClick={handleDownloadTemplate}
                                  >
                                    <Download className="w-3 h-3 mr-1" />
                                    Baixar Modelo
                                  </Button>
                                </div>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                                    <input
                                    type="file"
                                    id="import-file-upload"
                                    className="hidden"
                                    accept=".xlsx, .xls"
                                    onChange={handleImportFileChange}
                                    />
                                    <label htmlFor="import-file-upload" className="cursor-pointer block">
                                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                                        <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                                    </div>
                                    {importFile ? (
                                        <span className="text-sm font-medium text-blue-700">{importFile.name}</span>
                                    ) : (
                                        <>
                                        <span className="text-sm font-medium text-gray-900">Clique para selecionar</span>
                                        <p className="text-xs text-gray-500 mt-1">.xlsx ou .xls</p>
                                        </>
                                    )}
                                    </label>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setImportModalOpen(false)} disabled={isSubmitting}>Cancelar</Button>
                            <Button onClick={handleAppendData} disabled={!importFile || isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                Importar Dados
                            </Button>
                        </DialogFooter>
                        {isSubmitting && (
                            <div className="px-6 pb-6 space-y-2">
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>{processingStatus}</span>
                                    <span>{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                            </div>
                        )}
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
                  <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-blue-600">
                              <FileSpreadsheet className="w-6 h-6" />
                              Resultado da Importação
                          </DialogTitle>
                          <DialogDescription>
                              Confira o resumo do processamento da planilha.
                          </DialogDescription>
                      </DialogHeader>

                      {importResult && (
                          <div className="space-y-6">
                              {/* Resumo Geral */}
                              <div className="bg-white border rounded-lg p-4 shadow-sm">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Resumo da Importação</h4>
                                  <div className="flex items-center justify-between text-sm">
                                      <div className="text-center px-4 border-r">
                                          <p className="text-gray-500">Total na Planilha</p>
                                          <p className="text-2xl font-bold text-gray-900">{importResult.totalRows}</p>
                                      </div>
                                      <div className="text-center px-4 border-r">
                                          <p className="text-green-600 font-medium">Processados</p>
                                          <p className="text-2xl font-bold text-green-700">{importResult.createdCount + importResult.updatedCount}</p>
                                          <div className="flex flex-col text-[10px] text-gray-500">
                                            <span>{importResult.createdCount} novos</span>
                                            <span>{importResult.updatedCount} atualizados (duplicados)</span>
                                          </div>
                                      </div>
                                      <div className="text-center px-4 border-l border-gray-100 bg-blue-50/50 rounded-r-lg">
                                          <p className="text-blue-600 font-medium">Total no Evento</p>
                                          <p className="text-2xl font-bold text-blue-700">
                                            {/* Usa o valor real do banco se disponível, senão fallback para estimativa */}
                                            {importResult.currentTotalCount || (importResult.createdCount + (events.find(e => e.id === selectedEventForImport?.id)?.passenger_count || 0))}
                                          </p>
                                          <p className="text-[10px] text-blue-400">Registros Únicos</p>
                                      </div>
                                      <div className="text-center px-4">
                                          <p className="text-red-600 font-medium">Falhas</p>
                                          <p className="text-2xl font-bold text-red-700">{importResult.errors.length}</p>
                                      </div>
                                  </div>
                              </div>

                              {/* Lista Detalhada de Erros */}
                              {importResult.errors.length > 0 ? (
                                  <div className="border rounded-lg border-red-200 overflow-hidden">
                                      <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex justify-between items-center">
                                          <h4 className="font-semibold text-sm text-red-800 flex items-center gap-2">
                                              <AlertTriangle className="w-4 h-4" />
                                              Passageiros com Erro ({importResult.errors.length})
                                          </h4>
                                          <span className="text-xs text-red-600">Necessário corrigir na planilha</span>
                                      </div>
                                      <div className="max-h-[300px] overflow-y-auto bg-white">
                                          {importResult.errors.map((error, idx) => (
                                              <div key={idx} className="p-3 border-b last:border-0 hover:bg-gray-50 flex gap-3 text-sm">
                                                  <span className="text-gray-400 font-mono text-xs w-6 mt-0.5">{idx + 1}.</span>
                                                  <span className="text-gray-700">{error}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              ) : (
                                  <div className="bg-green-50 p-4 rounded-lg flex items-center gap-3 text-green-800">
                                      <CheckCircle className="w-5 h-5" />
                                      <span className="font-medium">Nenhum erro encontrado! Todos os passageiros foram processados.</span>
                                  </div>
                              )}
                          </div>
                      )}

                      <DialogFooter>
                          <Button onClick={() => setShowResultDialog(false)}>Fechar</Button>
                      </DialogFooter>
                  </DialogContent>
                  </Dialog>

                  <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle>Excluir Evento</DialogTitle>
                          <DialogDescription>
                              Tem certeza que deseja excluir o evento "{eventToDelete?.event_name}"? 
                              <br/><br/>
                              <span className="font-bold text-red-600">Atenção:</span> Esta ação não pode ser desfeita. Todos os dados associados a este evento (passageiros, viagens) podem ser perdidos.
                          </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                          <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isSubmitting}>Cancelar</Button>
                          <Button 
                              variant="destructive" 
                              onClick={handleDeleteEvent}
                              disabled={isSubmitting}
                              className="bg-red-600 hover:bg-red-700"
                          >
                              {isSubmitting ? (
                                  <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Excluindo...
                                  </>
                              ) : (
                                  "Sim, excluir evento"
                              )}
                          </Button>
                      </DialogFooter>
                  </DialogContent>
                  </Dialog>

                  <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle>Limpar Dados do Evento</DialogTitle>
                          <DialogDescription>
                              Tem certeza que deseja limpar todos os dados importados do evento "{eventToClear?.event_name}"?
                              <br/><br/>
                              Isso irá <b>excluir permanentemente</b>:
                              <ul className="list-disc pl-5 mt-2 mb-2">
                                  <li>Todos os passageiros importados</li>
                                  <li>Todas as viagens geradas</li>
                                  <li>Status e confirmações</li>
                              </ul>
                              <span className="text-amber-600 font-medium">O evento em si (nome, datas, configurações) será mantido, permitindo uma nova importação limpa.</span>
                          </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                          <Button variant="outline" onClick={() => setShowClearDialog(false)} disabled={isSubmitting}>Cancelar</Button>
                          <Button 
                              variant="default" 
                              onClick={handleClearEventData}
                              disabled={isSubmitting}
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                          >
                              {isSubmitting ? (
                                  <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Limpando...
                                  </>
                              ) : (
                                  <>
                                      <Eraser className="w-4 h-4 mr-2" />
                                      Sim, limpar dados
                                  </>
                              )}
                          </Button>
                      </DialogFooter>
                  </DialogContent>
                  </Dialog>

                  <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                      <DialogContent className="sm:max-w-[600px]">
                          <DialogHeader>
                              <DialogTitle>Editar Evento</DialogTitle>
                              <DialogDescription>
                                  Atualize as informações principais do evento.
                              </DialogDescription>
                          </DialogHeader>
                          
                          {eventToEdit && (
                              <div className="space-y-6 py-4">
                                  <div className="grid grid-cols-4 gap-4">
                                      <div className="col-span-3 space-y-2">
                                          <Label>Nome do Evento</Label>
                                          <Input 
                                              value={eventToEdit.event_name}
                                              onChange={(e) => setEventToEdit({...eventToEdit, event_name: e.target.value})}
                                          />
                                      </div>
                                      <div className="space-y-2">
                                          <Label>Cód. Controle</Label>
                                          <Input 
                                              value={eventToEdit.event_code || ''}
                                              onChange={(e) => setEventToEdit({...eventToEdit, event_code: e.target.value})}
                                              placeholder="Ex: #001"
                                          />
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-4">
                                      <div className="space-y-2">
                                          <Label>Cliente</Label>
                                          <Input 
                                              value={eventToEdit.client_name || ''}
                                              onChange={(e) => setEventToEdit({...eventToEdit, client_name: e.target.value})}
                                              placeholder="Nome do Cliente"
                                          />
                                      </div>
                                      <div className="space-y-2">
                                          <Label>Agência</Label>
                                          <Input 
                                              value={eventToEdit.agency_name || ''}
                                              onChange={(e) => setEventToEdit({...eventToEdit, agency_name: e.target.value})}
                                              placeholder="Agência Responsável"
                                          />
                                      </div>
                                      <div className="space-y-2">
                                          <Label>Solicitante</Label>
                                          <Input 
                                              value={eventToEdit.requester_name || ''}
                                              onChange={(e) => setEventToEdit({...eventToEdit, requester_name: e.target.value})}
                                              placeholder="Nome do Solicitante"
                                          />
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                          <Label>Tipo de Evento</Label>
                                          <Select 
                                              value={eventToEdit.event_type}
                                              onValueChange={(val) => setEventToEdit({...eventToEdit, event_type: val})}
                                          >
                                              <SelectTrigger>
                                                  <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                  <SelectItem value="airport_arrivals">Transfers Aeroporto</SelectItem>
                                                  <SelectItem value="door_to_door">Porta a Porta</SelectItem>
                                                  <SelectItem value="multi_segment">Múltiplos Segmentos</SelectItem>
                                              </SelectContent>
                                          </Select>
                                      </div>
                                      <div className="space-y-2">
                                          <div className="grid grid-cols-2 gap-2">
                                              <div>
                                                  <Label>Início</Label>
                                                  <Input 
                                                      type="date"
                                                      value={eventToEdit.start_date}
                                                      onChange={(e) => setEventToEdit({...eventToEdit, start_date: e.target.value})}
                                                  />
                                              </div>
                                              <div>
                                                  <Label>Fim</Label>
                                                  <Input 
                                                      type="date"
                                                      value={eventToEdit.end_date || ''}
                                                      onChange={(e) => setEventToEdit({...eventToEdit, end_date: e.target.value})}
                                                  />
                                              </div>
                                          </div>
                                      </div>
                                  </div>

                                  {eventToEdit.event_type === 'door_to_door' && (
                                      <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 space-y-3">
                                          <div className="flex items-center gap-2 text-amber-800 font-medium">
                                              <ShieldCheck className="w-5 h-5" />
                                              <span>Logística Interestadual</span>
                                          </div>
                                          
                                          <div className="flex items-center justify-between">
                                              <Label htmlFor="edit-strict-mode" className="text-sm text-gray-700 font-normal">
                                                  Exigir embarque em veículo específico?
                                              </Label>
                                              <Switch 
                                                  id="edit-strict-mode"
                                                  checked={eventToEdit.strict_vehicle_assignment}
                                                  onCheckedChange={(checked) => setEventToEdit({...eventToEdit, strict_vehicle_assignment: checked})}
                                              />
                                          </div>
                                      </div>
                                  )}
                              </div>
                          )}

                          <DialogFooter>
                              <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={isSubmitting}>Cancelar</Button>
                              <Button onClick={handleUpdateEvent} disabled={isSubmitting}>
                                  {isSubmitting ? (
                                      <>
                                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                          Salvando...
                                      </>
                                  ) : (
                                      "Salvar Alterações"
                                  )}
                              </Button>
                          </DialogFooter>
                      </DialogContent>
                  </Dialog>
                  </div>
                  );
                  }