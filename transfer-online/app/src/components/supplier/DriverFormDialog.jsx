import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Users, Check, AlertCircle, IdCard, Loader2, Briefcase, CheckCircle } from 'lucide-react';
import PhoneInputWithCountry from '@/components/ui/PhoneInputWithCountry';
import VehicleManager from './VehicleManager';

export default function DriverFormDialog({ open, onClose, driver, supplierId }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [isProcessingCNH, setIsProcessingCNH] = useState(false);
  const [driverPhotoFile, setDriverPhotoFile] = useState(null);
  const [cnhDocumentFile, setCnhDocumentFile] = useState(null);
  const [asoFile, setAsoFile] = useState(null);
  const [pgrFile, setPgrFile] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    email: '',
    photo_url: '',
    document_id: '',
    license_number: '',
    license_expiry: '',
    license_document_url: '',
    points_on_license: 0,
    cnh_status: 'active',
    languages: ['pt'],
    notes: '',
    active: true,
    driver_email_by_manager: '',
    driver_phone_by_manager: '',
    aso_document_url: '',
    pgr_document_url: ''
  });

  useEffect(() => {
    if (open) {
      setFormError('');
      setSuccess('');
      setDriverPhotoFile(null);
      setCnhDocumentFile(null);
      setAsoFile(null);
      setPgrFile(null);
      
      if (driver) {
        setFormData({
          name: driver.name || '',
          phone_number: driver.phone_number || '',
          email: driver.email || '',
          photo_url: driver.photo_url || '',
          document_id: driver.document_id || '',
          license_number: driver.license_number || '',
          license_expiry: driver.license_expiry || '',
          license_document_url: driver.license_document_url || '',
          points_on_license: driver.points_on_license || 0,
          cnh_status: driver.cnh_status || 'active',
          languages: driver.languages || ['pt'],
          notes: driver.notes || '',
          active: driver.active,
          driver_email_by_manager: driver.driver_email_by_manager || '',
          driver_phone_by_manager: driver.driver_phone_by_manager || '',
          aso_document_url: driver.aso_document_url || '',
          pgr_document_url: driver.pgr_document_url || ''
        });
      } else {
        setFormData({
          name: '',
          phone_number: '',
          email: '',
          photo_url: '',
          document_id: '',
          license_number: '',
          license_expiry: '',
          license_document_url: '',
          points_on_license: 0,
          cnh_status: 'active',
          languages: ['pt'],
          notes: '',
          active: true,
          driver_email_by_manager: '',
          driver_phone_by_manager: '',
          aso_document_url: '',
          pgr_document_url: ''
        });
      }
    }
  }, [open, driver]);

  const handleFileUpload = async (file) => {
    if (!file) return null;
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      return response.file_url;
    } catch (error) {
      throw new Error("Falha no upload: " + error.message);
    }
  };

  const handleCNHUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCnhDocumentFile(file);
    setIsProcessingCNH(true);
    setFormError('');

    try {
      // 1. Upload
      const url = await handleFileUpload(file);
      if (!url) throw new Error("Falha no upload");

      setFormData(prev => ({
        ...prev,
        license_document_url: url
      }));

      // 2. Extrair dados
      const extractionRes = await base44.functions.invoke('extractCNHData', {
        file_url: url
      });

      if (extractionRes?.data?.success && extractionRes.data.data) {
        const extracted = extractionRes.data.data;
        setFormData(prev => ({
          ...prev,
          cnh_extracted_data: extracted,
          name: extracted.nome_completo || prev.name,
          license_number: extracted.numero_registro || prev.license_number,
          license_expiry: extracted.data_validade || prev.license_expiry,
          document_id: extracted.cpf || prev.document_id,
          cnh_status: 'active'
        }));
        setSuccess("Dados da CNH lidos e preenchidos automaticamente!");
        setTimeout(() => setSuccess(''), 3000);
      } else {
        // Fallback legacy
        const verifyRes = await base44.functions.invoke('verifyDocumentWithAI', {
          file_url: url,
          document_type: 'cnh'
        });
        
        if (verifyRes?.data) {
          const { isValid, expiryDate, extractedData } = verifyRes.data;
          setFormData(prev => ({
            ...prev,
            license_expiry: expiryDate || prev.license_expiry,
            license_number: extractedData?.cnh_number || prev.license_number
          }));
          
          if (!isValid && !extractedData?.is_legible) {
             setFormError("Atenção: CNH pode estar ilegível.");
          } else {
             setSuccess("Dados da CNH lidos automaticamente!");
             setTimeout(() => setSuccess(''), 3000);
          }
        }
      }
    } catch (error) {
      console.error("Erro CNH:", error);
      setFormError("Erro ao processar a CNH automaticamente. Preencha manualmente.");
    } finally {
      setIsProcessingCNH(false);
    }
  };

  const createDriverMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Driver.create({ 
        ...data,
        points_on_license: parseInt(data.points_on_license) || 0,
        last_points_update_date: new Date().toISOString(),
        supplier_id: supplierId,
        approval_status: 'pending',
        corporate_approval_status: 'pending_admin_review'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierDrivers'] });
      setSuccess('Motorista cadastrado com sucesso!');
      onClose();
    },
    onError: (error) => setFormError(error.message || 'Erro ao cadastrar motorista')
  });

  const updateDriverMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.Driver.update(id, {
        ...data,
        points_on_license: parseInt(data.points_on_license) || 0,
        last_points_update_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierDrivers'] });
      setSuccess('Motorista atualizado com sucesso!');
      onClose();
    },
    onError: (error) => setFormError(error.message || 'Erro ao atualizar motorista')
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name || !formData.phone_number) {
      setFormError('Preencha os campos obrigatórios: Nome e Telefone');
      return;
    }

    if (formData.languages.length === 0) {
      setFormError('Selecione pelo menos um idioma');
      return;
    }

    let finalFormData = { ...formData };

    try {
      if (driverPhotoFile) {
        const url = await handleFileUpload(driverPhotoFile);
        if (url) finalFormData.photo_url = url;
      }
      
      // Upload CNH only if changed (file present) and URL not updated by auto-process
      if (cnhDocumentFile && (!finalFormData.license_document_url || finalFormData.license_document_url === driver?.license_document_url)) {
         const url = await handleFileUpload(cnhDocumentFile);
         if (url) finalFormData.license_document_url = url;
      }

      if (asoFile) {
        const url = await handleFileUpload(asoFile);
        if (url) finalFormData.aso_document_url = url;
      }

      if (pgrFile) {
        const url = await handleFileUpload(pgrFile);
        if (url) finalFormData.pgr_document_url = url;
      }

      if (driver) {
        updateDriverMutation.mutate({ id: driver.id, data: finalFormData });
      } else {
        createDriverMutation.mutate(finalFormData);
      }
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleLanguageToggle = (lang) => {
    const current = formData.languages || [];
    if (current.includes(lang)) {
      setFormData({ ...formData, languages: current.filter(l => l !== lang) });
    } else {
      setFormData({ ...formData, languages: [...current, lang] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{driver ? `Editar Motorista - ${driver.name}` : 'Novo Motorista'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {formError && <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert>}
            {success && <Alert className="bg-green-50 border-green-200"><CheckCircle className="h-4 w-4 text-green-600" /><AlertDescription className="text-green-800">{success}</AlertDescription></Alert>}

            {driver && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <Label className="text-sm font-semibold text-amber-900">ID do Motorista</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input value={driver.id} readOnly className="font-mono text-sm bg-white" />
                  <Button type="button" variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(driver.id)}>Copiar</Button>
                </div>
              </div>
            )}

            <div className="bg-indigo-50 p-4 rounded-lg space-y-4 border border-indigo-100">
              <h3 className="font-semibold text-indigo-900 flex items-center gap-2"><Briefcase className="w-5 h-5" /> Dados Corporativos</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>E-mail (Gestão)</Label><Input type="email" value={formData.driver_email_by_manager} onChange={(e) => setFormData({...formData, driver_email_by_manager: e.target.value})} /></div>
                <div className="space-y-2"><Label>Telefone (Gestão)</Label><PhoneInputWithCountry value={formData.driver_phone_by_manager} onChange={(value) => setFormData({...formData, driver_phone_by_manager: value})} /></div>
                <div className="space-y-2"><Label>ASO</Label><Input type="file" accept=".pdf,image/*" onChange={(e) => setAsoFile(e.target.files[0])} className="bg-white" /></div>
                <div className="space-y-2"><Label>PGR</Label><Input type="file" accept=".pdf,image/*" onChange={(e) => setPgrFile(e.target.files[0])} className="bg-white" /></div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-blue-900">Dados Pessoais</h3>
              <div className="flex items-start gap-4 mb-4 border-b border-blue-200 pb-4">
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                  {driverPhotoFile ? <img src={URL.createObjectURL(driverPhotoFile)} className="w-full h-full object-cover" /> : formData.photo_url ? <img src={formData.photo_url} className="w-full h-full object-cover" /> : <Users className="w-8 h-8 text-gray-400" />}
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Foto do Motorista</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setDriverPhotoFile(e.target.files[0])} className="bg-white" />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nome Completo *</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required /></div>
                <div className="space-y-2"><Label>Telefone *</Label><PhoneInputWithCountry value={formData.phone_number} onChange={(value) => setFormData({...formData, phone_number: value})} required /></div>
                <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
                <div className="space-y-2"><Label>CPF/CNH</Label><Input value={formData.document_id} onChange={(e) => setFormData({...formData, document_id: e.target.value})} /></div>
                <div className="space-y-2"><Label>Número da CNH</Label><Input value={formData.license_number} onChange={(e) => setFormData({...formData, license_number: e.target.value})} /></div>
                <div className="space-y-2"><Label>Validade da CNH</Label><Input type="date" value={formData.license_expiry} onChange={(e) => setFormData({...formData, license_expiry: e.target.value})} /></div>
                <div className="space-y-2"><Label>Pontuação na CNH</Label><Input type="number" min="0" value={formData.points_on_license} onChange={(e) => setFormData({...formData, points_on_license: e.target.value})} /></div>
                <div className="space-y-2"><Label>Status da CNH</Label>
                  <select value={formData.cnh_status} onChange={(e) => setFormData({...formData, cnh_status: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
                    <option value="active">Ativa</option>
                    <option value="suspended">Suspensa</option>
                    <option value="revoked">Cassada</option>
                    <option value="pending_renewal">Renovação Pendente</option>
                  </select>
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label>Foto/PDF da CNH (Leitura Automática)</Label>
                  <div className="flex gap-2 relative">
                    <Input type="file" accept="image/*,.pdf" onChange={handleCNHUpload} disabled={isProcessingCNH} className="bg-white pr-10" />
                    {isProcessingCNH && <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center"><Loader2 className="w-4 h-4 animate-spin text-blue-600 mr-2" /><span className="text-xs text-blue-600 font-medium">Lendo...</span></div>}
                    {formData.license_document_url && <Button type="button" variant="outline" onClick={() => window.open(formData.license_document_url, '_blank')}><IdCard className="w-4 h-4 mr-2" /> Ver Atual</Button>}
                  </div>
                  <p className="text-xs text-blue-600 mt-1">* Ao selecionar o arquivo, os dados da CNH serão preenchidos automaticamente.</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-purple-900">Idiomas *</h3>
              <div className="flex flex-wrap gap-4">
                {['pt', 'en', 'es'].map(lang => (
                  <label key={lang} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.languages.includes(lang)} onChange={() => handleLanguageToggle(lang)} className="w-4 h-4" />
                    <span>{lang === 'pt' ? '🇧🇷 Português' : lang === 'en' ? '🇺🇸 English' : '🇪🇸 Español'}</span>
                  </label>
                ))}
              </div>
            </div>

            {driver && <VehicleManager driverId={driver.id} />}

            <div className="bg-red-50 p-4 rounded-lg space-y-4 border-2 border-red-300">
              <div className="flex items-center justify-between">
                <Label htmlFor="active-status" className="text-sm font-medium leading-none cursor-pointer text-red-900">Ativo</Label>
                <Switch id="active-status" checked={formData.active} onCheckedChange={(checked) => setFormData({...formData, active: checked})} />
              </div>
            </div>

            <div className="space-y-2"><Label>Observações</Label><Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="h-20" /></div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={createDriverMutation.isLoading || updateDriverMutation.isLoading} className="bg-blue-600 hover:bg-blue-700">
              {(createDriverMutation.isLoading || updateDriverMutation.isLoading) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              {driver ? 'Salvar Alterações' : 'Cadastrar Motorista'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}