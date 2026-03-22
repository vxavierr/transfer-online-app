import { createClientFromRequest } from 'npm:@base44/sdk@0.8.3';
import * as XLSX from 'npm:xlsx';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Headers baseados nos campos esperados pelo importador
        const headers = [
            "Nome",
            "Email",
            "Cidade Origem",
            "Tipo (IN/OUT)",
            "Data", 
            "Hora", 
            "Voo", 
            "Cia", 
            "Origem",
            "Destino",
            "Telefone",
            "Documento",
            "Observações",
            "Acompanhante? (Sim/Não)",
            "Passageiro Principal",
            "Relação"
        ];

        // Dados de exemplo para facilitar o entendimento
        const exampleData = [
            [
                "João Silva", 
                "joao.silva@exemplo.com",
                "São Paulo",
                "IN",
                "25/12/2025", 
                "14:30", 
                "LA3000", 
                "Latam", 
                "Aeroporto de Guarulhos (GRU)", 
                "Hotel Hilton Morumbi",
                "11999999999",
                "123.456.789-00",
                "Passageiro VIP - Chegada",
                "Não",
                "",
                ""
            ],
            [
                "Maria Souza", 
                "maria.souza@exemplo.com",
                "Rio de Janeiro",
                "OUT",
                "28/12/2025", 
                "10:00", 
                "LA3001", 
                "Latam", 
                "Hotel Hilton Morumbi",
                "Aeroporto de Guarulhos (GRU)",
                "11988888888",
                "987.654.321-00",
                "Passageiro VIP - Saída",
                "Sim",
                "João Silva",
                "Esposa"
            ]
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleData]);

        // Ajustar largura das colunas
        ws['!cols'] = headers.map(() => ({ wch: 25 }));

        XLSX.utils.book_append_sheet(wb, ws, "Modelo");

        // Alterado para 'base64' para evitar corrupção no transporte via JSON
        const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

        return Response.json({ 
            success: true,
            filename: "modelo_importacao_eventos.xlsx",
            fileBase64: base64
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});