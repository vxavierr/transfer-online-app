import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as XLSX from 'npm:xlsx';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apenas admin, fornecedor ou gestor de eventos podem importar
    if (user.role !== 'admin' && !user.supplier_id && !user.event_access_active) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      eventData, 
      fileBase64,
      rowsData, // Novo parâmetro para dados brutos do frontend
      headers, // Headers para mapeamento (se rowsData vier do frontend)
      targetEventId, 
      importMode = 'create_new',
      batchStartIndex = 0 // Índice inicial para relatórios de erro precisos
    } = body;

    // Modo especial: Apenas criar evento
    if (importMode === 'create_event_only') {
        if (!eventData) return Response.json({ error: 'Dados do evento são obrigatórios' }, { status: 400 });
        
        const supplierId = user.supplier_id || eventData?.supplier_id;
        if (!supplierId && !user.event_access_active && user.role !== 'admin') {
            return Response.json({ error: 'Supplier ID necessário' }, { status: 400 });
        }

        const event = await base44.entities.Event.create({
            ...eventData,
            supplier_id: supplierId || null,
            status: 'active'
        });
        return Response.json({ success: true, eventId: event.id });
    }

    if (!fileBase64 && !rowsData) {
      return Response.json({ error: 'Arquivo ou dados são obrigatórios' }, { status: 400 });
    }

    let eventId = targetEventId;
    let event = null;

    // 1. Criar ou Recuperar o Evento (Lógica original, caso não use create_event_only)
    const supplierId = user.supplier_id || eventData?.supplier_id;

    if (importMode === 'create_new') {
    if (!eventData) {
        return Response.json({ error: 'Dados do evento são obrigatórios para criação' }, { status: 400 });
    }

    // Se for admin ou fornecedor, supplierId é esperado, mas se for gestor de eventos, pode criar sem supplier inicialmente
    // Ajuste: Permitir criar sem supplier_id se for gestor de eventos
    if (!supplierId && !user.event_access_active && user.role !== 'admin') {
       return Response.json({ error: 'Supplier ID necessário' }, { status: 400 });
    }

    event = await base44.entities.Event.create({
      ...eventData,
      supplier_id: supplierId || null,
      status: 'active'
    });
        eventId = event.id;
    } else {
        // Modo Append/Update
        if (!eventId) {
            return Response.json({ error: 'ID do evento é obrigatório para atualização' }, { status: 400 });
        }
        // Verificar se evento existe e pertence ao fornecedor (segurança)
        try {
            event = await base44.entities.Event.get(eventId);
            if (!event) throw new Error("Evento não encontrado");
            
            // Validação de permissão para atualização
            const isAdmin = user.role === 'admin';
            const isOwnerSupplier = user.supplier_id && event.supplier_id === user.supplier_id;
            const isEventManager = user.event_access_active && event.manager_user_id === user.id;

            if (!isAdmin && !isOwnerSupplier && !isEventManager) {
                 return Response.json({ error: 'Acesso negado a este evento' }, { status: 403 });
            }
        } catch (e) {
            return Response.json({ error: 'Evento não encontrado ou inválido' }, { status: 404 });
        }
    }

    // 2. Processar Dados (Excel ou JSON direto)
    let rawDataToProcess = [];
    let headersToUse = headers || [];
    let isPreParsed = false;

    if (rowsData) {
        // Dados já processados/parseados do frontend (em lotes)
        // Se vier como array de arrays
        if (Array.isArray(rowsData[0])) {
             rawDataToProcess = rowsData;
             // headersToUse já deve ter vindo no payload
        } else {
             // Se vier como array de objetos já (não deve acontecer com xlsx frontend raw, mas por segurança)
             // Assumimos que o frontend já normalizou ou mandou raw
             // Melhor tratar como raw array para manter lógica de mapping consistente
             rawDataToProcess = rowsData; 
             isPreParsed = true; 
        }
    } else {
        // Converter base64 para buffer (Legacy / Full Upload)
        const binaryString = atob(fileBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const workbook = XLSX.read(bytes, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Leitura inteligente para encontrar o cabeçalho
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        let headerRowIndex = 0;
        
        // Procurar a linha que parece ser o cabeçalho
        for (let i = 0; i < Math.min(rawData.length, 20); i++) {
            const row = rawData[i];
            if (!row || !Array.isArray(row)) continue;
            
            const rowString = row.join(' ').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if ((rowString.includes('nome') || rowString.includes('passageiro') || rowString.includes('name')) && 
                (rowString.includes('data') || rowString.includes('date') || rowString.includes('dia') || rowString.includes('hora'))) {
                headerRowIndex = i;
                headersToUse = row;
                break;
            }
        }
        
        if (headersToUse.length === 0 && rawData.length > 0) {
            headersToUse = rawData[0];
        }
        
        // Cortar apenas os dados
        rawDataToProcess = rawData.slice(headerRowIndex + 1);
    }

    const passengersToCreate = [];
    const errors = [];

    // Função auxiliar para normalizar texto (Title Case e Trim)
    const normalizeText = (text) => {
        if (!text || typeof text !== 'string') return text;
        return text.trim().toLowerCase().split(/\s+/).map(word => {
            if (word.length <= 2 && !['in', 'on', 'at', 'to', 'da', 'de', 'do'].includes(word)) { // Mantém preposições curtas em minúsculo se desejar, mas Title Case simples é mais seguro para consistência
                // return word; 
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    };

    // Processar dados
    for (let i = 0; i < rawDataToProcess.length; i++) {
      const rowArray = rawDataToProcess[i];
      if (!rowArray || (Array.isArray(rowArray) && rowArray.length === 0)) continue; 

      // Criar objeto usando o cabeçalho encontrado
      const row = {};
      
      if (Array.isArray(rowArray)) {
          headersToUse.forEach((header, index) => {
              if (header && rowArray[index] !== undefined) {
                  row[header] = rowArray[index];
              }
          });
      } else {
          // Se já for objeto
          Object.assign(row, rowArray);
      }
      
      // Tentativa de normalizar chaves (lower case, remove acentos)
      const normalizedRow = {};
      Object.keys(row).forEach(key => {
        if (typeof key === 'string') {
            const cleanKey = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            normalizedRow[cleanKey] = row[key];
        }
      });

      // Extração de dados com fallbacks (Melhorado para casos de campos vazios/nomes variados)
      const rawName = normalizedRow['nome'] || normalizedRow['passageiro'] || normalizedRow['name'] || normalizedRow['passenger'] || normalizedRow['nome completo'];
      const name = normalizeText(rawName);
      const dateRaw = normalizedRow['data'] || normalizedRow['date'] || normalizedRow['dia'] || normalizedRow['data voo'] || normalizedRow['data do voo'];
      const timeRaw = normalizedRow['hora'] || normalizedRow['horario'] || normalizedRow['time'] || normalizedRow['hora voo'] || normalizedRow['horario do voo'] || normalizedRow['horario de apresentacao'] || normalizedRow['saida'];
      
      const currentLine = batchStartIndex ? (batchStartIndex + i) : (i + 2);

      if (!name) {
        errors.push(`LINHA ${currentLine}: Nome do passageiro não encontrado`);
        continue;
      }
      if (!dateRaw) {
        errors.push(`PASSAGEIRO: ${name} - MOTIVO: Data da viagem não encontrada (Linha ${currentLine})`);
        continue;
      }

      // Tratamento de Data (Excel serial ou string)
      let dateStr = dateRaw;
      if (typeof dateRaw === 'number') {
         // Converter serial excel date
         // Ajuste de fuso horário simples para evitar pular dia
         const dateObj = new Date(Math.round((dateRaw - 25569) * 86400 * 1000) + (12 * 3600 * 1000));
         dateStr = dateObj.toISOString().split('T')[0];
      } else if (typeof dateRaw === 'string') {
          // Tentar converter DD/MM/YYYY ou DD-MM-YYYY
          // Limpar espaços extras
          const dateClean = dateRaw.trim();
          
          if (dateClean.includes('/')) {
              const parts = dateClean.split('/');
              if (parts.length === 3) {
                  let year = parts[2];
                  if (year.length === 2) year = '20' + year;
                  dateStr = `${year}-${parts[1]}-${parts[0]}`;
              }
          } else if (dateClean.includes('-')) {
             // Caso venha como DD-MM-YYYY ou YYYY-MM-DD
             const parts = dateClean.split('-');
             if (parts.length === 3) {
                 if (parts[0].length === 4) {
                     // Já está YYYY-MM-DD
                     dateStr = dateClean;
                 } else {
                     // Assumir DD-MM-YYYY
                     let year = parts[2];
                     if (year.length === 2) year = '20' + year;
                     dateStr = `${year}-${parts[1]}-${parts[0]}`;
                 }
             }
          }
      }

      // Validar se a data final é válida
      if (!dateStr || dateStr.toString() === 'Invalid Date' || isNaN(new Date(dateStr).getTime())) {
          errors.push(`PASSAGEIRO: ${name} - MOTIVO: Formato de data inválido "${dateRaw}" (Linha ${currentLine})`);
          continue;
      }

      // Tratamento de Hora (Excel serial ou string)
      let timeStr = timeRaw;
      if (typeof timeRaw === 'number') {
          // Fração do dia
          const totalSeconds = Math.round(timeRaw * 86400);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      } else if (!timeStr) {
          timeStr = '00:00';
      }

      // Determinar tipo de viagem/segmento
      // Prioridade: Coluna da planilha (se existir) > Padrão do evento
      let tripType = 'door_to_door';
      
      // Procurar pela coluna de tipo com vários nomes possíveis
      const typeRaw = normalizedRow['tipo (in/out)'] || normalizedRow['tipo'] || normalizedRow['type'] || normalizedRow['trip'] || normalizedRow['transfer_type'];
      
      if (typeRaw) {
          const typeVal = typeRaw.toString().toUpperCase().trim();
          if (typeVal === 'IN' || typeVal.includes('CHEGADA') || typeVal.includes('ARRIVAL')) {
               tripType = 'IN'; // Chegada / Airport Transfer IN
          } else if (typeVal === 'OUT' || typeVal.includes('SAIDA') || typeVal.includes('DEPARTURE') || typeVal.includes('PARTIDA')) {
               tripType = 'OUT'; // Saída / Airport Transfer OUT
          } else if (typeVal.includes('PORTA') || typeVal.includes('DOOR')) {
              tripType = 'door_to_door';
          } else if (typeVal.includes('AERO') || typeVal.includes('VOO') || typeVal.includes('FLIGHT')) {
              // Se só diz 'Aero', assumimos IN se não especificado, ou mantemos genérico
              tripType = 'IN'; 
          }
      } else {
          // Inferência Inteligente (Heurística) se não houver coluna de tipo
          const originCheck = (normalizedRow['origem'] || normalizedRow['aeroporto'] || normalizedRow['origin'] || normalizedRow['chegada'] || normalizedRow['arrival'] || normalizedRow['partida'] || normalizedRow['local de apresentacao'] || '').toString().toUpperCase();
          const destCheck = (normalizedRow['destino'] || normalizedRow['hotel'] || normalizedRow['endereco'] || normalizedRow['destination'] || '').toString().toUpperCase();
          
          const airportKeywords = ['AEROPORTO', 'AIRPORT', 'AERO', 'GRU', 'CGH', 'VCP', 'GIG', 'SDU', 'BSB', 'CNF', 'FLN', 'POA', 'CWB', 'SSA', 'REC', 'FOR', 'BEL', 'MAO', 'GYN', 'CGB', 'NVT', 'MCZ', 'NAT'];

          const originIsAirport = airportKeywords.some(k => originCheck.includes(k));
          const destIsAirport = airportKeywords.some(k => destCheck.includes(k));

          if (originIsAirport && !destIsAirport) {
              tripType = 'IN'; // Sai do aeroporto -> Chegada
          } else if (destIsAirport && !originIsAirport) {
              tripType = 'OUT'; // Vai para aeroporto -> Saída
          } else {
              // Fallback original se não conseguir inferir
              if (eventData.event_type === 'airport_arrivals') tripType = 'IN';
              else if (eventData.event_type === 'door_to_door') tripType = 'door_to_door';
              else tripType = 'IN'; 
          }
      }

      const passengerData = {
        event_id: eventId,
        passenger_name: name,
        document_id: (normalizedRow['rg'] || normalizedRow['cpf'] || normalizedRow['documento']) ? String(normalizedRow['rg'] || normalizedRow['cpf'] || normalizedRow['documento']).replace(/\D/g, '') : undefined, // Remove caracteres não numéricos do documento
        passenger_email: (normalizedRow['email'] || normalizedRow['e-mail'] || '').toLowerCase().trim() || undefined,
        passenger_phone: (normalizedRow['telefone'] || normalizedRow['celular'] || normalizedRow['phone']) ? String(normalizedRow['telefone'] || normalizedRow['celular'] || normalizedRow['phone']) : undefined,
        passenger_city_origin: normalizeText(normalizedRow['cidade_origem_do_passageiro'] || normalizedRow['cidade origem'] || normalizedRow['proveniencia']),
        
        date: dateStr,
        time: timeStr,
        trip_type: tripType,
        status: 'pending',
        destination_address: normalizeText(normalizedRow['destino'] || normalizedRow['hotel'] || normalizedRow['endereco'] || normalizedRow['destination'] || 'A definir'),
      };

      // Processamento de Acompanhantes
      const isCompanionRaw = normalizedRow['acompanhante?'] || normalizedRow['acompanhante'] || normalizedRow['is_companion'] || normalizedRow['e acompanhante'];
      const mainPassengerNameRaw = normalizedRow['passageiro principal'] || normalizedRow['nome passageiro principal'] || normalizedRow['responsavel'] || normalizedRow['main_passenger'] || normalizedRow['main_passenger_name'];
      const relationshipRaw = normalizedRow['relacao'] || normalizedRow['relacionamento'] || normalizedRow['relationship'] || normalizedRow['parentesco'];

      if (isCompanionRaw) {
          const val = String(isCompanionRaw).toLowerCase().trim();
          if (val === 'sim' || val === 'yes' || val === 's' || val === 'y' || val === '1' || val === 'true') {
              passengerData.is_companion = true;
              passengerData.temp_main_passenger_name = mainPassengerNameRaw; // Temporário para linkagem posterior
              passengerData.companion_relationship = relationshipRaw;
          }
      }

      const originRaw = normalizedRow['origem'] || normalizedRow['aeroporto'] || normalizedRow['origin'] || normalizedRow['chegada'] || normalizedRow['arrival'] || normalizedRow['partida'] || normalizedRow['local de apresentacao'];
      
      const flightNumberRaw = normalizedRow['voo'] || normalizedRow['numero voo'] || normalizedRow['n voo'] || normalizedRow['flight'] || normalizedRow['flight number'] || '';
      const airlineRaw = normalizedRow['cia'] || normalizedRow['companhia'] || normalizedRow['airline'] || normalizedRow['cia aerea'] || '';

      // Ajustar campos com base no tipo
      const normalizedOrigin = normalizeText(originRaw);
      const normalizedAirline = normalizeText(airlineRaw);
      const normalizedFlightNumber = String(flightNumberRaw).toUpperCase().trim(); // Voo geralmente é maiúsculo (ex: LA3000)

      if (tripType === 'IN') {
          // Chegada: Origem é Aeroporto/Voo, Destino é Hotel/Endereço
          passengerData.arrival_point = normalizedOrigin || 'Aeroporto (A definir)'; 
          passengerData.flight_date = dateStr;
          passengerData.flight_time = timeStr;
          passengerData.airline = normalizedAirline;
          passengerData.flight_number = normalizedFlightNumber;
      } else if (tripType === 'OUT') {
          // Saída: Origem é Hotel/Endereço, Destino é Aeroporto
          passengerData.origin_address = normalizedOrigin || 'Origem (A definir)';
          passengerData.destination_address = normalizeText(normalizedRow['destino'] || 'Aeroporto');
          passengerData.flight_date = dateStr; 
          passengerData.airline = normalizedAirline;
          passengerData.flight_number = normalizedFlightNumber;
      } else {
          // Door to door
          passengerData.origin_address = normalizedOrigin || 'Origem (A definir)';
          passengerData.arrival_point = normalizedOrigin || 'Origem (A definir)'; 
      }

      passengersToCreate.push(passengerData);
    }

    // 4. Inserir ou Atualizar Passageiros (Upsert Logic com Prioridade para Principais)
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Separar lista em Principais e Acompanhantes
    const mainList = passengersToCreate.filter(p => !p.is_companion);
    const companionList = passengersToCreate.filter(p => p.is_companion);
    
    // Função auxiliar para processar um chunk de passageiros
    const processChunk = async (chunk, currentExistingPassengers) => {
        const promises = chunk.map(async (p) => {
            // Se for acompanhante e tiver nome do principal, tentar vincular agora
            if (p.is_companion && p.temp_main_passenger_name) {
                const mainPax = currentExistingPassengers.find(ep => 
                    ep.passenger_name.toLowerCase().trim() === p.temp_main_passenger_name.toLowerCase().trim()
                    // Idealmente checaríamos data/voo também, mas geralmente acompanhante viaja junto
                    // Para simplificar e evitar falsos negativos, buscamos pelo nome no mesmo evento.
                    // Se houver homônimos, pega o primeiro encontrado (limitação aceitável para importação simples)
                );
                
                if (mainPax) {
                    p.main_passenger_id = mainPax.id;
                }
                // Remove campo temporário
                delete p.temp_main_passenger_name;
            } else if (p.temp_main_passenger_name) {
                 delete p.temp_main_passenger_name;
            }

            let match = null;
            
            // DEDUPLICAÇÃO DESATIVADA: Importar tudo sempre (será tratado posteriormente)
            /*
            if (p.document_id) {
                match = currentExistingPassengers.find(ep => 
                    ep.document_id === p.document_id && 
                    ep.trip_type === p.trip_type &&
                    ep.date === p.date &&
                    ep.time === p.time &&
                    (ep.origin_address || '') === (p.origin_address || '') &&
                    (ep.destination_address || '') === (p.destination_address || '') &&
                    (ep.flight_number || '') === (p.flight_number || '')
                );
            }
            
            if (!match) {
                match = currentExistingPassengers.find(ep => 
                    ep.passenger_name.toLowerCase().trim() === p.passenger_name.toLowerCase().trim() &&
                    ep.trip_type === p.trip_type &&
                    ep.date === p.date &&
                    ep.time === p.time &&
                    (ep.origin_address || '') === (p.origin_address || '') &&
                    (ep.destination_address || '') === (p.destination_address || '') &&
                    (ep.flight_number || '') === (p.flight_number || '')
                );
            }
            */

            if (match) {
                await base44.entities.EventPassenger.update(match.id, {
                    ...p,
                    status: match.status
                });
                return 'updated';
            } else {
                try {
                    await base44.entities.EventPassenger.create(p);
                    return 'created';
                } catch (err) {
                    if (err.message && (err.message.includes('Rate limit') || err.message.includes('429') || err.message.includes('502') || err.message.includes('connection error') || err.message.includes('timeout') || err.message.includes('503') || err.message.includes('504'))) {
                        await new Promise(r => setTimeout(r, 2000));
                        try {
                            await base44.entities.EventPassenger.create(p);
                            return 'created';
                        } catch (retryErr) {
                             await new Promise(r => setTimeout(r, 4000));
                             await base44.entities.EventPassenger.create(p);
                             return 'created';
                        }
                    }
                    throw err;
                }
            }
        });
        
        return Promise.allSettled(promises);
    };

    // --- FASE 1: Processar Principais ---
    // Buscar existentes iniciais
    let existingPassengers = await base44.entities.EventPassenger.filter({ event_id: eventId }, '-created_date', 5000);
    
    const chunkSize = 5; 
    
    for (let i = 0; i < mainList.length; i += chunkSize) {
        const chunk = mainList.slice(i, i + chunkSize);
        const results = await processChunk(chunk, existingPassengers);
        
        results.forEach((result, idx) => {
            if (result.status === 'rejected') {
                const p = chunk[idx];
                errors.push(`PASSAGEIRO: ${p.passenger_name} - MOTIVO: Erro ao salvar (${result.reason.message || 'Erro desconhecido'})`);
            } else {
                if (result.value === 'updated') updatedCount++;
                else createdCount++;
            }
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // --- FASE 2: Processar Acompanhantes ---
    // Recarregar existentes para garantir que os principais recém-criados estejam disponíveis para vínculo
    if (companionList.length > 0) {
        existingPassengers = await base44.entities.EventPassenger.filter({ event_id: eventId }, '-created_date', 5000);
        
        for (let i = 0; i < companionList.length; i += chunkSize) {
            const chunk = companionList.slice(i, i + chunkSize);
            const results = await processChunk(chunk, existingPassengers);
            
            results.forEach((result, idx) => {
                if (result.status === 'rejected') {
                    const p = chunk[idx];
                    errors.push(`PASSAGEIRO: ${p.passenger_name} - MOTIVO: Erro ao salvar acompanhante (${result.reason.message || 'Erro desconhecido'})`);
                } else {
                    if (result.value === 'updated') updatedCount++;
                    else createdCount++;
                }
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // Calcular linhas ignoradas (total recebido - processados com sucesso/erro)
    // No caso atual, rawDataToProcess pode ter linhas vazias que foram puladas no passo 3 (antes de entrar no passengersToCreate)
    // passengersToCreate tem apenas as linhas válidas.
    // skippedCount = rawDataToProcess.length - passengersToCreate.length; 
    // Mas o frontend quer saber o status do batch enviado.
    skippedCount = rawDataToProcess.length - passengersToCreate.length;

    // ATUALIZAR CONTAGEM TOTAL DE PASSAGEIROS NO EVENTO
    let currentTotalCount = 0;
    try {
        // Usar um limite alto para tentar pegar todos (até 10k)
        const allPassengers = await base44.entities.EventPassenger.filter({ event_id: eventId }, '-created_date', 10000); 
        currentTotalCount = allPassengers.length;
        await base44.entities.Event.update(eventId, { passenger_count: currentTotalCount });
    } catch (e) {
        console.warn("Erro ao atualizar contagem de passageiros:", e);
    }

    return Response.json({ 
      success: true, 
      eventId: eventId, 
      totalRows: rawDataToProcess.length, // Total de linhas no lote recebido
      processedCount: createdCount, // Renomeado para clareza (apenas novos)
      createdCount: createdCount,
      updatedCount: updatedCount,
      skippedCount: skippedCount,
      errors: errors,
      currentTotalCount // Retornar total atualizado para o frontend
    });

  } catch (error) {
    console.error("Erro crítico na importação:", error);
    return Response.json({ error: `Erro interno: ${error.message}` }, { status: 500 });
  }
});