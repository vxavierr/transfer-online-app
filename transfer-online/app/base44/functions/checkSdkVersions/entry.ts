import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const TARGET_VERSION = '0.8.20';
const CRON_SECRET = Deno.env.get('CRON_SECRET');

// Registry of all backend functions and their known SDK versions.
// Status is derived: 'current' | 'outdated' | 'needs_audit' | 'frozen'
// Update this list whenever a function is created, updated, or fixed.
const FUNCTION_REGISTRY = [
  // === VERIFIED CURRENT (0.8.20) ===
  { name: 'generateAndSendRatingLink', version: '0.8.20', frozen: false },
  { name: 'sendTripStatusNotification', version: '0.8.20', frozen: false },
  { name: 'submitServiceRequest', version: '0.8.20', frozen: false },
  { name: 'calculateMultiSupplierPrices', version: '0.8.20', frozen: false },
  { name: 'checkDriverReminders', version: '0.8.20', frozen: false },
  { name: 'getTripDetailsByToken', version: '0.8.20', frozen: false },
  { name: 'finalizeDriverTrip', version: '0.8.20', frozen: false },
  { name: 'updateTripStatus', version: '0.8.20', frozen: false },
  { name: 'generateServiceRequestNumber', version: '0.8.20', frozen: false },
  { name: 'sendBookingEmail', version: '0.8.20', frozen: false },
  { name: 'sendDriverInfoToPassengers', version: '0.8.20', frozen: false },
  { name: 'createSupplierOwnBooking', version: '0.8.20', frozen: false },
  { name: 'sendSupplierQuoteNotification', version: '0.8.20', frozen: false },
  { name: 'updateServiceRequestDriverInfo', version: '0.8.20', frozen: false },
  { name: 'approveServiceRequestExpenses', version: '0.8.20', frozen: false },
  { name: 'consultarViagem', version: '0.8.20', frozen: false },
  { name: 'sendWhatsAppMessage', version: '0.8.20', frozen: false },
  { name: 'checkServiceRequestTimeouts', version: '0.8.20', frozen: false },
  { name: 'generateSharedTimelineLink', version: '0.8.20', frozen: false },
  { name: 'notifyDriverAboutTrip', version: '0.8.20', frozen: false },
  { name: 'notifyDriverArrival', version: '0.8.20', frozen: false },
  { name: 'sendDriverTripReminders', version: '0.8.20', frozen: false },
  { name: 'submitRating', version: '0.8.20', frozen: false },
  { name: 'submitRatingByToken', version: '0.8.20', frozen: false },
  { name: 'supplierAcceptRejectRequest', version: '0.8.20', frozen: false },
  { name: 'syncFrequentRequesterData', version: '0.8.20', frozen: false },
  { name: 'checkSdkVersions', version: '0.8.20', frozen: false },

  // === PREVIOUSLY FROZEN - Agora descongeladas, aguardam auditoria ===
  { name: 'manualSendDriverReminder', version: 'unknown', frozen: false },
  { name: 'calculateTransferPrice', version: 'unknown', frozen: false },
  { name: 'calculateDistance', version: 'unknown', frozen: false },
  { name: 'changePassword', version: 'unknown', frozen: false },
  { name: 'resendPaymentLink', version: 'unknown', frozen: false },
  { name: 'placesAutocomplete', version: 'unknown', frozen: false },
  { name: 'sendWhatsAppBookingNotification', version: 'unknown', frozen: false },
  { name: 'sendWhatsAppQuoteNotification', version: 'unknown', frozen: false },
  { name: 'sendDriverInfoNotification', version: 'unknown', frozen: false },

  // === NEEDS AUDIT - Ainda não verificadas ===
  { name: 'acceptDriverTerms', version: 'unknown', frozen: false },
  { name: 'acknowledgeDriverTrip', version: 'unknown', frozen: false },
  { name: 'addPassengerComment', version: 'unknown', frozen: false },
  { name: 'addPassengerToRequest', version: 'unknown', frozen: false },
  { name: 'addPassengersToEventTrip', version: 'unknown', frozen: false },
  { name: 'addTripComment', version: 'unknown', frozen: false },
  { name: 'adminDeleteUser', version: 'unknown', frozen: false },
  { name: 'adminManualSendRating', version: 'unknown', frozen: false },
  { name: 'adminUpdateDriverEmail', version: 'unknown', frozen: false },
  { name: 'approveEmployeeInvitation', version: 'unknown', frozen: false },
  { name: 'assignPassengerToFlexibleVehicle', version: 'unknown', frozen: false },
  { name: 'bulkDeletePassengers', version: 'unknown', frozen: false },
  { name: 'bulkUpdateFlexibleAllocation', version: 'unknown', frozen: false },
  { name: 'calculateETA', version: 'unknown', frozen: false },
  { name: 'calculateSupplierOwnBookingPrice', version: 'unknown', frozen: false },
  { name: 'calculateSupplierOwnBookingQuotes', version: 'unknown', frozen: false },
  { name: 'calculateSupplierPrice', version: 'unknown', frozen: false },
  { name: 'cancelEventTrip', version: 'unknown', frozen: false },
  { name: 'checkAbandonedLeads', version: 'unknown', frozen: false },
  { name: 'checkDocumentExpiry', version: 'unknown', frozen: false },
  { name: 'checkDriverImpediments', version: 'unknown', frozen: false },
  { name: 'checkDuplicateTrips', version: 'unknown', frozen: false },
  { name: 'checkFlightStatus', version: 'unknown', frozen: false },
  { name: 'checkSupplierDocumentAlerts', version: 'unknown', frozen: false },
  { name: 'checkSystemIntegrations', version: 'unknown', frozen: false },
  { name: 'checkZenviaStatus', version: 'unknown', frozen: false },
  { name: 'clearEventData', version: 'unknown', frozen: false },
  { name: 'cloneEventTrip', version: 'unknown', frozen: false },
  { name: 'confirmSubcontractorAssignment', version: 'unknown', frozen: false },
  { name: 'convertBookingToServiceRequest', version: 'unknown', frozen: false },
  { name: 'convertLeadToCheckout', version: 'unknown', frozen: false },
  { name: 'convertQuoteToTrip', version: 'unknown', frozen: false },
  { name: 'createGuestBookingAndStripeCheckout', version: 'unknown', frozen: false },
  { name: 'createManualEventTrip', version: 'unknown', frozen: false },
  { name: 'createPaymentIntent', version: 'unknown', frozen: false },
  { name: 'createPaymentLinkForQuote', version: 'unknown', frozen: false },
  { name: 'createSharedTripList', version: 'unknown', frozen: false },
  { name: 'createStripeCheckoutSession', version: 'unknown', frozen: false },
  { name: 'createSupplierInvoice', version: 'unknown', frozen: false },
  { name: 'deleteEventFull', version: 'unknown', frozen: false },
  { name: 'deleteUserAccount', version: 'unknown', frozen: false },
  { name: 'exportPendingTrips', version: 'unknown', frozen: false },
  { name: 'extractCNHData', version: 'unknown', frozen: false },
  { name: 'fetchSharedTimeline', version: 'unknown', frozen: false },
  { name: 'finalizeEventTrip', version: 'unknown', frozen: false },
  { name: 'findUserByEmail', version: 'unknown', frozen: false },
  { name: 'generateAILogistics', version: 'unknown', frozen: false },
  { name: 'generateBoardingPass', version: 'unknown', frozen: false },
  { name: 'generateBookingNumber', version: 'unknown', frozen: false },
  { name: 'generateBulkPaymentLink', version: 'unknown', frozen: false },
  { name: 'generateDriverNotificationPreview', version: 'unknown', frozen: false },
  { name: 'generateDriverTermsLink', version: 'unknown', frozen: false },
  { name: 'generateEventImportTemplate', version: 'unknown', frozen: false },
  { name: 'generateEventReceptiveLink', version: 'unknown', frozen: false },
  { name: 'generateEventTripShareLink', version: 'unknown', frozen: false },
  { name: 'generateGoogleCalendarLink', version: 'unknown', frozen: false },
  { name: 'generateMileageReportPDF', version: 'unknown', frozen: false },
  { name: 'generateQuoteNumber', version: 'unknown', frozen: false },
  { name: 'generateQuotePDF', version: 'unknown', frozen: false },
  { name: 'generateQuotePublicToken', version: 'unknown', frozen: false },
  { name: 'generateReceptiveListToken', version: 'unknown', frozen: false },
  { name: 'generateServiceOrderPDF', version: 'unknown', frozen: false },
  { name: 'generateServiceRequestPaymentLink', version: 'unknown', frozen: false },
  { name: 'generateSupplierInvoiceNumber', version: 'unknown', frozen: false },
  { name: 'generateSupplierInvoicePDF', version: 'unknown', frozen: false },
  { name: 'generateSupplierOwnBookingPaymentLink', version: 'unknown', frozen: false },
  { name: 'getBoardingPassPublic', version: 'unknown', frozen: false },
  { name: 'getBrasiliaTime', version: 'unknown', frozen: false },
  { name: 'getDriverApprovalFlow', version: 'unknown', frozen: false },
  { name: 'getDriverByTermsToken', version: 'unknown', frozen: false },
  { name: 'getDriverFinancialSummary', version: 'unknown', frozen: false },
  { name: 'getDriverMessages', version: 'unknown', frozen: false },
  { name: 'getDriverSchedule', version: 'unknown', frozen: false },
  { name: 'getEventClientDashboardByToken', version: 'unknown', frozen: false },
  { name: 'getEventFinancialReport', version: 'unknown', frozen: false },
  { name: 'getEventReceptiveListByToken', version: 'unknown', frozen: false },
  { name: 'getInvitationPublicInfo', version: 'unknown', frozen: false },
  { name: 'getPassengerNamesForAutocomplete', version: 'unknown', frozen: false },
  { name: 'getPublicConfig', version: 'unknown', frozen: false },
  { name: 'getQuoteByToken', version: 'unknown', frozen: false },
  { name: 'getRatingInfoByToken', version: 'unknown', frozen: false },
  { name: 'getReceptiveListByToken', version: 'unknown', frozen: false },
  { name: 'getSharedEventTrip', version: 'unknown', frozen: false },
  { name: 'getSharedTripList', version: 'unknown', frozen: false },
  { name: 'getSubcontractorQuoteDetails', version: 'unknown', frozen: false },
  { name: 'groupEventPassengers', version: 'unknown', frozen: false },
  { name: 'handleGuestStripeCheckoutSuccess', version: 'unknown', frozen: false },
  { name: 'importEventData', version: 'unknown', frozen: false },
  { name: 'initiateCorporateDriverApproval', version: 'unknown', frozen: false },
  { name: 'listAllUsers', version: 'unknown', frozen: false },
  { name: 'listClientUsers', version: 'unknown', frozen: false },
  { name: 'listDriverPayouts', version: 'unknown', frozen: false },
  { name: 'listSubcontractorPayments', version: 'unknown', frozen: false },
  { name: 'managePassenger', version: 'unknown', frozen: false },
  { name: 'markDriverPayoutAsPaid', version: 'unknown', frozen: false },
  { name: 'notifyDriverAboutCancellation', version: 'unknown', frozen: false },
  { name: 'notifySupplierAboutUpdate', version: 'unknown', frozen: false },
  { name: 'processCheckIn', version: 'unknown', frozen: false },
  { name: 'processDriverApproval', version: 'unknown', frozen: false },
  { name: 'processExternalInvoiceReview', version: 'unknown', frozen: false },
  { name: 'processInvitationAcceptance', version: 'unknown', frozen: false },
  { name: 'propagatePassengerRelationship', version: 'unknown', frozen: false },
  { name: 'recoverAbandonedCarts', version: 'unknown', frozen: false },
  { name: 'refreshTripETA', version: 'unknown', frozen: false },
  { name: 'refundPayment', version: 'unknown', frozen: false },
  { name: 'rejectEmployeeInvitation', version: 'unknown', frozen: false },
  { name: 'removePassengerFromTrip', version: 'unknown', frozen: false },
  { name: 'requestSubcontractorQuote', version: 'unknown', frozen: false },
  { name: 'resendCorporateApprovalLink', version: 'unknown', frozen: false },
  { name: 'resendEmployeeInvitation', version: 'unknown', frozen: false },
  { name: 'reviewSubcontractorInfo', version: 'unknown', frozen: false },
  { name: 'saveBookingLead', version: 'unknown', frozen: false },
  { name: 'savePushSubscription', version: 'unknown', frozen: false },
  { name: 'sendBoardingPassEmail', version: 'unknown', frozen: false },
  { name: 'sendBoardingPassEmailResend', version: 'unknown', frozen: false },
  { name: 'sendBoardingPassSMS', version: 'unknown', frozen: false },
  { name: 'sendBoardingPassWhatsApp', version: 'unknown', frozen: false },
  { name: 'sendBookingDetailsToDriver', version: 'unknown', frozen: false },
  { name: 'sendDriverMessage', version: 'unknown', frozen: false },
  { name: 'sendExternalInvoiceReviewEmail', version: 'unknown', frozen: false },
  { name: 'sendPushNotification', version: 'unknown', frozen: false },
  { name: 'sendQuoteRequestEmails', version: 'unknown', frozen: false },
  { name: 'sendQuoteResponseEmail', version: 'unknown', frozen: false },
  { name: 'sendSupplierOwnBookingDetailsToDriver', version: 'unknown', frozen: false },
  { name: 'sendSupplierOwnBookingDriverInfoNotification', version: 'unknown', frozen: false },
  { name: 'sendTripInfoToPassenger', version: 'unknown', frozen: false },
  { name: 'sendWhatsAppInvitation', version: 'unknown', frozen: false },
  { name: 'stripeWebhookHandler', version: 'unknown', frozen: false },
  { name: 'submitLeadRequest', version: 'unknown', frozen: false },
  { name: 'submitQuoteRequest', version: 'unknown', frozen: false },
  { name: 'submitSubcontractorQuote', version: 'unknown', frozen: false },
  { name: 'submitSupplierDriverInfo', version: 'unknown', frozen: false },
  { name: 'submitSupplierQuoteCost', version: 'unknown', frozen: false },
  { name: 'syncEventCounts', version: 'unknown', frozen: false },
  { name: 'telemetry', version: 'unknown', frozen: false },
  { name: 'toggleFavoriteDriver', version: 'unknown', frozen: false },
  { name: 'toggleSharedListActive', version: 'unknown', frozen: false },
  { name: 'trackSupplierBookingUsage', version: 'unknown', frozen: false },
  { name: 'transferPassengerBetweenTrips', version: 'unknown', frozen: false },
  { name: 'ungroupEventTrip', version: 'unknown', frozen: false },
  { name: 'updateBookingLead', version: 'unknown', frozen: false },
  { name: 'updateDriverLocation', version: 'unknown', frozen: false },
  { name: 'updateEventPassenger', version: 'unknown', frozen: false },
  { name: 'updateEventTripAdditionalItems', version: 'unknown', frozen: false },
  { name: 'updateEventTripDateTime', version: 'unknown', frozen: false },
  { name: 'updateEventTripDriver', version: 'unknown', frozen: false },
  { name: 'updateEventTripStatus', version: 'unknown', frozen: false },
  { name: 'updatePassengerDepartureStatus', version: 'unknown', frozen: false },
  { name: 'updateQuoteResponse', version: 'unknown', frozen: false },
  { name: 'updateReceptivityStatus', version: 'unknown', frozen: false },
  { name: 'updateSharedListValidity', version: 'unknown', frozen: false },
  { name: 'updateSubcontractorDriverInfo', version: 'unknown', frozen: false },
  { name: 'updateSubcontractorPayment', version: 'unknown', frozen: false },
  { name: 'validateCoupon', version: 'unknown', frozen: false },
  { name: 'verifyDocumentWithAI', version: 'unknown', frozen: false },
];

function getStatus(entry) {
  if (entry.frozen) return 'frozen';
  if (entry.version === 'unknown') return 'needs_audit';
  if (entry.version === TARGET_VERSION) return 'current';
  return 'outdated';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { sendAlert, cronSecret } = body;

    // Auth: aceita admin logado OU cron secret
    const isCron = cronSecret && CRON_SECRET && cronSecret === CRON_SECRET;
    if (!isCron) {
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Acesso negado' }, { status: 403 });
      }
    }

    // Buscar lista de funções aprovadas pelo admin via applySDKCorrections
    let approvedFunctions = [];
    try {
      const configs = await base44.asServiceRole.entities.AppConfig.filter({ config_key: 'sdk_approved_functions' });
      if (configs.length > 0) {
        approvedFunctions = JSON.parse(configs[0].config_value);
      }
    } catch (e) {
      console.warn('[checkSdkVersions] Erro ao ler approved functions:', e);
    }

    // Processar registry: funções aprovadas pelo admin são tratadas como 'current'
    const enriched = FUNCTION_REGISTRY.map(entry => {
      const isApproved = approvedFunctions.includes(entry.name);
      const effectiveEntry = isApproved ? { ...entry, version: TARGET_VERSION, frozen: false } : entry;
      return {
        ...effectiveEntry,
        status: getStatus(effectiveEntry),
        target_version: TARGET_VERSION,
      };
    });

    const stats = {
      total: enriched.length,
      current: enriched.filter(f => f.status === 'current').length,
      outdated: enriched.filter(f => f.status === 'outdated').length,
      needs_audit: enriched.filter(f => f.status === 'needs_audit').length,
      frozen: enriched.filter(f => f.status === 'frozen').length,
    };

    const outdatedFunctions = enriched.filter(f => f.status === 'outdated');
    const needsAuditFunctions = enriched.filter(f => f.status === 'needs_audit');
    const hasIssues = stats.outdated > 0 || stats.needs_audit > 0;

    // Enviar alerta se solicitado ou se automático e há problemas
    if ((sendAlert || isCron) && hasIssues) {
      const adminPhone = Deno.env.get('WHATSAPP_ADMIN_NUMBER');
      const apiUrl = Deno.env.get('EVOLUTION_API_URL');
      const apiKey = Deno.env.get('EVOLUTION_API_KEY');
      const instanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME');
      const clientToken = Deno.env.get('EVOLUTION_CLIENT_TOKEN');

      let message = `⚠️ *Alerta SDK - TransferOnline*\n\n`;
      message += `📊 *Resumo da Auditoria (${new Date().toLocaleDateString('pt-BR')})*\n`;
      message += `✅ Atualizadas: ${stats.current}\n`;
      message += `🔴 Desatualizadas: ${stats.outdated}\n`;
      message += `🔍 Precisam de auditoria: ${stats.needs_audit}\n`;
      message += `🔒 Congeladas: ${stats.frozen}\n\n`;
      message += `🎯 *Versão alvo: @base44/sdk@${TARGET_VERSION}*\n\n`;

      if (outdatedFunctions.length > 0) {
        message += `🔴 *Funções DESATUALIZADAS:*\n`;
        outdatedFunctions.slice(0, 10).forEach(f => {
          message += `• ${f.name} (${f.version})\n`;
        });
        if (outdatedFunctions.length > 10) {
          message += `...e mais ${outdatedFunctions.length - 10}\n`;
        }
        message += '\n';
      }

      if (stats.needs_audit > 0) {
        message += `🔍 *${stats.needs_audit} funções aguardando auditoria.*\n`;
        message += `Acesse Monitoramento do Sistema para detalhes.\n`;
      }

      // Enviar WhatsApp
      if (adminPhone && apiUrl && apiKey && instanceName) {
        try {
          let phone = adminPhone.replace(/\D/g, '');
          if (!phone.startsWith('55')) phone = '55' + phone;

          let baseUrl = apiUrl.trim();
          while (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

          const headers = { 'Content-Type': 'application/json' };
          if (clientToken) headers['Client-Token'] = clientToken;

          await fetch(`${baseUrl}/instances/${instanceName}/token/${apiKey}/send-text`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ phone, message }),
          });
        } catch (e) {
          console.error('[checkSdkVersions] Erro ao enviar WhatsApp:', e);
        }
      }

      // Enviar email também
      try {
        const adminEmail = Deno.env.get('RESEND_FROM') || 'no-reply@transferonline.com.br';
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: adminEmail,
          subject: `⚠️ Auditoria SDK - ${stats.outdated} desatualizadas, ${stats.needs_audit} pendentes`,
          body: `<pre style="font-family:monospace">${message.replace(/\*/g, '<b>').replace(/\n/g, '<br/>')}</pre>`,
        });
      } catch (e) {
        console.error('[checkSdkVersions] Erro ao enviar email:', e);
      }
    }

    // Log na entidade IntegrationLog
    try {
      await base44.asServiceRole.entities.IntegrationLog.create({
        service_name: 'SDK Version Monitor',
        action: 'audit_sdk_versions',
        status: stats.outdated > 0 ? 'warning' : (stats.needs_audit > 0 ? 'warning' : 'success'),
        message: `Auditoria: ${stats.current} ok, ${stats.outdated} desatualizadas, ${stats.needs_audit} pendentes, ${stats.frozen} congeladas`,
        metadata: { stats, outdated: outdatedFunctions.map(f => f.name), needs_audit_count: stats.needs_audit },
        executed_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[checkSdkVersions] Erro ao salvar log:', e);
    }

    return Response.json({
      success: true,
      target_version: TARGET_VERSION,
      stats,
      functions: enriched,
      checked_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[checkSdkVersions] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});