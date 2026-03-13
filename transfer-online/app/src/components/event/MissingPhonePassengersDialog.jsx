import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PhoneOff, FileText, Upload, Save, Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function MissingPhonePassengersDialog({ isOpen, onClose, passengers, onUpdate }) {
    const [editedPhones, setEditedPhones] = React.useState({});
    const [isSaving, setIsSaving] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const fileInputRef = React.useRef(null);

    const missingPhonePassengers = React.useMemo(() => 
        passengers.filter(p => {
            const isMissingPhone = !p.passenger_phone || p.passenger_phone.trim() === "";
            const matchesSearch = searchTerm === "" || p.passenger_name.toLowerCase().includes(searchTerm.toLowerCase());
            return isMissingPhone && matchesSearch;
        }),
    [passengers, searchTerm]);

    // Initialize editedPhones when dialog opens or passengers change
    React.useEffect(() => {
        if (isOpen) {
            const initialEditedPhones = {};
            missingPhonePassengers.forEach(p => {
                initialEditedPhones[p.id] = p.passenger_phone || "";
            });
            setEditedPhones(initialEditedPhones);
        }
    }, [isOpen, missingPhonePassengers]);

    const handlePhoneChange = (passengerId, value) => {
        setEditedPhones(prev => ({
            ...prev,
            [passengerId]: value
        }));
    };

    const handleExportCsv = () => {
        if (missingPhonePassengers.length === 0) {
            toast.info("Nenhum passageiro sem telefone para exportar.");
            return;
        }

        let csvContent = "Nome do Passageiro,Telefone,ID\n";
        missingPhonePassengers.forEach(p => {
            const phone = editedPhones[p.id] || "";
            csvContent += `"${p.passenger_name}","${phone}",${p.id}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "passageiros_sem_telefone.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("CSV exportado com sucesso!");
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split('\n');
            let updatedCount = 0;
            const newPhones = { ...editedPhones };

            // Skip header if present (heuristic)
            const startIndex = lines[0].toLowerCase().includes('nome') ? 1 : 0;

            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Simple CSV parse: split by comma, remove quotes
                const parts = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
                if (parts.length < 2) continue;

                const nameOrId = parts[0];
                const phone = parts[1];
                const id = parts[2]; // ID is 3rd column in our export

                if (!phone) continue;

                let passenger = null;
                // Try to find by ID first
                if (id) {
                    passenger = missingPhonePassengers.find(p => p.id === id);
                }
                // Fallback to name
                if (!passenger) {
                    passenger = missingPhonePassengers.find(p => p.passenger_name.toLowerCase() === nameOrId.toLowerCase());
                }

                if (passenger) {
                    newPhones[passenger.id] = phone;
                    updatedCount++;
                }
            }

            setEditedPhones(newPhones);
            toast.success(`${updatedCount} telefones carregados do arquivo! Verifique e salve.`);
            
            // Reset input
            event.target.value = '';
        };
        reader.readAsText(file);
    };

    const handleSaveChanges = async () => {
        const updates = [];
        
        missingPhonePassengers.forEach(p => {
            const currentPhone = (p.passenger_phone || "").trim();
            const newPhone = (editedPhones[p.id] || "").trim();
            
            if (newPhone && newPhone !== currentPhone) {
                updates.push({
                    id: p.id,
                    passenger_phone: newPhone
                });
            }
        });

        if (updates.length === 0) {
            toast.info("Nenhuma alteração encontrada para salvar.");
            return;
        }

        setIsSaving(true);
        const toastId = toast.loading(`Salvando ${updates.length} passageiros...`);

        try {
            await Promise.all(updates.map(update => 
                base44.entities.EventPassenger.update(update.id, { passenger_phone: update.passenger_phone })
            ));

            toast.success(`Telefones atualizados com sucesso!`, { id: toastId });
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Erro ao salvar telefones:", error);
            toast.error("Erro ao salvar: " + error.message, { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PhoneOff className="w-5 h-5 text-red-500" />
                        Gerenciar Passageiros sem Telefone
                    </DialogTitle>
                    <DialogDescription>
                        Edite os telefones diretamente na tabela abaixo, ou use a exportação/importação para editar em massa no Excel.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 my-4">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Buscar por nome..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={missingPhonePassengers.length === 0}>
                            <Download className="w-4 h-4 mr-2" />
                            Exportar CSV
                        </Button>
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Carregar CSV
                    </Button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".csv,.txt" 
                            onChange={handleFileUpload}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[30%]">Nome</TableHead>
                                <TableHead className="w-[30%]">Telefone (Editar)</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Tipo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {missingPhonePassengers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-green-600">
                                        Todos os passageiros possuem telefone cadastrado!
                                    </TableCell>
                                </TableRow>
                            ) : (
                                missingPhonePassengers.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.passenger_name}</TableCell>
                                        <TableCell>
                                            <Input 
                                                value={editedPhones[p.id] || ""} 
                                                onChange={(e) => handlePhoneChange(p.id, e.target.value)}
                                                placeholder="Digite o telefone..."
                                                className="h-8"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs">
                                                {p.status === 'assigned' ? 'Agrupado' : 'Pendente'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-gray-500">{p.trip_type}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <DialogFooter className="sm:justify-between items-center mt-4">
                    <span className="text-sm text-gray-500">
                        {missingPhonePassengers.length} passageiros listados
                    </span>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSaveChanges} disabled={isSaving || missingPhonePassengers.length === 0}>
                            {isSaving ? (
                                "Salvando..."
                            ) : (
                                <><Save className="w-4 h-4 mr-2" /> Salvar Alterações</>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}