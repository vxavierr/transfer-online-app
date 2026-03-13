import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
    Download, 
    DollarSign, 
    Users, 
    Truck, 
    Calendar, 
    MapPin, 
    Plane, 
    Briefcase, 
    ArrowRight, 
    Clock, 
    BarChart3, 
    FileText 
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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

export default function EventClientReport({ event, trips, passengers }) {
    const [eventServices, setEventServices] = useState([]);

    useEffect(() => {
        if (event?.id) {
            base44.entities.EventService.filter({ event_id: event.id })
                .then(setEventServices)
                .catch(console.error);
        }
    }, [event?.id]);

    const getTripFlights = (tripId) => {
        if (!passengers) return [];
        const tripPax = passengers.filter(p => p.event_trip_id === tripId);
        const flightsMap = new Map();
        tripPax.forEach(p => {
            if (p.flight_number) {
                const time = p.flight_time || p.time || '';
                const key = `${p.flight_number}-${time}`;
                if (!flightsMap.has(key)) {
                    flightsMap.set(key, { number: p.flight_number, time, count: 0 });
                }
                flightsMap.get(key).count++;
            }
        });
        return Array.from(flightsMap.values()).sort((a, b) => a.time.localeCompare(b.time));
    };

    // Calculate Summary Stats
    const stats = useMemo(() => {
        const totalTrips = trips.length;
        const totalPax = passengers.length;

        // Sort passengers: Data -> Hora -> Viagem Alocada -> Nome
        const sortedPassengers = [...passengers].sort((a, b) => {
            // 1. Sort by Date
            const dateA = a.date || a.flight_date || '';
            const dateB = b.date || b.flight_date || '';
            const dateCompare = dateA.localeCompare(dateB);
            if (dateCompare !== 0) return dateCompare;

            // 2. Sort by Time
            const timeA = a.time || a.flight_time || '';
            const timeB = b.time || b.flight_time || '';
            const timeCompare = timeA.localeCompare(timeB);
            if (timeCompare !== 0) return timeCompare;

            // 3. Sort by Allocated Trip (Name)
            const tripA = trips.find(t => t.id === a.event_trip_id);
            const tripB = trips.find(t => t.id === b.event_trip_id);
            const tripNameA = tripA ? tripA.name : 'ZZZ'; // Put unassigned last or first as preferred. 'ZZZ' puts pending at bottom if sorting asc.
            const tripNameB = tripB ? tripB.name : 'ZZZ';
            const tripCompare = tripNameA.localeCompare(tripNameB);
            if (tripCompare !== 0) return tripCompare;

            // 4. Sort by Passenger Name
            const nameA = a.passenger_name || '';
            const nameB = b.passenger_name || '';
            return nameA.localeCompare(nameB);
        });

        const tripsWithPrice = trips.map(t => ({
            ...t,
            finalPrice: (t.final_client_price || 0) > 0 ? t.final_client_price : ((t.client_price || 0) + (t.additional_items || []).reduce((acc, item) => acc + (item.total_price || 0), 0))
        }));

        const totalValue = tripsWithPrice.reduce((acc, t) => acc + t.finalPrice, 0);
        
        // Count by type
        const paxIN = passengers.filter(p => (p.trip_type || '').includes('IN')).length;
        const paxOUT = passengers.filter(p => (p.trip_type || '').includes('OUT')).length;
        const paxNoShow = passengers.filter(p => p.status === 'no_show').length;

        const totalAllocatedPax = passengers.filter(p => p.event_trip_id).length;
        const totalPendingPax = totalPax - totalAllocatedPax;
        
        // Additional Expenses
        const allAdditionalItems = trips.flatMap(trip => 
            (trip.additional_items || []).map(item => ({
                ...item,
                trip_name: trip.name,
                trip_id: trip.id
            }))
        );
        const totalAdditionalExpenses = allAdditionalItems.reduce((acc, item) => acc + (item.total_price || 0), 0);
        const totalServicesCost = eventServices.reduce((acc, s) => acc + (s.total_price || 0), 0);

        // Group by Date and Vehicle Type
        const summaryByDateAndVehicle = Object.values(tripsWithPrice.reduce((acc, trip) => {
            const dateStr = safeFormat(trip.date, 'dd/MM/yyyy');
            const key = `${dateStr}-${trip.vehicle_type_category}`;
            
            if (!acc[key]) {
                acc[key] = {
                    date: trip.date, // keep original for sorting
                    dateStr,
                    vehicleType: trip.vehicle_type_category,
                    totalVehicles: 0,
                    totalPax: 0,
                    totalValue: 0
                };
            }
            
            acc[key].totalVehicles += 1;
            acc[key].totalPax += (trip.passenger_count || 0);
            acc[key].totalValue += trip.finalPrice;
            
            return acc;
        }, {})).sort((a, b) => {
            const dateA = a.date || '';
            const dateB = b.date || '';
            const dateCompare = dateA.localeCompare(dateB);
            if (dateCompare !== 0) return dateCompare;
            return (a.vehicleType || '').localeCompare(b.vehicleType || '');
        });

        return {
            summaryByDateAndVehicle,
            totalTrips,
            totalPax,
            totalValue: totalValue + totalServicesCost,
            paxIN,
            paxOUT,
            paxNoShow,
            totalAllocatedPax,
            totalPendingPax,
            totalAdditionalExpenses,
            allAdditionalItems,
            tripsWithPrice,
            totalServicesCost,
            eventServices,
            sortedPassengers
            };
            }, [trips, passengers, eventServices]);

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();

        const formatCurrency = (ws, range, colIndices) => {
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C of colIndices) {
                    const cellRef = XLSX.utils.encode_cell({c: C, r: R});
                    if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
                        ws[cellRef].z = '"R$" #,##0.00'; 
                        if (!ws[cellRef].s) ws[cellRef].s = {};
                    }
                }
            }
        };

        const autoSize = (ws) => {
            const range = XLSX.utils.decode_range(ws['!ref']);
            const colWidths = [];
            for (let C = range.s.c; C <= range.e.c; ++C) {
                let max = 10;
                for (let R = range.s.r; R <= range.e.r; ++R) {
                    const cell = ws[XLSX.utils.encode_cell({c: C, r: R})];
                    if (cell && cell.v) {
                        const len = cell.v.toString().length;
                        if (len > max) max = len;
                    }
                }
                colWidths[C] = { wch: max + 2 };
            }
            ws['!cols'] = colWidths;
        };

        const boldHeader = (ws, rowIndices) => {
             const range = XLSX.utils.decode_range(ws['!ref']);
             rowIndices.forEach(R => {
                 for(let C = range.s.c; C <= range.e.c; ++C) {
                     const cellRef = XLSX.utils.encode_cell({c: C, r: R});
                     if(!ws[cellRef]) continue;
                     if(!ws[cellRef].s) ws[cellRef].s = {};
                     ws[cellRef].s.font = { bold: true };
                 }
             });
        };

        // 1. Sheet Resumo
        const summaryData = [
            ["Relatório de Serviço", event.event_name],
            ["Data Emissão", format(new Date(), "dd/MM/yyyy HH:mm")],
            [],
            ["RESUMO GERAL"],
            ["Item", "Valor"],
            ["Total Passageiros", stats.totalPax],
            ["Passageiros Alocados", stats.totalAllocatedPax],
            ["Passageiros Pendentes", stats.totalPendingPax],
            ["Chegadas (IN)", stats.paxIN],
            ["Saídas (OUT)", stats.paxOUT],
            ["No-Show", stats.paxNoShow],
            ["Total Viagens", stats.totalTrips],
            ["Valor Total Geral", stats.totalValue],
            ["Custo Serviços Evento", stats.totalServicesCost],
            ["Total Despesas Adicionais", stats.totalAdditionalExpenses],
            [],
            ["RESUMO POR DATA E VEÍCULO"],
            ["Data", "Tipo Veículo", "Qtd Veículos", "Qtd Pax", "Valor Total"]
        ];

        stats.summaryByDateAndVehicle.forEach(item => {
            summaryData.push([
                safeFormat(item.date, 'dd/MM/yyyy'),
                item.vehicleType,
                item.totalVehicles,
                item.totalPax,
                item.totalValue
            ]);
        });

        const wsResumo = XLSX.utils.aoa_to_sheet(summaryData);
        
        // Currency in Resumo Geral (Col 1/B)
        const resGeralRange = {s: {r: 12, c: 1}, e: {r: 14, c: 1}}; 
        formatCurrency(wsResumo, resGeralRange, [1]);

        // Currency in Resumo Data/Veiculo (Col 4/E)
        if(stats.summaryByDateAndVehicle.length > 0) {
            const resDataRange = {s: {r: 18, c: 4}, e: {r: 18 + stats.summaryByDateAndVehicle.length - 1, c: 4}};
            formatCurrency(wsResumo, resDataRange, [4]);
        }

        // Bold Headers
        boldHeader(wsResumo, [0, 1, 3, 4, 16, 17]);
        autoSize(wsResumo);

        XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

        // 2. Sheet Viagens
        const tripsHeader = ["ID", "Data", "Hora", "Nome/Ref", "Tipo", "Origem", "Destino", "Veículo", "Pax", "Voos", "Itens Cobrados", "Valor da Viagem", "Despesas Adicionais", "Total"];
        const tripsRows = stats.tripsWithPrice.map(t => {
             const flights = getTripFlights(t.id).map(f => `${f.number} ${f.time}`).join(', ');
             const additionalExpensesForTrip = (t.additional_items || []).reduce((acc, item) => acc + (item.total_price || 0), 0);
             const additionalItemsNames = (t.additional_items || []).map(i => i.name).join(', ') || '-';
             return [
                t.trip_code || t.id,
                safeFormat(t.date, 'dd/MM/yyyy'),
                t.start_time,
                t.name,
                t.trip_type,
                t.origin,
                t.destination,
                t.vehicle_type_category,
                t.passenger_count,
                flights,
                additionalItemsNames,
                t.client_price || 0,
                additionalExpensesForTrip,
                t.finalPrice
             ];
        });
        const wsTrips = XLSX.utils.aoa_to_sheet([tripsHeader, ...tripsRows]);
        if(tripsRows.length > 0) {
            formatCurrency(wsTrips, {s: {r: 1, c: 11}, e: {r: tripsRows.length, c: 13}}, [11, 12, 13]);
        }
        boldHeader(wsTrips, [0]);
        autoSize(wsTrips);
        XLSX.utils.book_append_sheet(wb, wsTrips, "Viagens");

        // 3. Sheet Passageiros (Tabela Unificada)
        const paxHeader = [
            "Nome", "Data", "Hora", "Voo", "Cia Aérea", "Origem", "Destino", "Tipo", "Status",
            "Viagem Alocada", "ID Viagem", "Tipo Veículo", "Qtd Pax", "Itens Cobrados", 
            "Valor da Viagem", "Despesas Adicionais", "Valor Total"
        ];

        const paxRows = [];
        const merges = [];
        const borderRows = []; // Rows that need a bottom border
        let currentRow = 1; // Header is 0

        // A. Passageiros Alocados (Agrupados por Viagem)
        stats.tripsWithPrice.forEach(trip => {
            const tripPassengers = stats.sortedPassengers.filter(p => p.event_trip_id === trip.id);
            if (tripPassengers.length === 0) return;

            const additionalExpenses = (trip.additional_items || []).reduce((acc, item) => acc + (item.total_price || 0), 0);
            const additionalItemsStr = (trip.additional_items || []).map(i => i.name).join(', ') || '-';

            const startRow = currentRow;
            const endRow = currentRow + tripPassengers.length - 1;

            // Add Merge Ranges if more than 1 passenger
            if (tripPassengers.length > 1) {
                // Columns 9 to 16 (Viagem Alocada -> Valor Total)
                for (let c = 9; c <= 16; c++) {
                    merges.push({ s: { r: startRow, c: c }, e: { r: endRow, c: c } });
                }
            }

            tripPassengers.forEach((p, index) => {
                const isFirst = index === 0;
                paxRows.push([
                    p.passenger_name,
                    safeFormat(p.date || p.flight_date, 'dd/MM/yyyy'),
                    p.time || p.flight_time || '-',
                    p.flight_number || '-',
                    p.airline || '-',
                    p.origin_address || p.arrival_point || '-',
                    p.destination_address || '-',
                    p.trip_type || '-',
                    p.status || '-',
                    // Dados da viagem apenas na primeira linha (o merge cuidará da exibição)
                    isFirst ? trip.name : '',
                    isFirst ? (trip.trip_code || '-') : '',
                    isFirst ? trip.vehicle_type_category : '',
                    isFirst ? trip.passenger_count : '',
                    isFirst ? additionalItemsStr : '',
                    isFirst ? (trip.client_price || 0) : '',
                    isFirst ? additionalExpenses : '',
                    isFirst ? trip.finalPrice : ''
                ]);
            });

            // Mark the last row of this trip for bottom border
            borderRows.push(endRow);
            currentRow += tripPassengers.length;
        });

        // B. Passageiros Não Alocados
        const unassignedPax = stats.sortedPassengers.filter(p => !p.event_trip_id);
        if (unassignedPax.length > 0) {
            unassignedPax.forEach(p => {
                paxRows.push([
                    p.passenger_name,
                    safeFormat(p.date || p.flight_date, 'dd/MM/yyyy'),
                    p.time || p.flight_time || '-',
                    p.flight_number || '-',
                    p.airline || '-',
                    p.origin_address || p.arrival_point || '-',
                    p.destination_address || '-',
                    p.trip_type || '-',
                    p.status || '-',
                    'Não Alocado',
                    '-',
                    '-',
                    '-',
                    '-',
                    0,
                    0,
                    0
                ]);
            });
            // No specific merges for unassigned, just append
        }

        const wsPax = XLSX.utils.aoa_to_sheet([paxHeader, ...paxRows]);
        wsPax['!merges'] = merges;

        // Formatar moeda nas colunas O, P, Q (índices 14, 15, 16)
        if(paxRows.length > 0) {
            formatCurrency(wsPax, {s: {r: 1, c: 14}, e: {r: paxRows.length, c: 16}}, [14, 15, 16]);
        }

        // Estilizar cabeçalho
        const paxRange = XLSX.utils.decode_range(wsPax['!ref']);
        for(let C = paxRange.s.c; C <= paxRange.e.c; ++C) {
            const cellRef = XLSX.utils.encode_cell({c: C, r: 0});
            if(!wsPax[cellRef]) continue;
            if(!wsPax[cellRef].s) wsPax[cellRef].s = {};
            wsPax[cellRef].s.font = { bold: true };
            wsPax[cellRef].s.fill = { fgColor: { rgb: "E0E0E0" } }; 
            wsPax[cellRef].s.border = {
                bottom: { style: "thin", color: { auto: 1 } }
            };
            wsPax[cellRef].s.alignment = { vertical: "center", horizontal: "center" };
        }

        // Apply Global Styles (Vertical Center for ALL cells)
         for(let R = 1; R <= paxRows.length; ++R) {
            for(let C = 0; C <= 16; ++C) {
                const cellRef = XLSX.utils.encode_cell({c: C, r: R});
                if(!wsPax[cellRef]) continue;

                if(!wsPax[cellRef].s) wsPax[cellRef].s = {};
                if(!wsPax[cellRef].s.alignment) wsPax[cellRef].s.alignment = {};

                // Vertical Center for everything (Alinhar ao meio)
                wsPax[cellRef].s.alignment.vertical = "center";

                // Horizontal Center for Trip Details columns (9-16)
                // 9: Viagem Alocada, 10: ID, 11: Tipo Veiculo, 12: Qtd Pax, 13: Itens, 14: Valor, 15: Extras, 16: Total
                if (C >= 9 && C <= 16) {
                    wsPax[cellRef].s.alignment.horizontal = "center";
                }
            }
        }

        // Apply Bottom Borders to separate trips
        borderRows.forEach(rowIndex => {
            for(let C = paxRange.s.c; C <= paxRange.e.c; ++C) {
                const cellRef = XLSX.utils.encode_cell({c: C, r: rowIndex});
                if(!wsPax[cellRef]) wsPax[cellRef] = { v: '', t: 's' }; // Create empty cell if needed
                if(!wsPax[cellRef].s) wsPax[cellRef].s = {};
                if(!wsPax[cellRef].s.border) wsPax[cellRef].s.border = {};
                // Use medium border for clearer separation between trips
                wsPax[cellRef].s.border.bottom = { style: "medium", color: { auto: 1 } };
            }
        });

        autoSize(wsPax);
        XLSX.utils.book_append_sheet(wb, wsPax, "Passageiros");

        // 4. Despesas Adicionais
        if (stats.allAdditionalItems.length > 0) {
            const extraHeader = ["Viagem", "Item", "Descrição", "Quantidade", "Valor Unitário", "Valor Total"];
            const extraRows = stats.allAdditionalItems.map(item => [
                item.trip_name,
                item.name,
                item.notes || '-',
                item.quantity,
                item.unit_price,
                item.total_price
            ]);
            const wsExtras = XLSX.utils.aoa_to_sheet([extraHeader, ...extraRows]);
            formatCurrency(wsExtras, {s: {r: 1, c: 4}, e: {r: extraRows.length, c: 5}}, [4, 5]);
            boldHeader(wsExtras, [0]);
            autoSize(wsExtras);
            XLSX.utils.book_append_sheet(wb, wsExtras, "Despesas Adicionais");
        }

        // 5. Serviços
        if (stats.eventServices.length > 0) {
            const servHeader = ["Data", "Serviço", "Tipo", "Quantidade", "Valor Unitário", "Valor Total", "Notas"];
            const servRows = stats.eventServices.map(s => [
                safeFormat(s.service_date, 'dd/MM/yyyy'),
                s.service_name,
                s.service_type,
                s.quantity,
                s.unit_price,
                s.total_price,
                s.notes
            ]);
            const wsServices = XLSX.utils.aoa_to_sheet([servHeader, ...servRows]);
            formatCurrency(wsServices, {s: {r: 1, c: 4}, e: {r: servRows.length, c: 5}}, [4, 5]);
            boldHeader(wsServices, [0]);
            autoSize(wsServices);
            XLSX.utils.book_append_sheet(wb, wsServices, "Serviços Evento");
        }

        XLSX.writeFile(wb, `Relatorio_Evento_${event.event_name.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        
        // Header
        doc.setFillColor(37, 99, 235); // Blue
        doc.rect(0, 0, 210, 50, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("Relatório de Serviço", 14, 20);
        doc.setFontSize(12);
        doc.text(`${event.event_name}`, 14, 30);
        doc.text(format(new Date(), "dd/MM/yyyy"), 195, 20, { align: 'right' });

        // Header Summary Stats (White text on Blue background)
        doc.setFontSize(10);
        const statsY = 42;
        doc.text(`Total Pax: ${stats.totalPax}`, 14, statsY);
        doc.text(`Alocados: ${stats.totalAllocatedPax}`, 50, statsY);
        doc.text(`Pendentes: ${stats.totalPendingPax}`, 90, statsY);
        doc.text(`Viagens: ${stats.totalTrips}`, 130, statsY);
        doc.text(`IN: ${stats.paxIN} | OUT: ${stats.paxOUT}`, 170, statsY);

        // Summary Cards Section
        doc.setTextColor(0, 0, 0);
        let currentY = 65;

        doc.setFontSize(14);
        doc.text("Resumo Geral", 14, currentY);
        currentY += 10;

        const summaryData = [
            ["Total Passageiros", stats.totalPax.toString()],
            ["Passageiros Alocados em Viagens", stats.totalAllocatedPax.toString()],
            ["Passageiros Pendentes de Viagem", stats.totalPendingPax.toString()],
            ["Passageiros IN (Chegadas)", stats.paxIN.toString()],
            ["Passageiros OUT (Saídas)", stats.paxOUT.toString()],
            ["Passageiros No-Show", stats.paxNoShow.toString()],
            ["Total Viagens Criadas", stats.totalTrips.toString()],
            ["Valor Total (Viagens + Serviços + Extras)", `R$ ${stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
            ["Custo Serviços Evento", `R$ ${stats.totalServicesCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
            ["Total Despesas Adicionais", `R$ ${stats.totalAdditionalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]
        ];

        autoTable(doc, {
            startY: currentY,
            head: [['Item', 'Valor']],
            body: summaryData,
            theme: 'grid',
            headStyles: { fillColor: [66, 66, 66] },
            columnStyles: {
                0: { cellWidth: 100 },
                1: { cellWidth: 80, halign: 'right', fontStyle: 'bold' }
            }
        });

        currentY = doc.lastAutoTable.finalY + 15;

        // Dynamic Summary Table (Date x Vehicle)
        doc.setFontSize(14);
        doc.text("Resumo por Data e Veículo", 14, currentY);
        currentY += 5;

        const dynamicSummaryData = stats.summaryByDateAndVehicle.map(item => [
            safeFormat(item.date, 'dd/MM'),
            item.vehicleType,
            item.totalVehicles.toString(),
            item.totalPax.toString(),
            `R$ ${item.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [['Data', 'Veículo', 'Qtd Veículos', 'Qtd Pax', 'Valor Total']],
            body: dynamicSummaryData,
            theme: 'striped',
            headStyles: { fillColor: [44, 62, 80] }, // Dark Blue/Gray
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 60 },
                2: { cellWidth: 30, halign: 'center' },
                3: { cellWidth: 30, halign: 'center' },
                4: { cellWidth: 40, halign: 'right' }
            },
            styles: { fontSize: 10 }
        });

        currentY = doc.lastAutoTable.finalY + 15;

        // Additional Expenses Detail (New Page if needed)
        if (stats.allAdditionalItems.length > 0) {
            doc.addPage();
            currentY = 20;
            doc.setFontSize(14);
            doc.text("Detalhamento de Despesas Adicionais", 14, currentY);
            currentY += 5;

            const additionalExpensesData = stats.allAdditionalItems.map(item => [
                item.trip_name,
                item.name,
                item.notes || '-',
                item.quantity,
                `R$ ${item.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [['Viagem', 'Item', 'Descrição', 'Qtd', 'Total']],
                body: additionalExpensesData,
                theme: 'striped',
                headStyles: { fillColor: [245, 158, 11] }, // Yellow/Orange
                styles: { fontSize: 8 },
                columnStyles: {
                    0: { cellWidth: 40 },
                    1: { cellWidth: 50 },
                    2: { cellWidth: 60 },
                    3: { cellWidth: 15, halign: 'center' },
                    4: { cellWidth: 25, halign: 'right' }
                }
            });
            currentY = doc.lastAutoTable.finalY + 15;
        }

        // Event Services Detail
        if (stats.eventServices.length > 0) {
            doc.addPage();
            currentY = 20;
            doc.setFontSize(14);
            doc.text("Detalhamento de Serviços do Evento", 14, currentY);
            currentY += 5;

            const serviceTypeLabels = {
                coordination: "Coordenação",
                hostess: "Recepção / Hostess",
                security: "Segurança",
                equipment: "Equipamento",
                other: "Outros"
            };

            const eventServicesData = stats.eventServices.map(service => [
                safeFormat(service.service_date, 'dd/MM/yyyy'),
                service.service_name,
                serviceTypeLabels[service.service_type] || service.service_type,
                service.quantity,
                `R$ ${service.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                `R$ ${service.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [['Data', 'Serviço', 'Tipo', 'Qtd', 'Unitário', 'Total']],
                body: eventServicesData,
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229] }, // Indigo
                styles: { fontSize: 8 },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 50 },
                    2: { cellWidth: 35 },
                    3: { cellWidth: 15, halign: 'center' },
                    4: { cellWidth: 25, halign: 'right' },
                    5: { cellWidth: 30, halign: 'right' }
                }
            });
            currentY = doc.lastAutoTable.finalY + 15;
        }

        // Trips Detail Table
        doc.setFontSize(14);
        doc.text("Detalhamento de Viagens", 14, currentY);
        currentY += 5;

        const tripsData = stats.tripsWithPrice.map(t => {
            const dateStr = safeFormat(t.date, 'dd/MM');
            
            const flights = getTripFlights(t.id);
            let routeStr = `${t.origin} > ${t.destination}`;
            if (flights.length > 0) {
                const flightsStr = flights.map(f => `${f.number} ${f.time} (${f.count}p)`).join(', ');
                routeStr += `\nVoos: ${flightsStr}`;
            }

            const typeLabel = t.trip_type === 'arrival' ? 'IN' : (t.trip_type === 'departure' ? 'OUT' : (t.trip_type || '-').toUpperCase());
            const itemsStr = (t.additional_items || []).map(i => i.name).join(', ') || '-';

            return [
                `${dateStr} ${t.start_time}`,
                t.name,
                typeLabel,
                routeStr,
                t.vehicle_type_category,
                t.passenger_count,
                itemsStr,
                `R$ ${t.finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            ];
        });

        autoTable(doc, {
            startY: currentY,
            head: [['Data/Hora', 'Nome/Ref', 'Tipo', 'Rota', 'Veículo', 'Pax', 'Itens', 'Valor']],
            body: tripsData,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 30 },
                2: { cellWidth: 12, halign: 'center' },
                3: { cellWidth: 40 },
                4: { cellWidth: 20 },
                5: { cellWidth: 8, halign: 'center' },
                6: { cellWidth: 30 },
                7: { cellWidth: 25, halign: 'right' }
            },
            styles: { fontSize: 8 }
        });

        // Passengers Detail (New Page if needed)
        doc.addPage();
        currentY = 20;
        doc.setFontSize(14);
        doc.text("Lista de Passageiros", 14, currentY);
        currentY += 5;

        const paxData = stats.sortedPassengers.map(p => {
            const trip = stats.tripsWithPrice.find(t => t.id === p.event_trip_id);
            const dateStr = p.date ? safeFormat(p.date, 'dd/MM') : safeFormat(p.flight_date, 'dd/MM');
            const additionalExpenses = trip ? (trip.additional_items || []).reduce((acc, item) => acc + (item.total_price || 0), 0) : 0;
            return [
                p.passenger_name,
                dateStr,
                p.time || p.flight_time || '-',
                trip ? trip.name : 'Não Alocado',
                trip ? (trip.trip_code || '-') : '-',
                trip ? trip.vehicle_type_category : '-',
                trip ? trip.passenger_count : '-',
                trip ? ((trip.additional_items || []).map(i => i.name).join(', ') || '-') : '-',
                trip ? `R$ ${(trip.client_price || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '-',
                trip ? `R$ ${additionalExpenses.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '-',
                trip ? `R$ ${trip.finalPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '-'
            ];
        });

        autoTable(doc, {
            startY: currentY,
            head: [['Passageiro', 'Data', 'Hora', 'Transfer', 'ID', 'Veículo', 'Pax', 'Itens', 'Valor', 'Extras', 'Total']],
            body: paxData,
            theme: 'striped',
            headStyles: { fillColor: [39, 174, 96] }, // Green
            styles: { fontSize: 6 },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 10 },
                2: { cellWidth: 10 },
                3: { cellWidth: 20 },
                4: { cellWidth: 15 },
                5: { cellWidth: 15 },
                6: { cellWidth: 8, halign: 'center' },
                7: { cellWidth: 20 },
                8: { cellWidth: 18, halign: 'right' },
                9: { cellWidth: 18, halign: 'right' },
                10: { cellWidth: 18, halign: 'right' }
            }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
        }

        doc.save(`relatorio_cliente_${event.event_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div>
                    <h2 className="text-xl font-bold text-blue-900">Relatório do Cliente</h2>
                    <p className="text-sm text-blue-700">Visão consolidada de serviços e valores para faturamento.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleExportExcel} variant="outline" className="bg-white hover:bg-green-50 text-green-700 border-green-200 shadow-sm">
                        <FileText className="w-4 h-4 mr-2" /> 
                        Baixar Excel
                    </Button>
                    <Button onClick={handleExportPDF} className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                        <Download className="w-4 h-4 mr-2" /> 
                        Baixar PDF Completo
                    </Button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Valor Total (Cliente)</p>
                            <h3 className="text-3xl font-bold text-blue-700">
                                R$ {stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-full">
                            <DollarSign className="w-6 h-6 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Serviços Evento</p>
                            <h3 className="text-3xl font-bold text-indigo-700">
                                R$ {stats.totalServicesCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">Coordenação, segurança, etc.</p>
                        </div>
                        <div className="bg-indigo-100 p-3 rounded-full">
                            <Briefcase className="w-6 h-6 text-indigo-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Viagens</p>
                            <h3 className="text-3xl font-bold text-gray-900">{stats.totalTrips}</h3>
                        </div>
                        <div className="bg-green-100 p-3 rounded-full">
                            <Truck className="w-6 h-6 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Passageiros</p>
                            <h3 className="text-3xl font-bold text-gray-900">{stats.totalPax}</h3>
                            <p className="text-xs text-gray-500 mt-1">
                                {stats.paxIN} Chegadas • {stats.paxOUT} Saídas • <span className="text-red-600 font-medium">{stats.paxNoShow} No-Show</span>
                            </p>
                        </div>
                        <div className="bg-purple-100 p-3 rounded-full">
                            <Users className="w-6 h-6 text-purple-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Despesas Adicionais</p>
                            <h3 className="text-3xl font-bold text-yellow-700">
                                R$ {stats.totalAdditionalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">Extras e consumos</p>
                        </div>
                        <div className="bg-yellow-100 p-3 rounded-full">
                            <DollarSign className="w-6 h-6 text-yellow-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dynamic Summary Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-gray-500" /> Resumo por Data e Veículo
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead>Data</TableHead>
                                    <TableHead>Tipo de Veículo</TableHead>
                                    <TableHead className="text-center">Qtd Veículos</TableHead>
                                    <TableHead className="text-center">Qtd Passageiros</TableHead>
                                    <TableHead className="text-right">Valor Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.summaryByDateAndVehicle.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                            Nenhum dado para resumo.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    stats.summaryByDateAndVehicle.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{safeFormat(item.date, 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-normal">
                                                    {item.vehicleType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center font-medium">{item.totalVehicles}</TableCell>
                                            <TableCell className="text-center">{item.totalPax}</TableCell>
                                            <TableCell className="text-right font-medium text-gray-900">
                                                R$ {item.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Trips Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-500" /> Detalhamento de Viagens
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead>Data/Hora</TableHead>
                                    <TableHead>Viagem</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Rota</TableHead>
                                    <TableHead>Veículo</TableHead>
                                    <TableHead className="text-center">Pax</TableHead>
                                    <TableHead>Itens Cobrados</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.tripsWithPrice.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                            Nenhuma viagem registrada.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    stats.tripsWithPrice.map((trip) => (
                                        <TableRow key={trip.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{safeFormat(trip.date, 'dd/MM')}</span>
                                                    <span className="text-xs text-gray-500">{trip.start_time}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{trip.name}</div>
                                                {trip.driver_name && (
                                                    <div className="text-xs text-gray-500">Mot: {trip.driver_name}</div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={trip.trip_type === 'arrival' ? 'default' : (trip.trip_type === 'departure' ? 'secondary' : 'outline')}>
                                                    {trip.trip_type === 'arrival' ? 'IN' : (trip.trip_type === 'departure' ? 'OUT' : (trip.trip_type || '-').toUpperCase())}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-[300px]">
                                                <div className="space-y-1">
                                                    <div className="font-medium text-blue-700 text-xs leading-tight">
                                                        {trip.origin} <ArrowRight className="inline-block w-3 h-3 mx-0.5 text-gray-400" /> {trip.destination}
                                                    </div>
                                                    
                                                    <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                                                        {trip.start_time && (
                                                            <span className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded">
                                                                <Clock className="w-3 h-3" />
                                                                {trip.start_time}
                                                            </span>
                                                        )}

                                                        {trip.passenger_count > 0 && (
                                                            <span className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded">
                                                                <Users className="w-3 h-3" />
                                                                {trip.passenger_count}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {(() => {
                                                        const flights = getTripFlights(trip.id);
                                                        if (flights.length > 0) {
                                                            return (
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {flights.map((f, idx) => (
                                                                        <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0.5 h-auto whitespace-nowrap bg-blue-50 text-blue-700 border-blue-100 font-normal">
                                                                            <Plane className="w-3 h-3 mr-1" />
                                                                            {f.number} • {f.time} • <strong>{f.count}</strong>
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            );
                                                        } else if (trip.origin_flight_number || trip.destination_flight_number || trip.flight_number) {
                                                            // Fallback for when passenger data might be missing but trip has flight info
                                                            return (
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-auto whitespace-nowrap bg-blue-50 text-blue-700 border-blue-100 font-normal">
                                                                        <Plane className="w-3 h-3 mr-1" />
                                                                        {trip.origin_flight_number || trip.destination_flight_number || trip.flight_number}
                                                                    </Badge>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs font-normal">
                                                    {trip.vehicle_type_category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {trip.passenger_count}
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs text-gray-600 block max-w-[150px] truncate" title={(trip.additional_items || []).map(i => i.name).join(', ')}>
                                                    {(trip.additional_items || []).map(i => i.name).join(', ') || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-gray-900">
                                                R$ {trip.finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Additional Expenses Table */}
            {stats.allAdditionalItems.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-gray-500" /> Detalhamento de Despesas Adicionais
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50">
                                        <TableHead>Viagem</TableHead>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead className="text-center">Qtd</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.allAdditionalItems.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{item.trip_name}</TableCell>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell className="text-xs text-gray-500 max-w-[200px] truncate" title={item.notes}>{item.notes || '-'}</TableCell>
                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                            <TableCell className="text-right font-medium">
                                                R$ {item.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Passenger List Preview - Grouped by Trip */}
            <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5" /> Detalhamento de Passageiros por Viagem
                </h3>

                {stats.tripsWithPrice.map(trip => {
                    const tripPassengers = stats.sortedPassengers.filter(p => p.event_trip_id === trip.id);
                    if (tripPassengers.length === 0) return null;

                    const additionalExpenses = (trip.additional_items || []).reduce((acc, item) => acc + (item.total_price || 0), 0);

                    return (
                        <Card key={trip.id} className="overflow-hidden border-l-4 border-l-blue-500">
                            <CardHeader className="bg-gray-50 py-3 px-4">
                                <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-2">
                                    <div>
                                        <CardTitle className="text-base font-bold text-blue-900 flex items-center gap-2">
                                            {trip.name} 
                                            <Badge variant="outline" className="text-xs font-normal text-gray-600 bg-white ml-2">
                                                {trip.trip_code || 'Sem Cód'}
                                            </Badge>
                                        </CardTitle>
                                        <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {safeFormat(trip.date, 'dd/MM/yyyy')}</span>
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {trip.start_time}</span>
                                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {trip.origin} &rarr; {trip.destination}</span>
                                            <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {trip.vehicle_type_category}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-gray-900">Total Viagem: R$ {trip.finalPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                                        <div className="text-xs text-gray-500">
                                            (Viagem: R$ {(trip.client_price || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})} + 
                                            Extras: R$ {additionalExpenses.toLocaleString('pt-BR', {minimumFractionDigits: 2})})
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[30%]">Passageiro</TableHead>
                                            <TableHead>Voo</TableHead>
                                            <TableHead>Itens Cobrados</TableHead>
                                            <TableHead className="text-right">Valor</TableHead>
                                            <TableHead className="text-right">Extras</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead className="text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tripPassengers.map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-medium">
                                                    <div>{p.passenger_name}</div>
                                                    <div className="text-[10px] text-gray-500">{p.document_id}</div>
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {p.flight_number ? (
                                                        <div className="flex flex-col">
                                                            <span>{p.flight_number}</span>
                                                            <span className="text-gray-500">{p.time || p.flight_time}</span>
                                                        </div>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell className="text-xs text-gray-600 max-w-[200px] truncate">
                                                    {(trip.additional_items || []).map(i => i.name).join(', ') || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs text-right whitespace-nowrap">
                                                    R$ {(trip.client_price || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                                </TableCell>
                                                <TableCell className="text-xs text-right whitespace-nowrap">
                                                    R$ {additionalExpenses.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                                </TableCell>
                                                <TableCell className="text-xs text-right font-medium whitespace-nowrap">
                                                    R$ {trip.finalPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant={p.status === 'assigned' ? 'secondary' : 'outline'} className="text-[10px]">
                                                        {p.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    );
                })}

                {/* Unassigned Passengers */}
                {(() => {
                    const unassignedPax = stats.sortedPassengers.filter(p => !p.event_trip_id);
                    if (unassignedPax.length === 0) return null;
                    return (
                        <Card className="overflow-hidden border-l-4 border-l-orange-500 mt-8">
                            <CardHeader className="bg-orange-50 py-3 px-4">
                                <CardTitle className="text-base font-bold text-orange-900 flex items-center gap-2">
                                    Passageiros Não Alocados / Pendentes
                                    <Badge variant="secondary" className="ml-2 bg-orange-200 text-orange-800">{unassignedPax.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Passageiro</TableHead>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Hora</TableHead>
                                            <TableHead>Voo</TableHead>
                                            <TableHead>Origem</TableHead>
                                            <TableHead>Destino</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {unassignedPax.map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-medium">{p.passenger_name}</TableCell>
                                                <TableCell className="text-xs">{safeFormat(p.date || p.flight_date, 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="text-xs">{p.time || p.flight_time || '-'}</TableCell>
                                                <TableCell className="text-xs">{p.flight_number || '-'}</TableCell>
                                                <TableCell className="text-xs max-w-[150px] truncate" title={p.origin_address}>{p.origin_address || '-'}</TableCell>
                                                <TableCell className="text-xs max-w-[150px] truncate" title={p.destination_address}>{p.destination_address || '-'}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                                                        {p.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    );
                })()}
            </div>
        </div>
    );
}