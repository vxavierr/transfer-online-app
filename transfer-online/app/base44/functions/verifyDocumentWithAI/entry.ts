import { createClientFromRequest } from 'npm:@base44/sdk@0.8.3';

export default async function verifyDocumentWithAI(req) {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const { file_url, document_type } = await req.json();
        const base44 = createClientFromRequest(req);

        if (!file_url || !document_type) {
            return new Response(JSON.stringify({ error: 'Missing file_url or document_type' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        let prompt = "";
        let jsonSchema = {};

        if (document_type === 'cnh') {
            prompt = `Analyze this Brazilian Driver's License (CNH). Extract the following information:
            - Driver Name (Nome)
            - CNH Number (Nº Registro)
            - Expiry Date (Validade)
            - First License Date (1ª Habilitação)
            - Category (Categoria)
            
            Also check if the document looks authentic and is legible.
            Format the dates as YYYY-MM-DD.
            If you cannot read a field, return null for it.
            `;
            
            jsonSchema = {
                type: "object",
                properties: {
                    driver_name: { type: "string" },
                    cnh_number: { type: "string" },
                    expiry_date: { type: "string", description: "YYYY-MM-DD" },
                    first_license_date: { type: "string", description: "YYYY-MM-DD" },
                    category: { type: "string" },
                    is_legible: { type: "boolean" },
                    is_authentic_looking: { type: "boolean" }
                },
                required: ["is_legible", "is_authentic_looking"]
            };
        } else if (document_type === 'crlv') {
            prompt = `Analyze this Brazilian Vehicle Registration (CRLV-e or physical CRLV). 
            Extract the data strictly into the JSON structure.
            
            Fields to extract:
            - license_plate: Placa
            - vehicle_model: Marca/Modelo (e.g., TOYOTA/COROLLA, HONDA/CIVIC)
            - vehicle_color: Cor (e.g., PRATA, PRETA, BRANCA)
            - vehicle_year: Ano Modelo (Model Year) - extract just the year (e.g. 2023)
            - manufacturing_year: Ano Fabricação
            - licensing_year: Exercício (The year for which the license is valid)
            - owner_name: Nome do Proprietário
            
            Visual Check:
            - is_legible: Can you clearly read the text?
            - is_authentic_looking: Does it look like a valid official document (green paper or digital CRLV-e layout)?
            
            If a field is not found or illegible, return null. 
            For dates, use YYYY-MM-DD format. For years, just YYYY.
            `;

            jsonSchema = {
                type: "object",
                properties: {
                    license_plate: { anyOf: [{ type: "string" }, { type: "null" }] },
                    vehicle_model: { anyOf: [{ type: "string" }, { type: "null" }] },
                    vehicle_color: { anyOf: [{ type: "string" }, { type: "null" }] },
                    vehicle_year: { anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }] },
                    manufacturing_year: { anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }] },
                    licensing_year: { anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }] },
                    owner_name: { anyOf: [{ type: "string" }, { type: "null" }] },
                    is_legible: { type: "boolean" },
                    is_authentic_looking: { type: "boolean" }
                },
                required: ["is_legible", "is_authentic_looking"]
            };
        } else {
            return new Response(JSON.stringify({ error: 'Invalid document_type. Must be "cnh" or "crlv"' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        console.log(`[VerifyDoc] Sending request for ${document_type} with URL: ${file_url}`);
        
        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            file_urls: [file_url],
            response_json_schema: jsonSchema
        });

        console.log(`[VerifyDoc] AI Response:`, JSON.stringify(aiResponse));

        // Validation Logic
        let isValid = true;
        let message = "Documento verificado com sucesso.";
        let expiryDate = null;

        if (!aiResponse.is_legible) {
            isValid = false;
            message = "Não foi possível ler o documento. Por favor, envie uma imagem mais nítida.";
        } else if (!aiResponse.is_authentic_looking) {
            isValid = false;
            message = "O documento não parece autêntico ou não foi reconhecido.";
        } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (document_type === 'cnh') {
                if (aiResponse.expiry_date) {
                    expiryDate = aiResponse.expiry_date;
                    const expDate = new Date(aiResponse.expiry_date);
                    if (expDate < today) {
                        isValid = false;
                        message = `A CNH está vencida (Vencimento: ${aiResponse.expiry_date}).`;
                    }
                } else {
                    isValid = false;
                    message = "Não foi possível identificar a data de validade na CNH.";
                }
            } else if (document_type === 'crlv') {
                if (aiResponse.licensing_year) {
                    const currentYear = today.getFullYear();
                    const docYear = parseInt(aiResponse.licensing_year);
                    // Simple rule: valid if licensing year is current year or last year (grace period depending on state rules, keeping it simple here)
                    // Let's assume valid if year >= currentYear - 1
                    if (docYear < currentYear - 1) {
                        isValid = false;
                        message = `O licenciamento parece estar atrasado (Exercício: ${aiResponse.licensing_year}).`;
                    }
                    // For CRLV we don't have a specific expiry date usually, just the year. 
                    // We can estimate expiry as Dec 31st of the licensing year + some logic, but let's just return the year.
                    // expiryDate = `${docYear}-12-31`; // Removido para permitir entrada manual
                } else {
                    // If licensing year is missing but other data is present, just warn but allow
                    if (aiResponse.license_plate && aiResponse.vehicle_model) {
                         message = "Ano de exercício não identificado, mas dados do veículo foram extraídos.";
                         // Don't fail valid=false if we got main data
                    } else {
                        isValid = false;
                        message = "Não foi possível identificar o ano de exercício ou dados do veículo no CRLV.";
                    }
                }
            }
        }

        return new Response(JSON.stringify({
            isValid,
            message,
            expiryDate,
            extractedData: aiResponse
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}

Deno.serve(verifyDocumentWithAI);