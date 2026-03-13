import React, { useEffect, useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, RefreshCw, DollarSign, Users, Truck, AlertTriangle, Briefcase } from "lucide-react";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const safeFormat = (dateStr, fmtStr) => {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr.length === 10 && !dateStr.includes('T') ? `${dateStr}T12:00:00` : dateStr);
        if (!isValid(date)) return '-';
        return format(date, fmtStr, { locale: ptBR });
    } catch (e) {
        return '-';
    }
};

export default function EventFinancialReport({ eventId }) {
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState(null);

    const loadReport = async () => {
        setLoading(true);
        try {
            const response = await base44.functions.invoke('getEventFinancialReport', { eventId });
            if (response.data && response.data.success) {
                setReport(response.data);
            }
        } catch (error) {
            console.error("Erro ao carregar relatório:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (eventId) loadReport();
    }, [eventId]);

    const handleExportPDF = () => {
        if (!report) return;

        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text("Relatório Gerencial do Evento", 14, 20);
        doc.setFontSize(10);
        doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 28);

        // Financial Summary
        doc.setFontSize(14);
        doc.text("Resumo Financeiro", 14, 40);
        
        const financialData = [
            ["Receita Total (Cobrar)", `R$ ${report.financials.totalRevenue.toFixed(2)}`],
            ["Custo Total (Pagar)", `R$ ${report.financials.totalExpenses.toFixed(2)}`],
            ["  - Fornecedores", `R$ ${report.financials.totalSupplierCost.toFixed(2)}`],
            ["  - Motoristas", `R$ ${report.financials.totalDriverPayout.toFixed(2)}`],
            ["  - Parceiros (Sub)", `R$ ${(report.financials.totalSubcontractorCost || 0).toFixed(2)}`],
            ["Margem Projetada", `R$ ${report.financials.projectedMargin.toFixed(2)}`],
            ["Serviços Evento", `R$ ${(report.financials.totalServicesRevenue || 0).toFixed(2)}`],
            ["Adicionais (Extras)", `R$ ${report.financials.totalAdditionalPrice.toFixed(2)}`]
        ];

        autoTable(doc, {
            startY: 45,
            head: [['Item', 'Valor']],
            body: financialData,
            theme: 'striped',
            headStyles: { fillColor: [66, 66, 66] }
        });

        // Operational Summary
        let finalY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.text("Resumo Operacional", 14, finalY);

        const opData = [
            ["Total Passageiros", report.operational.totalPax],
            ["Chegadas (IN)", report.operational.paxIN],
            ["Saídas (OUT)", report.operational.paxOUT],
            ["Embarcados", report.operational.paxBoarded],
            ["No-Show", report.operational.paxNoShow],
            ["Cancelados", report.operational.paxCancelled],
            ["Veículos Utilizados", report.operational.vehiclesUsed]
        ];

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Métrica', 'Quantidade']],
            body: opData,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] }
        });

        // Vehicle Breakdown
        finalY = doc.lastAutoTable.finalY + 15;
        doc.text("Veículos Utilizados", 14, finalY);
        
        const vehicleData = Object.entries(report.operational.vehicleTypesCount).map(([type, count]) => [type, count]);
        
        autoTable(doc, {
            startY: finalY + 5,
            head: [['Tipo Veículo', 'Qtd']],
            body: vehicleData,
        });

        // Additional Costs
        if (report.details.additionalCosts.length > 0) {
            finalY = doc.lastAutoTable.finalY + 15;
            doc.text("Detalhamento de Custos Adicionais", 14, finalY);
            
            const addData = report.details.additionalCosts.map(item => [
                item.trip_name,
                item.item_name,
                item.quantity,
                `R$ ${item.total.toFixed(2)}`
            ]);

            autoTable(doc, {
                startY: finalY + 5,
                head: [['Viagem', 'Item', 'Qtd', 'Total']],
                body: addData,
            });
        }

        // Event Services Detail
        if (report.details.eventServices && report.details.eventServices.length > 0) {
            finalY = doc.lastAutoTable.finalY + 15;
            doc.text("Detalhamento de Serviços do Evento", 14, finalY);

            const serviceData = report.details.eventServices.map(service => [
                safeFormat(service.service_date, 'dd/MM/yyyy'),
                service.service_name,
                service.quantity,
                `R$ ${(service.total_price || 0).toFixed(2)}`
            ]);

            autoTable(doc, {
                startY: finalY + 5,
                head: [['Data', 'Serviço', 'Qtd', 'Total']],
                body: serviceData,
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229] } // Indigo
            });
        }

        doc.save(`relatorio_evento_${eventId}.pdf`);
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    }

    if (!report) {
        return <div className="text-center p-8 text-gray-500">Não foi possível carregar os dados.</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Relatório Gerencial</h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadReport} size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
                    </Button>
                    <Button onClick={handleExportPDF} size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Download className="w-4 h-4 mr-2" /> Exportar PDF
                    </Button>
                </div>
            </div>

            {/* Financial Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="bg-white border-l-4 border-green-500 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-500">Receita Total</span>
                            <DollarSign className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="text-2xl font-bold text-green-700">
                            R$ {report.financials.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Valores a cobrar</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-red-500 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-500">Custo Total</span>
                            <DollarSign className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="text-2xl font-bold text-red-700">
                            R$ {report.financials.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Valores a pagar (Forn/Mot/Parc)</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-blue-500 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-500">Margem</span>
                            <DollarSign className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="text-2xl font-bold text-blue-700">
                            R$ {report.financials.projectedMargin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Resultado financeiro</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-indigo-500 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-500">Serviços</span>
                            <Briefcase className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div className="text-2xl font-bold text-indigo-700">
                            R$ {(report.financials.totalServicesRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Coordenação, etc</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-purple-500 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-500">Adicionais</span>
                            <AlertTriangle className="w-4 h-4 text-purple-500" />
                        </div>
                        <div className="text-2xl font-bold text-purple-700">
                            R$ {report.financials.totalAdditionalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Extras e imprevistos</p>
                    </CardContent>
                </Card>
            </div>

            {/* Operational Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Users className="w-4 h-4" /> Estatísticas de Passageiros
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <span className="text-sm text-gray-600">Total Passageiros</span>
                                <span className="font-bold">{report.operational.totalPax}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-blue-50 rounded text-center">
                                    <span className="text-xs text-blue-600 font-medium block">Chegadas (IN)</span>
                                    <span className="text-lg font-bold text-blue-800">{report.operational.paxIN}</span>
                                </div>
                                <div className="p-3 bg-purple-50 rounded text-center">
                                    <span className="text-xs text-purple-600 font-medium block">Saídas (OUT)</span>
                                    <span className="text-lg font-bold text-purple-800">{report.operational.paxOUT}</span>
                                </div>
                            </div>
                            <div className="space-y-2 pt-2 border-t">
                                <div className="flex justify-between text-sm">
                                    <span className="text-green-600 flex items-center gap-1">✓ Embarcados</span>
                                    <span className="font-medium">{report.operational.paxBoarded}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-red-600 flex items-center gap-1">✕ No-Show</span>
                                    <span className="font-medium">{report.operational.paxNoShow}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 flex items-center gap-1">⟳ Cancelados</span>
                                    <span className="font-medium">{report.operational.paxCancelled}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Truck className="w-4 h-4" /> Utilização de Veículos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <span className="text-sm text-gray-600">Viagens Realizadas/Confirmadas</span>
                                <span className="font-bold">{report.operational.vehiclesUsed}</span>
                            </div>
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                                            <TableHead className="h-8 py-1">Tipo de Veículo</TableHead>
                                            <TableHead className="h-8 py-1 text-right">Qtd</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(report.operational.vehicleTypesCount).map(([type, count]) => (
                                            <TableRow key={type}>
                                                <TableCell className="py-2 text-sm">{type}</TableCell>
                                                <TableCell className="py-2 text-sm text-right font-medium">{count}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Additional Costs Table */}
            {report.details.additionalCosts.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2 text-purple-700">
                            <AlertTriangle className="w-4 h-4" /> Detalhamento de Custos Adicionais
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Viagem</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-right">Qtd</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.details.additionalCosts.map((item, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="text-sm font-medium">{item.trip_name}</TableCell>
                                        <TableCell className="text-sm">{item.item_name}</TableCell>
                                        <TableCell className="text-sm text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-sm text-right font-bold text-purple-700">
                                            R$ {item.total.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Event Services Table */}
            {report.details.eventServices && report.details.eventServices.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2 text-indigo-700">
                            <Briefcase className="w-4 h-4" /> Detalhamento de Serviços
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Serviço</TableHead>
                                    <TableHead className="text-right">Qtd</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.details.eventServices.map((service, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="text-sm font-medium">
                                            {safeFormat(service.service_date, 'dd/MM/yyyy')}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {service.service_name}
                                            <span className="text-xs text-gray-500 ml-2 block">{service.notes}</span>
                                        </TableCell>
                                        <TableCell className="text-sm text-right">{service.quantity}</TableCell>
                                        <TableCell className="text-sm text-right font-bold text-indigo-700">
                                            R$ {(service.total_price || 0).toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}