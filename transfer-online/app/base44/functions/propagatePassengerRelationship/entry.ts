import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sourcePassengerId } = await req.json();

    if (!sourcePassengerId) {
      return Response.json({ error: 'Source Passenger ID is required' }, { status: 400 });
    }

    // 1. Buscar o passageiro que acabou de ser editado (Source)
    const sourcePax = await base44.entities.EventPassenger.get(sourcePassengerId);
    if (!sourcePax) return Response.json({ error: 'Passenger not found' }, { status: 404 });

    const eventId = sourcePax.event_id;
    let updatedCount = 0;

    // Função auxiliar para buscar todas as viagens de uma pessoa no evento
    const fetchPersonTrips = async (name, doc) => {
        let trips = [];
        if (doc) {
            trips = await base44.entities.EventPassenger.filter({ 
                event_id: eventId,
                document_id: doc
            }, '-created_date', 300); // Limite seguro
        } else if (name) {
            trips = await base44.entities.EventPassenger.filter({ 
                event_id: eventId,
                passenger_name: name 
            }, '-created_date', 300);
        }
        
        // Filtro em memória para garantir exatidão (caso filtro por nome traga parecidos)
        return trips.filter(p => {
            if (doc && p.document_id === doc) return true;
            if (!doc && p.passenger_name?.trim().toLowerCase() === name?.trim().toLowerCase()) return true;
            return false;
        });
    };

    // Identidade do Source (Quem estamos editando)
    const sourceName = sourcePax.passenger_name?.trim();
    const sourceDoc = sourcePax.document_id?.trim();
    const sourceTags = sourcePax.tags || [];

    // Buscar todas as viagens dessa pessoa (Source Trips)
    const allSourceTrips = await fetchPersonTrips(sourceName, sourceDoc);

    // Preparar dados do Principal (se houver) para otimizar busca
    let allMainTrips = [];
    let relationship = null;
    let mainPaxRef = null;

    if (sourcePax.is_companion && sourcePax.main_passenger_id) {
        mainPaxRef = await base44.entities.EventPassenger.get(sourcePax.main_passenger_id);
        if (mainPaxRef) {
            const mainName = mainPaxRef.passenger_name?.trim();
            const mainDoc = mainPaxRef.document_id?.trim();
            relationship = sourcePax.companion_relationship;
            allMainTrips = await fetchPersonTrips(mainName, mainDoc);
        }
    }

    // Processar todas as viagens do passageiro
    for (const myTrip of allSourceTrips) {
        if (myTrip.id === sourcePax.id) continue; // Pula a atual já editada

        let updateData = {};

        // 1. Propagar Tags
        const currentTags = myTrip.tags || [];
        // Comparação simples de arrays ordenados
        const tagsChanged = JSON.stringify(currentTags.sort()) !== JSON.stringify([...sourceTags].sort());
        if (tagsChanged) {
            updateData.tags = sourceTags;
        }

        // 2. Propagar Relacionamento
        if (sourcePax.is_companion && mainPaxRef) {
            // --- CENÁRIO: VINCULAR (Tornou-se acompanhante) ---
            const matchingMainTrip = allMainTrips.find(mt => 
                mt.date === myTrip.date && 
                mt.trip_type === myTrip.trip_type
            );

            if (matchingMainTrip) {
                if (myTrip.main_passenger_id !== matchingMainTrip.id || !myTrip.is_companion) {
                    updateData.is_companion = true;
                    updateData.main_passenger_id = matchingMainTrip.id;
                    updateData.companion_relationship = relationship;
                }
            }
        } else {
            // --- CENÁRIO: DESVINCULAR (Deixou de ser acompanhante ou é Principal) ---
            if (myTrip.is_companion) {
                updateData.is_companion = false;
                updateData.main_passenger_id = null;
                updateData.companion_relationship = null;
            }
        }

        // Se houver atualizações, aplicar
        if (Object.keys(updateData).length > 0) {
            await base44.entities.EventPassenger.update(myTrip.id, updateData);
            updatedCount++;
        }
    }

    // EXTRA: PROPAGAR PARA "MEUS" ACOMPANHANTES
    // (Lógica mantida para garantir que acompanhantes sigam o principal)
    
    // 1. Coletar IDs das viagens da Vanessa
    const myTripIds = allSourceTrips.map(t => t.id);
    
    // 2. Buscar passageiros que apontam para esses IDs (Acompanhantes Existentes)
    const allEventCompanions = await base44.entities.EventPassenger.filter({
        event_id: eventId,
        is_companion: true
    }, '-created_date', 1000);

    const myCompanions = allEventCompanions.filter(p => myTripIds.includes(p.main_passenger_id));

    // Agrupar acompanhantes por identidade (Nome/Doc) para processar cada pessoa uma vez
    const uniqueCompanions = {};
    myCompanions.forEach(comp => {
        const key = comp.document_id || comp.passenger_name;
        if (!uniqueCompanions[key]) uniqueCompanions[key] = comp;
    });

    for (const compRef of Object.values(uniqueCompanions)) {
        const compName = compRef.passenger_name?.trim();
        const compDoc = compRef.document_id?.trim();
        const compRel = compRef.companion_relationship;

        const compTrips = await fetchPersonTrips(compName, compDoc);

        for (const compTrip of compTrips) {
            if (myTripIds.includes(compTrip.main_passenger_id)) continue;

            const matchingMyTrip = allSourceTrips.find(mt => 
                mt.date === compTrip.date && 
                mt.trip_type === compTrip.trip_type
            );

            if (matchingMyTrip) {
                if (compTrip.main_passenger_id !== matchingMyTrip.id) {
                    await base44.entities.EventPassenger.update(compTrip.id, {
                        is_companion: true,
                        main_passenger_id: matchingMyTrip.id,
                        companion_relationship: compRel
                    });
                    updatedCount++;
                }
            }
        }
    }

    return Response.json({ success: true, updatedCount });

  } catch (error) {
    console.error('Error propagating relationship:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});