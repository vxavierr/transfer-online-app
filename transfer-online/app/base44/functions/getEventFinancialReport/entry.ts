import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { eventId } = await req.json();

        if (!eventId) {
            return Response.json({ error: 'Event ID is required' }, { status: 400 });
        }

        // Fetch all trips and passengers for the event
        // Note: Using limit 1000 for now, might need pagination for very large events
        const trips = await base44.entities.EventTrip.filter({ event_id: eventId }, 'date', 1000);
        const passengers = await base44.entities.EventPassenger.filter({ event_id: eventId }, {}, 2000);
        const services = await base44.entities.EventService.filter({ event_id: eventId }, 'service_date');

        // --- Financial Analysis ---
        let totalSupplierCost = 0;
        let totalClientPrice = 0;
        let totalAdditionalCost = 0; // Cost of additional items
        let totalAdditionalPrice = 0; // Price of additional items
        let totalDriverPayout = 0;
        let totalSubcontractorCost = 0;
        let totalServicesRevenue = 0;

        // Calculate Services Revenue
        if (services && services.length > 0) {
            totalServicesRevenue = services.reduce((acc, s) => acc + (s.total_price || 0), 0);
        }

        trips.forEach(trip => {
            if (trip.status !== 'cancelled') {
                const supplierBase = trip.supplier_cost || 0;
                const clientBase = trip.client_price || 0;
                const driverPayout = trip.driver_payout_amount || 0;
                const subcontractorCost = trip.subcontractor_cost || 0;
                
                // Calculate additionals from array
                let tripAddPrice = 0;
                if (trip.additional_items && Array.isArray(trip.additional_items)) {
                    tripAddPrice = trip.additional_items.reduce((sum, item) => sum + (item.total_price || 0), 0);
                }

                // If final prices are set, use them, otherwise calculate
                const finalSupplier = trip.final_supplier_cost || supplierBase; // Assuming add items might be included in final or separate logic. For now simple sum.
                // Actually, let's trust the 'final_' fields if present, otherwise base + additions
                
                // For simplicity in this report logic:
                // We assume 'client_price' is base vehicle price.
                // 'additional_items' are extras.
                
                totalSupplierCost += supplierBase; 
                totalClientPrice += clientBase;
                totalAdditionalPrice += tripAddPrice;
                totalDriverPayout += driverPayout;
                totalSubcontractorCost += subcontractorCost;
            }
        });

        const totalRevenue = totalClientPrice + totalAdditionalPrice + totalServicesRevenue;
        const totalExpenses = totalSupplierCost + totalDriverPayout + totalSubcontractorCost; // Includes Supplier, Driver, and Subcontractor costs
        const projectedMargin = totalRevenue - totalExpenses;

        // --- Operational Analysis ---
        const totalPax = passengers.length;
        const paxIN = passengers.filter(p => p.trip_type === 'IN' || p.trip_type === 'airport_transfer' || (p.trip_type && p.trip_type.includes('IN'))).length;
        const paxOUT = passengers.filter(p => p.trip_type === 'OUT' || (p.trip_type && p.trip_type.includes('OUT'))).length;
        
        // Status counts
        const paxBoarded = passengers.filter(p => p.boarding_status === 'boarded' || p.status === 'completed').length;
        const paxNoShow = passengers.filter(p => p.boarding_status === 'no_show').length;
        const paxCancelled = passengers.filter(p => p.status === 'cancelled').length;
        const paxPending = passengers.filter(p => p.status === 'pending').length;

        // Vehicle Usage
        const vehiclesUsed = trips.filter(t => t.status !== 'cancelled').length;
        const vehicleTypesCount = {};
        
        trips.forEach(t => {
            if (t.status !== 'cancelled') {
                const type = t.vehicle_type_category || 'Indefinido';
                vehicleTypesCount[type] = (vehicleTypesCount[type] || 0) + 1;
            }
        });

        // Additional Costs Breakdown
        const additionalCostsBreakdown = [];
        trips.forEach(t => {
            if (t.additional_items && t.additional_items.length > 0) {
                t.additional_items.forEach(item => {
                    additionalCostsBreakdown.push({
                        trip_name: t.name,
                        date: t.date,
                        item_name: item.name,
                        quantity: item.quantity,
                        total: item.total_price
                    });
                });
            }
        });

        return Response.json({
            success: true,
            financials: {
                totalRevenue,
                totalExpenses,
                projectedMargin,
                totalClientPrice, // Base
                totalSupplierCost, // Base
                totalDriverPayout, // Driver Payments
                totalSubcontractorCost,
                totalAdditionalPrice,
                totalServicesRevenue
            },
            operational: {
                totalPax,
                paxIN,
                paxOUT,
                paxBoarded,
                paxNoShow,
                paxCancelled,
                paxPending,
                vehiclesUsed,
                vehicleTypesCount
            },
            details: {
                additionalCosts: additionalCostsBreakdown,
                eventServices: services || []
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});