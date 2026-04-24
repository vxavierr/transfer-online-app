import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Fuel, Loader2, Plus, Trash2, Eye, Sparkles } from 'lucide-react';
import ReceiptPreviewDialog from './ReceiptPreviewDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { extractFuelReceipt } from '@/functions/extractFuelReceipt';

const FUEL_LABELS = {
  gasolina: 'Gasolina',
  etanol: 'Etanol',
  diesel: 'Diesel',
  gnv: 'GNV',
  gasolina_aditivada: 'Gasolina Aditivada',
  diesel_s10: 'Diesel S10',
  other: 'Outro'
};

const initialForm = {
  driver_vehicle_id: '',
  vehicle_plate: '',
  fuel_date: new Date().toISOString().split('T')[0],
  fuel_time: '',
  fuel_type: 'gasolina',
  liters: '',
  price_per_liter: '',
  total_cost: '',
  odometer_km: '',
  station_name: '',
  station_address: '',
  is_full_tank: false,
  notes: '',
  receipt_url: ''
};

export default function DriverFuelRecords({ driverId, supplierId, vehicles = [] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const { data: fuelRecords = [], isLoading } = useQuery({
    queryKey: ['driverFuelRecords', driverId],
    queryFn: () => base44.entities.FuelRecord.filter({ driver_id: driverId }, '-fuel_date', 50),
    enabled: !!driverId
  });

  const handleOpenNew = () => {
    setForm({ ...initialForm });
    setReceiptPreview(null);
    setOpen(true);
  };

  const handleVehicleChange = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    setForm(prev => ({
      ...prev,
      driver_vehicle_id: vehicleId,
      vehicle_plate: vehicle?.vehicle_plate || ''
    }));
  };

  const handleReceiptPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      // 1. Upload da foto
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setReceiptPreview(file_url);
      setForm(prev => ({ ...prev, receipt_url: file_url }));

      // 2. Extrair dados via IA
      toast.info('Analisando comprovante com IA...');
      const response = await extractFuelReceipt({ file_url });
      const data = response.data?.data || response.data;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      // 3. Preencher formulário com dados extraídos
      setForm(prev => ({
        ...prev,
        receipt_url: file_url,
        fuel_date: data.fuel_date || prev.fuel_date,
        fuel_time: data.fuel_time || prev.fuel_time,
        fuel_type: data.fuel_type || prev.fuel_type,
        liters: data.liters || prev.liters,
        price_per_liter: data.price_per_liter || prev.price_per_liter,
        total_cost: data.total_cost || prev.total_cost,
        station_name: data.station_name || prev.station_name,
        station_address: data.station_address || prev.station_address,
        vehicle_plate: data.vehicle_plate || prev.vehicle_plate,
        odometer_km: data.odometer_km || prev.odometer_km,
        is_full_tank: data.is_full_tank ?? prev.is_full_tank
      }));

      toast.success('Dados extraídos com sucesso! Confira e ajuste se necessário.');
    } catch (error) {
      console.error('Erro ao processar comprovante:', error);
      toast.error('Erro ao analisar comprovante. Preencha manualmente.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.total_cost) {
      toast.error('Informe pelo menos o valor total.');
      return;
    }

    setIsSubmitting(true);
    try {
      await base44.entities.FuelRecord.create({
        ...form,
        driver_id: driverId,
        supplier_id: supplierId,
        liters: Number(form.liters) || 0,
        price_per_liter: Number(form.price_per_liter) || 0,
        total_cost: Number(form.total_cost) || 0,
        odometer_km: Number(form.odometer_km) || 0,
        ai_extracted: !!form.receipt_url
      });

      toast.success('Abastecimento registrado!');
      queryClient.invalidateQueries({ queryKey: ['driverFuelRecords', driverId] });
      queryClient.invalidateQueries({ queryKey: ['supplierFuelRecords'] });
      setOpen(false);
    } catch (error) {
      toast.error('Erro ao salvar abastecimento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.FuelRecord.delete(id);
    toast.success('Registro excluído.');
    queryClient.invalidateQueries({ queryKey: ['driverFuelRecords', driverId] });
    queryClient.invalidateQueries({ queryKey: ['supplierFuelRecords'] });
    setDeleteConfirmId(null);
  };

  // Totais
  const totalLiters = fuelRecords.reduce((s, r) => s + (r.liters || 0), 0);
  const totalCost = fuelRecords.reduce((s, r) => s + (r.total_cost || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Fuel className="h-5 w-5 text-orange-500" /> Abastecimentos
        </h3>
        <Button onClick={handleOpenNew} size="sm" className="bg-orange-600 hover:bg-orange-700">
          <Plus className="mr-1 h-4 w-4" /> Novo Abastecimento
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-orange-600 font-medium">Total Litros</p>
            <p className="text-xl font-bold text-orange-800">{totalLiters.toFixed(1)} L</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-red-600 font-medium">Total Gasto</p>
            <p className="text-xl font-bold text-red-800">R$ {totalCost.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : fuelRecords.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-8 text-center text-gray-500">Nenhum abastecimento registrado.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {fuelRecords.map(record => {
            const vehicle = vehicles.find(v => v.id === record.driver_vehicle_id);
            return (
              <Card key={record.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-orange-100 text-orange-800 text-xs">{FUEL_LABELS[record.fuel_type] || record.fuel_type}</Badge>
                        {record.ai_extracted && <Badge className="bg-purple-100 text-purple-800 text-xs"><Sparkles className="h-3 w-3 mr-1" />IA</Badge>}
                      </div>
                      <p className="font-semibold text-gray-900">
                        {record.fuel_date ? format(new Date(record.fuel_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                        {record.fuel_time && ` às ${record.fuel_time}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        {record.liters ? `${record.liters}L` : ''} 
                        {record.price_per_liter ? ` × R$${record.price_per_liter.toFixed(2)}/L` : ''} 
                        {record.total_cost ? ` = R$${record.total_cost.toFixed(2)}` : ''}
                      </p>
                      {record.station_name && <p className="text-xs text-gray-500 mt-1">📍 {record.station_name}</p>}
                      {record.vehicle_plate && <p className="text-xs text-gray-500">🚗 {vehicle?.vehicle_model || ''} {record.vehicle_plate}</p>}
                      {record.odometer_km > 0 && <p className="text-xs text-gray-500">📏 {record.odometer_km.toLocaleString('pt-BR')} km</p>}
                    </div>
                    <div className="flex gap-1">
                      {record.receipt_url && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewUrl(record.receipt_url)}>
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => setDeleteConfirmId(record.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Receipt Preview */}
      <ReceiptPreviewDialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)} imageUrl={previewUrl} />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir abastecimento?</AlertDialogTitle>
            <AlertDialogDescription>Este registro será removido permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(deleteConfirmId)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Abastecimento</DialogTitle>
          </DialogHeader>
          
          {/* Botão de foto do comprovante */}
          <div className="space-y-3">
            <div className="flex flex-col items-center gap-3 p-4 border-2 border-dashed border-orange-300 rounded-xl bg-orange-50">
              <Camera className="h-8 w-8 text-orange-500" />
              <p className="text-sm text-orange-700 text-center font-medium">Fotografe o ticket de combustível para preenchimento automático via IA</p>
              <label className="cursor-pointer">
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleReceiptPhoto} disabled={isExtracting} />
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors">
                  {isExtracting ? <><Loader2 className="h-4 w-4 animate-spin" /> Analisando...</> : <><Camera className="h-4 w-4" /> Tirar Foto / Selecionar</>}
                </span>
              </label>
              {receiptPreview && (
                <img src={receiptPreview} alt="Comprovante" className="w-full max-h-40 object-contain rounded-lg" />
              )}
            </div>

            <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500">ou preencha manualmente</span></div></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Veículo</Label>
                <Select value={form.driver_vehicle_id || 'none'} onValueChange={(v) => handleVehicleChange(v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não vincular</SelectItem>
                    {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.vehicle_model} - {v.vehicle_plate}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Combustível *</Label>
                <Select value={form.fuel_type} onValueChange={(v) => setForm(p => ({ ...p, fuel_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FUEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data *</Label>
                <Input type="date" value={form.fuel_date} onChange={e => setForm(p => ({ ...p, fuel_date: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hora</Label>
                <Input type="time" value={form.fuel_time} onChange={e => setForm(p => ({ ...p, fuel_time: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Litros</Label>
                <Input type="number" step="0.01" min="0" value={form.liters} onChange={e => setForm(p => ({ ...p, liters: e.target.value }))} placeholder="42.5" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Preço/Litro (R$)</Label>
                <Input type="number" step="0.01" min="0" value={form.price_per_liter} onChange={e => setForm(p => ({ ...p, price_per_liter: e.target.value }))} placeholder="5.89" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor Total (R$) *</Label>
                <Input type="number" step="0.01" min="0" value={form.total_cost} onChange={e => setForm(p => ({ ...p, total_cost: e.target.value }))} placeholder="250.00" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">KM Atual</Label>
                <Input type="number" min="0" value={form.odometer_km} onChange={e => setForm(p => ({ ...p, odometer_km: e.target.value }))} placeholder="85000" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Posto</Label>
              <Input value={form.station_name} onChange={e => setForm(p => ({ ...p, station_name: e.target.value }))} placeholder="Nome do posto" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="h-16" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}