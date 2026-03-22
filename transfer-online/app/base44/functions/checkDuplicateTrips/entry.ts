import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { passenger_user_id, passenger_email, date, time } = await req.json();

    if (!date) {
      return Response.json({ has_duplicate: false });
    }

    if (!passenger_user_id && !passenger_email) {
      return Response.json({ has_duplicate: false });
    }

    const query = {
      date: date,
      status: { "$nin": ["cancelada", "recusada", "cancelado"] }
    };

    const existingRequests = await base44.asServiceRole.entities.ServiceRequest.filter(query);

    const duplicates = existingRequests.filter(req => {
      const sameId = passenger_user_id && req.passenger_user_id === passenger_user_id;
      const sameEmail = passenger_email && req.passenger_email && 
                        req.passenger_email.toLowerCase() === passenger_email.toLowerCase();
      const sameTime = !time || req.time === time;
      return (sameId || sameEmail) && sameTime;
    });

    if (duplicates.length > 0) {
      const trip = duplicates[0];
      return Response.json({
        has_duplicate: true,
        trip: {
          origin: trip.origin,
          destination: trip.destination,
          time: trip.time,
          request_number: trip.request_number,
          status: trip.status
        },
        message: `⚠️ Atenção: Já existe uma viagem agendada para este passageiro nesta data (${date} às ${trip.time}).\nOrigem: ${trip.origin}\nDestino: ${trip.destination}`
      });
    }

    return Response.json({ has_duplicate: false });

  } catch (error) {
    console.error('[checkDuplicateTrips] Error:', error);
    return Response.json({ has_duplicate: false });
  }
});