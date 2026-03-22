import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const [airportKeywordConfigs, vehicleTypes] = await Promise.all([
            base44.asServiceRole.entities.AppConfig.filter({ config_key: 'airport_keywords' }).catch(() => []),
            base44.asServiceRole.entities.VehicleType.filter({ active: true }).catch(() => [])
        ]);

        return Response.json({
            googleMapsApiKey: Deno.env.get("GOOGLE_MAPS_API_KEY") || "",
            stripePublishableKey: Deno.env.get("STRIPE_PUBLISHABLE_KEY") || "",
            publicPricing: {
                enabled: true
            },
            airportKeywords: airportKeywordConfigs[0]?.config_value || null,
            vehicleTypes: Array.isArray(vehicleTypes)
                ? vehicleTypes.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                : []
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});