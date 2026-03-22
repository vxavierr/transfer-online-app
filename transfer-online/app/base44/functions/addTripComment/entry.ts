import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    
    console.log('DEBUG addTripComment user:', JSON.stringify(user));

    if (!user) {
      return Response.json({ error: 'Unauthorized: No user found' }, { status: 401 });
    }

    const email = user.email?.toLowerCase().trim() || '';
    // Permitir email específico do super admin (case insensitive) e a versão com typo relatada
    const isSuperAdmin = email === 'fernandotransferonline@gmail.com' || email === 'fernandottansferonline@gmail.com';
    
    // Verificar se é admin do sistema
    const isAdmin = user.role === 'admin';
    
    // Verificar se é "Master" (Admin de Cliente Corporativo)
    const isMaster = user.client_corporate_role === 'master' || user.client_corporate_role === 'admin_client';
    
    // Verificar se é Admin de Fornecedor
    const isSupplierAdmin = user.supplier_role === 'manager' || user.supplier_role === 'admin';

    console.log(`DEBUG Permissions: email=${email}, isSuperAdmin=${isSuperAdmin}, isAdmin=${isAdmin}, isMaster=${isMaster}, isSupplierAdmin=${isSupplierAdmin}`);

    if (!isAdmin && !isSuperAdmin && !isMaster && !isSupplierAdmin) {
      console.error(`User ${email} denied access to add comment. Role: ${user.role}`);
      return Response.json({ error: 'Unauthorized: Insufficient permissions' }, { status: 403 });
    }

    const { trip_id, trip_type, comment } = await req.json();

    if (!trip_id || !trip_type || !comment) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const historyEntry = await base44.asServiceRole.entities.TripHistory.create({
      trip_id,
      trip_type,
      event_type: 'Comentário Admin',
      user_id: user.id,
      user_name: user.full_name || email,
      comment,
      details: {}
    });

    return Response.json({ success: true, historyEntry });

  } catch (error) {
    console.error('Error adding trip comment:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});