import { createClientFromRequest } from 'npm:@base44/sdk@0.8.12';

Deno.serve(async (req) => {
    try {
        if (req.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, Client-Token',
                }
            });
        }

        const base44 = createClientFromRequest(req);
        const { query } = await req.json();

        if (!query || query.length < 3) {
            return Response.json({ names: [] });
        }

        // Search in EventPassenger for matching names
        // Using a limit to avoid fetching too much data
        // Filter is case-insensitive if the DB supports it, otherwise we might need to fetch more and filter in code
        // Base44 filter usually supports basic operators.
        
        // We will fetch passengers that match the name query
        const passengers = await base44.entities.EventPassenger.filter({
            name: { $regex: query, $options: 'i' }
        }, {}, 50);

        // Extract unique names
        const names = [...new Set(passengers.map(p => p.name))];
        
        // Sort alphabetically
        names.sort();

        return Response.json({ names: names.slice(0, 10) }, {
            headers: { 'Access-Control-Allow-Origin': '*' }
        });

    } catch (error) {
        console.error('Error fetching passenger names:', error);
        return Response.json({ error: error.message }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
});