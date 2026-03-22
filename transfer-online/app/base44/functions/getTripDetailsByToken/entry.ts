import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ensureArray = (value) => Array.isArray(value) ? value : [];

const normalizeTripData = (trip, tripType) => {
  const normalizedTrip = {
    ...trip,
    planned_stops: ensureArray(trip?.planned_stops),
    additional_stops: ensureArray(trip?.additional_stops),
    passengers_details: ensureArray(trip?.passengers_details),
    notification_phones: ensureArray(trip?.notification_phones),
    command_history: ensureArray(trip?.command_history)
  };

  if (tripType === 'direct') {
    normalizedTrip.driver_trip_status = normalizedTrip.driver_current_status || normalizedTrip.driver_trip_status || 'aguardando';
  } else {
    normalizedTrip.driver_trip_status = normalizedTrip.driver_trip_status || 'aguardando';
  }

  if (!normalizedTrip.request_number && normalizedTrip.booking_number) {
    normalizedTrip.request_number = normalizedTrip.booking_number;
  }

  return normalizedTrip;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Esta função é pública, pois usa um token seguro na URL
    // Não requer autenticação de usuário (auth.me)

    const body = await req.json();
    const { token } = body;

    if (!token) {
      return Response.json({ error: 'Token é obrigatório' }, { status: 400 });
    }

    let trip = null;
    let tripType = 'platform';

    try {
      const serviceRequests = await base44.asServiceRole.entities.ServiceRequest.filter({
        driver_access_token: token
      });

      if (Array.isArray(serviceRequests) && serviceRequests.length > 0) {
        trip = serviceRequests[0];
      }
    } catch (e) {
      console.error('[getTripDetailsByToken] Erro ao buscar ServiceRequest:', e);
    }

    if (!trip) {
      try {
        const ownBookings = await base44.asServiceRole.entities.SupplierOwnBooking.filter({
          driver_access_token: token
        });

        if (Array.isArray(ownBookings) && ownBookings.length > 0) {
          trip = ownBookings[0];
          tripType = 'own';
          trip.request_number = trip.booking_number;
        }
      } catch (e) {
        console.error('[getTripDetailsByToken] Erro ao buscar SupplierOwnBooking:', e);
      }
    }

    if (!trip) {
      try {
        const eventTrips = await base44.asServiceRole.entities.EventTrip.filter({
          driver_access_token: token
        });

        if (Array.isArray(eventTrips) && eventTrips.length > 0) {
          trip = eventTrips[0];
          tripType = 'event';
          trip.request_number = trip.name || `EV-${trip.id?.substring(0, 8) || 'SEMID'}`;
          trip.time = trip.start_time;
          trip.passengers = trip.passenger_count || 0;

          try {
            const passengers = await base44.asServiceRole.entities.EventPassenger.filter({
              event_trip_id: trip.id
            });

            if (Array.isArray(passengers) && passengers.length > 0) {
              trip.passenger_name = passengers.map(p => p.passenger_name || 'Passageiro').join(', ');

              const organizer = passengers.find(p => Array.isArray(p.tags) && (p.tags.includes('ORGANIZADORA') || p.tags.includes('ORGANIZADOR') || p.tags.includes('RESPONSAVEL')) && (p.passenger_phone || p.passenger_email));
              const firstWithPhone = passengers.find(p => p.passenger_phone && p.passenger_phone.length > 5);
              const firstWithEmail = passengers.find(p => p.passenger_email && p.passenger_email.includes('@'));

              trip.passenger_phone = organizer?.passenger_phone || firstWithPhone?.passenger_phone || passengers[0]?.passenger_phone || null;
              trip.passenger_email = organizer?.passenger_email || firstWithEmail?.passenger_email || passengers[0]?.passenger_email || null;
              trip.passengers_details = passengers.map(p => ({
                name: p.passenger_name,
                phone: p.passenger_phone,
                email: p.passenger_email,
                tags: Array.isArray(p.tags) ? p.tags : []
              }));

              const allTags = passengers.reduce((acc, p) => {
                if (Array.isArray(p.tags)) {
                  p.tags.forEach(tag => {
                    if (!acc.includes(tag)) acc.push(tag);
                  });
                }
                return acc;
              }, []);
              trip.tags = allTags;

              for (const p of passengers) {
                if (p.flight_number && (p.trip_type === 'IN' || p.trip_type === 'arrival') && !trip.event_origin_flight_number) {
                  trip.event_origin_flight_number = p.flight_number;
                  trip.event_origin_airline = p.airline;
                }
                if (p.flight_number && (p.trip_type === 'OUT' || p.trip_type === 'departure') && !trip.event_destination_flight_number) {
                  trip.event_destination_flight_number = p.flight_number;
                  trip.event_destination_airline = p.airline;
                }
                if (trip.event_origin_flight_number && trip.event_destination_flight_number) break;
              }
            } else {
              trip.passenger_name = 'Grupo';
              trip.passenger_email = null;
              trip.passenger_phone = null;
            }
          } catch (e) {
            console.warn('[getTripDetailsByToken] Erro ao buscar passageiros do evento:', e);
            trip.passenger_name = 'Grupo';
            trip.passenger_email = null;
            trip.passenger_phone = null;
          }
        }
      } catch (e) {
        console.error('[getTripDetailsByToken] Erro ao buscar EventTrip:', e);
      }
    }

    if (!trip) {
      try {
        const bookings = await base44.asServiceRole.entities.Booking.filter({
          driver_access_token: token
        });

        if (Array.isArray(bookings) && bookings.length > 0) {
          trip = bookings[0];
          tripType = 'direct';
          trip.request_number = trip.booking_number;
          trip.passenger_name = trip.customer_name;
          trip.passenger_phone = trip.customer_phone;
          trip.passenger_email = trip.customer_email;
        }
      } catch (e) {
        console.error('[getTripDetailsByToken] Erro ao buscar Booking:', e);
      }
    }

    if (trip) {
      trip = normalizeTripData(trip, tripType);
    }

    if (!trip) {
      return Response.json({ error: 'Viagem não encontrada ou link inválido' }, { status: 404 });
    }

    // 4. Buscar dados do Cliente (se houver client_id)
    let clientData = null;
    if (trip.client_id) {
      try {
        if (tripType === 'own') {
          const ownClients = await base44.asServiceRole.entities.SupplierOwnClient.filter({ id: trip.client_id });
          if (Array.isArray(ownClients) && ownClients.length > 0) {
            clientData = {
              name: ownClients[0].name,
            };
          }
        } else {
          const clients = await base44.asServiceRole.entities.Client.filter({ id: trip.client_id });
          if (Array.isArray(clients) && clients.length > 0) {
            clientData = {
              name: clients[0].name,
            };
          }
        }
      } catch (e) {
        console.warn('[getTripDetailsByToken] Erro ao buscar cliente:', e);
      }
    }

    // Retornar dados combinados
    return Response.json({
      success: true,
      trip: {
        ...normalizeTripData(trip, tripType),
        type: tripType
      },
      client: clientData
    });

  } catch (error) {
    console.error('[getTripDetailsByToken] Erro:', error);
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
});