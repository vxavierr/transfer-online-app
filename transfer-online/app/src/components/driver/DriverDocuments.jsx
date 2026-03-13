import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Loader2,
  FileText,
  AlertCircle,
  CheckCircle,
  Upload,
  XCircle,
  Car,
  IdCard,
  AlertTriangle,
  Lock,
  Download
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLocation } from 'react-router-dom';

export default function DriverDocuments({ user }) {
  const location = useLocation();
  const [driver, setDriver] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadingRegistration, setUploadingRegistration] = useState(null);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ model: '', plate: '', color: '', documentUrl: '', expiryDate: '' });
  const [uploadingNewVehicleDoc, setUploadingNewVehicleDoc] = useState(false);
  
  // State for updating existing vehicle registration
  const [showUpdateRegistrationDialog, setShowUpdateRegistrationDialog] = useState(false);
  const [pendingRegistrationUpdate, setPendingRegistrationUpdate] = useState(null);
  const [manualExpiryDate, setManualExpiryDate] = useState('');

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchDriver = async () => {
      if (user?.driver_id) {
        try {
          const driverData = await base44.entities.Driver.get(user.driver_id);
          setDriver(driverData);
        } catch (err) {
          console.error("Erro ao buscar motorista:", err);
        }
      }
    };
    fetchDriver();
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'add_vehicle') {
      setShowAddVehicle(true);
    }
  }, [location.search]);

  const { data: vehicles = [] } = useQuery({
    queryKey: ['driverVehicles', driver?.id],
    queryFn: () => base44.entities.DriverVehicle.filter({ driver_id: driver.id }),
    enabled: !!driver,
    initialData: []
  });

  const updateLicenseMutation = useMutation({
    mutationFn: async ({ documentUrl, expiryDate, licenseNumber, category, name }) => {
      const updateData = {
        license_document_url: documentUrl,
        license_expiry: expiryDate,
        license_uploaded_at: new Date().toISOString(),
        license_blocked: false,
        license_alert_sent: false
      };

      if (licenseNumber) updateData.license_number = licenseNumber;
      // Se houver categoria e nome extraídos, podemos salvar também se o banco suportar ou se quisermos atualizar
      // O schema Driver tem 'name', mas talvez não queiramos sobrescrever o nome completo sem confirmação.
      // Mas license_number é seguro.
      
      return await base44.entities.Driver.update(driver.id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverVehicles'] });
      // Também invalidar o motorista para atualizar a UI local
      setDriver(prev => ({ ...prev, license_uploaded_at: new Date().toISOString() })); // Otimista, mas ideal é refetch
      base44.entities.Driver.get(driver.id).then(setDriver);
      setSuccess('CNH atualizada com sucesso!');
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (error) => {
      setError('Erro ao atualizar CNH: ' + error.message);
    }
  });

  const updateRegistrationMutation = useMutation({
    mutationFn: async ({ vehicleId, documentUrl, expiryDate, plate, model }) => {
      const updateData = {
        registration_document_url: documentUrl,
        registration_expiry: expiryDate,
        registration_uploaded_at: new Date().toISOString(),
        registration_blocked: false,
        registration_alert_sent: false
      };

      if (plate) updateData.vehicle_plate = plate;
      if (model) updateData.vehicle_model = model;

      return await base44.entities.DriverVehicle.update(vehicleId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverVehicles'] });
      setSuccess('Licenciamento atualizado com sucesso!');
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (error) => {
      setError('Erro ao atualizar licenciamento: ' + error.message);
    }
  });

  const createVehicleMutation = useMutation({
    mutationFn: async (data) => {
      const vehicleData = {
        driver_id: driver.id,
        vehicle_model: data.model,
        vehicle_plate: data.plate.toUpperCase(),
        vehicle_color: data.color,
        active: true,
        is_default: vehicles.length === 0,
        registration_blocked: !data.documentUrl
      };

      if (data.documentUrl) {
        vehicleData.registration_document_url = data.documentUrl;
        vehicleData.registration_expiry = data.expiryDate;
        vehicleData.registration_uploaded_at = new Date().toISOString();
        vehicleData.registration_blocked = false;
      }

      return await base44.entities.DriverVehicle.create(vehicleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverVehicles'] });
      setSuccess('Veículo adicionado com sucesso!');
      setShowAddVehicle(false);
      setNewVehicle({ model: '', plate: '', color: '', documentUrl: '', expiryDate: '' });
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (error) => {
      setError('Erro ao adicionar veículo: ' + error.message);
    }
  });

  const handleAddVehicle = () => {
    if (!newVehicle.model || !newVehicle.plate) {
      setError('Preencha Modelo e Placa');
      return;
    }
    createVehicleMutation.mutate(newVehicle);
  };

  const handleNewVehicleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingNewVehicleDoc(true);
    setError('');

    try {
      // 1. Upload File
      const response = await base44.integrations.Core.UploadFile({ file });
      const docUrl = response.file_url;

      // 2. Verify with AI
      try {
        const verifyRes = await base44.functions.invoke('verifyDocumentWithAI', {
          file_url: docUrl,
          document_type: 'crlv'
        });

        if (verifyRes?.data) {
           const { isValid, message, extractedData } = verifyRes.data;
           // Ignoring expiryDate from AI as requested
           
           let plate = extractedData?.license_plate || '';
           let model = extractedData?.vehicle_model || '';
           let color = extractedData?.vehicle_color || ''; 

           setNewVehicle(prev => ({
               ...prev,
               model: model || prev.model,
               plate: plate || prev.plate,
               color: color || prev.color,
               documentUrl: docUrl,
               // expiryDate kept as is (empty or manually set)
           }));
           
           setSuccess('Informações extraídas do documento! Por favor, preencha a data de vencimento.');
        }
      } catch (aiError) {
        console.warn('Erro na verificação por IA:', aiError);
        setError('Não foi possível ler os dados automaticamente. Por favor, preencha manualmente.');
        // Ainda salvamos a URL do documento para não precisar reenviar
        setNewVehicle(prev => ({ ...prev, documentUrl: docUrl }));
      }
    } catch (error) {
      setError('Erro ao fazer upload: ' + error.message);
    } finally {
      setUploadingNewVehicleDoc(false);
    }
  };

  const handleLicenseUpload = async (e, expiryDate) => {
    const file = e.target.files[0];
    if (!file) return;

    // Permitir upload sem data se for para a IA preencher
    setUploadingLicense(true);
    setError('');

    try {
      // 1. Upload File
      const response = await base44.integrations.Core.UploadFile({ file });
      
      let licenseNumber = null;
      let category = null;
      let driverName = null;

      // 2. Verify with AI
      try {
        const verifyRes = await base44.functions.invoke('verifyDocumentWithAI', {
          file_url: response.file_url,
          document_type: 'cnh'
        });

        if (verifyRes?.data) {
          const { isValid, message, expiryDate: aiExpiryDate, extractedData } = verifyRes.data;
          
          if (!isValid && !extractedData?.is_legible) {
             throw new Error(message || "Documento ilegível");
          }

          // Preenchimento de campos faltantes
          if (extractedData) {
             if (extractedData.cnh_number) licenseNumber = extractedData.cnh_number;
             if (extractedData.category) category = extractedData.category;
             if (extractedData.driver_name) driverName = extractedData.driver_name;
          }
          
          // Se a AI extraiu uma data válida e diferente, usamos ela
          if (aiExpiryDate) {
             if (new Date(aiExpiryDate).toString() !== 'Invalid Date') {
                expiryDate = aiExpiryDate;
             }
          }
          
          let successMsg = "Documento analisado com sucesso.";
          if (licenseNumber && (!driver.license_number || driver.license_number !== licenseNumber)) {
             successMsg += " Número da CNH preenchido automaticamente.";
          }
          if (expiryDate) {
             successMsg += ` Validade: ${format(new Date(expiryDate), 'dd/MM/yyyy')}.`;
          }
          setSuccess(successMsg);
        }
      } catch (aiError) {
        console.warn('Erro na verificação por IA:', aiError);
        // Se a IA falhar e não tivermos data manual, aí sim erro
        if (!expiryDate) {
           throw new Error("Não foi possível ler a data de validade automaticamente. Por favor, preencha manualmente antes de enviar.");
        }
      }

      await updateLicenseMutation.mutateAsync({
        documentUrl: response.file_url,
        expiryDate,
        licenseNumber,
        category,
        name: driverName
      });
    } catch (error) {
      setError('Erro ao fazer upload: ' + error.message);
    } finally {
      setUploadingLicense(false);
    }
  };

  const handleRegistrationUpload = async (e, vehicleId, expiryDate) => {
    const file = e.target.files[0];
    if (!file) return;

    // Permitir upload sem data se for para a IA preencher
    setUploadingRegistration(vehicleId);
    setError('');

    try {
      const response = await base44.integrations.Core.UploadFile({ file });

      let plate = null;
      let model = null;

      // AI Verification
      try {
        const verifyRes = await base44.functions.invoke('verifyDocumentWithAI', {
          file_url: response.file_url,
          document_type: 'crlv'
        });

        if (verifyRes?.data) {
           const { isValid, message, expiryDate: aiExpiryDate, extractedData } = verifyRes.data;
           if (!isValid && !extractedData?.is_legible) {
              throw new Error(message || "Documento ilegível");
           }

           if (extractedData) {
              if (extractedData.license_plate) plate = extractedData.license_plate;
              if (extractedData.vehicle_model) model = extractedData.vehicle_model;
           }

           // IGNORING AI EXPIRY DATE AS REQUESTED
           // A data de vencimento deve ser preenchida manualmente pelo usuário

           let successMsg = "Documento analisado com sucesso. Por favor, informe a data de vencimento.";
           if (plate) successMsg += " Placa identificada.";
           
           setSuccess(successMsg);
        }
      } catch (aiError) {
        if (aiError.message && aiError.message.includes('ilegível')) {
           throw aiError; // Repassa erro de legibilidade
        }
        console.warn('Erro na verificação por IA:', aiError);
      }

      // Open dialog to confirm/enter expiry date
      setPendingRegistrationUpdate({
        vehicleId,
        documentUrl: response.file_url,
        plate,
        model
      });
      setManualExpiryDate(''); // Clear previous
      setShowUpdateRegistrationDialog(true);

    } catch (error) {
      setError('Erro ao fazer upload: ' + error.message);
    } finally {
      setUploadingRegistration(null);
    }
  };

  const handleConfirmRegistrationUpdate = () => {
    if (!manualExpiryDate) {
      setError('Por favor, informe a data de vencimento do licenciamento.');
      return;
    }

    if (!pendingRegistrationUpdate) return;

    updateRegistrationMutation.mutate({
      vehicleId: pendingRegistrationUpdate.vehicleId,
      documentUrl: pendingRegistrationUpdate.documentUrl,
      expiryDate: manualExpiryDate,
      plate: pendingRegistrationUpdate.plate,
      model: pendingRegistrationUpdate.model
    });

    setShowUpdateRegistrationDialog(false);
    setPendingRegistrationUpdate(null);
    setManualExpiryDate('');
  };

  const getDocumentStatus = (expiryDate, isBlocked) => {
    if (isBlocked) {
      return { status: 'blocked', label: 'BLOQUEADO', color: 'bg-red-600 text-white', icon: Lock };
    }
    
    if (!expiryDate) {
      return { status: 'missing', label: 'Pendente', color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
    }

    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = differenceInDays(expiry, today);

    if (daysUntilExpiry < 0) {
      return { status: 'expired', label: 'VENCIDO', color: 'bg-red-600 text-white', icon: XCircle };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', label: `Vence em ${daysUntilExpiry} dias`, color: 'bg-yellow-500 text-white', icon: AlertTriangle };
    } else {
      return { status: 'valid', label: 'Válido', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }
  };

  if (!driver) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const licenseStatus = getDocumentStatus(driver?.license_expiry, driver?.license_blocked);
  const hasAnyBlockedDocument = driver?.license_blocked || vehicles.some(v => v.registration_blocked);

  return (
    <div className="space-y-6">
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {hasAnyBlockedDocument && (
        <Alert variant="destructive" className="border-4">
          <Lock className="h-5 w-5" />
          <AlertDescription className="text-base font-bold">
            🚨 ATENÇÃO: Você possui documentos vencidos! Você está BLOQUEADO para novas viagens até regularizar sua documentação.
          </AlertDescription>
        </Alert>
      )}

      {/* CNH - Carteira Nacional de Habilitação */}
      <Card className={`${licenseStatus.status === 'blocked' || licenseStatus.status === 'expired' ? 'border-4 border-red-600' : ''}`}>
        <CardHeader className={licenseStatus.status === 'expiring' ? 'bg-yellow-50' : ''}>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IdCard className="w-6 h-6 text-blue-600" />
              CNH - Carteira Nacional de Habilitação
            </div>
            <Badge className={`${licenseStatus.color} flex items-center gap-1`}>
              {React.createElement(licenseStatus.icon, { className: 'w-4 h-4' })}
              {licenseStatus.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {driver?.license_number && (
            <div>
              <Label className="text-sm text-gray-600">Número da CNH</Label>
              <p className="font-mono font-bold text-lg">{driver.license_number}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="license_expiry">Data de Vencimento *</Label>
              <Input
                id="license_expiry"
                type="date"
                value={driver?.license_expiry || ''}
                disabled={true}
                className="mt-1 bg-gray-100 cursor-not-allowed"
                title="A data é atualizada automaticamente ao enviar o documento"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Atualizado automaticamente via upload do documento
              </p>
              {driver?.license_expiry && (
                <p className="text-xs text-gray-500 mt-1">
                  Vencimento: {format(new Date(driver.license_expiry), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              )}
            </div>

            <div>
              <Label>Documento Digitalizado</Label>
              {driver?.license_document_url ? (
                <div className="mt-1 space-y-2">
                  <a
                    href={driver.license_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Ver documento atual
                  </a>
                  {driver.license_uploaded_at && (
                    <p className="text-xs text-gray-500">
                      Enviado em: {format(new Date(driver.license_uploaded_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-1">Nenhum documento enviado</p>
              )}
            </div>
          </div>

          <div>
            <Label>Upload de Novo Documento</Label>
            <div className="mt-2">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {uploadingLicense ? (
                    <>
                      <Loader2 className="w-8 h-8 mb-2 text-gray-500 animate-spin" />
                      <p className="text-sm text-gray-500">Enviando documento...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mb-2 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Clique para enviar</span> CNH atualizada
                      </p>
                      <p className="text-xs text-gray-500">PDF, PNG, JPG até 10MB</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={(e) => handleLicenseUpload(e, driver?.license_expiry)}
                  disabled={uploadingLicense}
                />
              </label>
            </div>
          </div>

          {licenseStatus.status === 'expiring' && (
            <Alert className="bg-yellow-50 border-yellow-300">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <AlertDescription className="text-yellow-900 font-medium">
                ⚠️ Sua CNH vence em breve! Faça o upload do documento renovado o quanto antes para evitar bloqueio.
              </AlertDescription>
            </Alert>
          )}

          {(licenseStatus.status === 'expired' || licenseStatus.status === 'blocked') && (
            <Alert variant="destructive" className="border-4">
              <Lock className="h-5 w-5" />
              <AlertDescription className="font-bold text-base">
                🚨 SUA CNH ESTÁ VENCIDA! Você está BLOQUEADO para novas viagens. Atualize o documento imediatamente.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Licenciamento dos Veículos */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Car className="w-7 h-7 text-purple-600" />
            Licenciamento dos Veículos
          </h2>
          <Button onClick={() => setShowAddVehicle(true)} className="bg-purple-600 hover:bg-purple-700">
            Adicionar Veículo
          </Button>
        </div>

        {vehicles.length === 0 ? (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 flex flex-col gap-2">
              <span>Você ainda não possui veículos cadastrados.</span>
              <Button 
                variant="outline" 
                className="w-fit text-blue-700 border-blue-300 hover:bg-blue-100"
                onClick={() => setShowAddVehicle(true)}
              >
                Cadastrar Meu Primeiro Veículo
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          vehicles.map((vehicle) => {
            const regStatus = getDocumentStatus(vehicle.registration_expiry, vehicle.registration_blocked);
            
            return (
              <Card key={vehicle.id} className={`${regStatus.status === 'blocked' || regStatus.status === 'expired' ? 'border-4 border-red-600' : ''}`}>
                <CardHeader className={regStatus.status === 'expiring' ? 'bg-yellow-50' : ''}>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Car className="w-5 h-5 text-purple-600" />
                      <div>
                        <div className="text-lg">{vehicle.vehicle_model}</div>
                        <div className="text-sm font-mono text-gray-600">{vehicle.vehicle_plate}</div>
                      </div>
                    </div>
                    <Badge className={`${regStatus.color} flex items-center gap-1`}>
                      {React.createElement(regStatus.icon, { className: 'w-4 h-4' })}
                      {regStatus.label}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`reg_expiry_${vehicle.id}`}>Data de Vencimento do Licenciamento *</Label>
                      <Input
                        id={`reg_expiry_${vehicle.id}`}
                        type="date"
                        value={vehicle.registration_expiry || ''}
                        disabled={true}
                        className="mt-1 bg-gray-100 cursor-not-allowed"
                        title="A data é atualizada automaticamente ao enviar o documento"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">
                        Atualizado automaticamente via upload do documento
                      </p>
                      {vehicle.registration_expiry && (
                        <p className="text-xs text-gray-500 mt-1">
                          Vencimento: {format(new Date(vehicle.registration_expiry), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>Documento Atual</Label>
                      {vehicle.registration_document_url ? (
                        <div className="mt-1 space-y-2">
                          <a
                            href={vehicle.registration_document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                          >
                            <Download className="w-4 h-4" />
                            Ver documento atual
                          </a>
                          {vehicle.registration_uploaded_at && (
                            <p className="text-xs text-gray-500">
                              Enviado em: {format(new Date(vehicle.registration_uploaded_at), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 mt-1">Nenhum documento enviado</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Upload de Novo Licenciamento</Label>
                    <div className="mt-2">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {uploadingRegistration === vehicle.id ? (
                            <>
                              <Loader2 className="w-8 h-8 mb-2 text-gray-500 animate-spin" />
                              <p className="text-sm text-gray-500">Enviando documento...</p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 mb-2 text-gray-500" />
                              <p className="mb-2 text-sm text-gray-500">
                                <span className="font-semibold">Clique para enviar</span> licenciamento
                              </p>
                              <p className="text-xs text-gray-500">PDF, PNG, JPG até 10MB</p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,.pdf"
                          onChange={(e) => handleRegistrationUpload(e, vehicle.id, vehicle.registration_expiry)}
                          disabled={uploadingRegistration === vehicle.id}
                        />
                      </label>
                    </div>
                  </div>

                  {regStatus.status === 'expiring' && (
                    <Alert className="bg-yellow-50 border-yellow-300">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <AlertDescription className="text-yellow-900 font-medium">
                        ⚠️ O licenciamento deste veículo vence em breve! Faça o upload do documento renovado.
                      </AlertDescription>
                    </Alert>
                  )}

                  {(regStatus.status === 'expired' || regStatus.status === 'blocked') && (
                    <Alert variant="destructive" className="border-4">
                      <Lock className="h-5 w-5" />
                      <AlertDescription className="font-bold text-base">
                        🚨 LICENCIAMENTO VENCIDO! Este veículo está BLOQUEADO. Atualize o documento imediatamente.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Informações e Ajuda */}
      <Card className="mt-8 bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Informações Importantes
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-bold">📅</span>
              <span>Você receberá alertas <strong>30 dias antes</strong> do vencimento de qualquer documento.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">🚨</span>
              <span>Documentos vencidos resultam em <strong>bloqueio automático</strong> até regularização.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">✅</span>
              <span>Após enviar o documento renovado, o bloqueio é <strong>removido automaticamente</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">📄</span>
              <span>Aceito formatos: <strong>PDF, PNG, JPG</strong> (máximo 10MB por arquivo).</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Dialog open={showAddVehicle} onOpenChange={setShowAddVehicle}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Veículo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Upload Area for New Vehicle */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <Label className="text-blue-900 font-bold mb-2 block">1. Upload do Documento (CRLV)</Label>
              <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-blue-50 transition-colors ${uploadingNewVehicleDoc ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex flex-col items-center justify-center pt-2 pb-3">
                  {uploadingNewVehicleDoc ? (
                    <>
                      <Loader2 className="w-6 h-6 mb-1 text-blue-600 animate-spin" />
                      <p className="text-xs text-blue-600">Analisando documento com IA...</p>
                    </>
                  ) : newVehicle.documentUrl ? (
                    <>
                      <CheckCircle className="w-6 h-6 mb-1 text-green-600" />
                      <p className="text-xs text-green-700 font-bold">Documento Carregado!</p>
                      <p className="text-[10px] text-gray-500">Clique para substituir</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 mb-1 text-blue-500" />
                      <p className="text-xs text-blue-700 font-semibold">Clique para enviar CRLV</p>
                      <p className="text-[10px] text-blue-500">Preenchimento automático</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={handleNewVehicleDocUpload}
                  disabled={uploadingNewVehicleDoc}
                />
              </label>
            </div>

            <div className="space-y-2">
              <Label>Data de Vencimento do Licenciamento *</Label>
              <Input 
                type="date"
                value={newVehicle.expiryDate}
                onChange={e => setNewVehicle({...newVehicle, expiryDate: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Modelo do Veículo *</Label>
              <Input 
                placeholder="Ex: Toyota Corolla 2023" 
                value={newVehicle.model}
                onChange={e => setNewVehicle({...newVehicle, model: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Placa *</Label>
              <Input 
                placeholder="ABC-1234" 
                className="uppercase"
                value={newVehicle.plate}
                onChange={e => setNewVehicle({...newVehicle, plate: e.target.value.toUpperCase()})}
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <Input 
                placeholder="Ex: Preto" 
                value={newVehicle.color}
                onChange={e => setNewVehicle({...newVehicle, color: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddVehicle(false)}>Cancelar</Button>
            <Button 
              onClick={handleAddVehicle} 
              disabled={createVehicleMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createVehicleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para confirmar atualização de licenciamento existente */}
      <Dialog open={showUpdateRegistrationDialog} onOpenChange={setShowUpdateRegistrationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Licenciamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert className="bg-blue-50 border-blue-200">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Documento enviado com sucesso! Por favor, confirme a data de vencimento.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label>Data de Vencimento do Licenciamento *</Label>
              <Input 
                type="date"
                value={manualExpiryDate}
                onChange={e => setManualExpiryDate(e.target.value)}
              />
              <p className="text-xs text-gray-500">Informe a data de validade que consta no documento (CRLV).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateRegistrationDialog(false)}>Cancelar</Button>
            <Button 
              onClick={handleConfirmRegistrationUpdate}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Salvar e Atualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}