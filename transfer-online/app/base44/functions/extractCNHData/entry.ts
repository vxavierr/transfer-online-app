import { createClientFromRequest } from 'npm:@base44/sdk@0.8.12';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Permitir se for admin ou fornecedor (para cadastro)
    if (!user || (user.role !== 'admin' && !user.supplier_id)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'File URL is required' }, { status: 400 });
    }

    // Usar a integração ExtractDataFromUploadedFile para OCR da CNH
    const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: file_url,
      json_schema: {
        "type": "object",
        "properties": {
          "nome_completo": { "type": "string" },
          "numero_registro": { "type": "string", "description": "Número de registro da CNH" },
          "cpf": { "type": "string" },
          "data_nascimento": { "type": "string", "format": "date" },
          "data_validade": { "type": "string", "format": "date" },
          "categoria": { "type": "string" },
          "data_primeira_habilitacao": { "type": "string", "format": "date" }
        },
        "required": ["nome_completo", "numero_registro", "data_validade"]
      }
    });

    if (extractionResult.status === 'error') {
      return Response.json({ 
        success: false, 
        error: extractionResult.details 
      });
    }

    return Response.json({ 
      success: true, 
      data: extractionResult.output 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});