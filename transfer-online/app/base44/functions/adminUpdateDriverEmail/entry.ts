import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check if user is admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { driverId, email } = await req.json();

    if (!driverId || !email) {
      return Response.json({ error: 'Driver ID and Email are required' }, { status: 400 });
    }

    // 1. Update Driver entity
    await base44.entities.Driver.update(driverId, { email });

    // 2. Invite user (create account) if not exists
    // inviteUser sends an invite email. If user exists, it might send a "you're invited" or handle gracefully.
    // However, if the goal is just to enable password recovery, creating the user is enough.
    // inviteUser creates the user record if it doesn't exist.
    
    let inviteResult = null;
    try {
        // Using asServiceRole might be needed if the admin user technically doesn't have invite permissions 
        // (though admins usually do). Safe to use sdk directly if admin.
        // But let's use asServiceRole to be sure we bypass any complex permission checks for 'invite'.
        // Actually base44.users.inviteUser is usually available.
        
        // Note: SDK documentation says base44.users.inviteUser(email, role).
        await base44.users.inviteUser(email, 'user');
        inviteResult = "User invited/created";
    } catch (inviteError) {
        console.error("Error inviting user:", inviteError);
        // If error is "User already exists", that's fine.
        // We'll proceed.
        inviteResult = "User invite skipped or failed: " + inviteError.message;
    }

    return Response.json({ 
        success: true, 
        message: 'Driver email updated and user invite triggered.',
        inviteResult 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});