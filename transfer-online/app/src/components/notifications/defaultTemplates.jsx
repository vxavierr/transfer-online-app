export const DEFAULT_TEMPLATES = [
  // ─── PT / WhatsApp ───────────────────────────────────────────────────────────
  {
    event_type: "a_caminho", channel: "whatsapp", language: "pt", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: true,
    description: "WhatsApp PT - Motorista a caminho",
    subject_template: "",
    body_template: "🚗 *Sua Viagem Está a Caminho!*\n\nOlá *{{recipient_name}}*,\n\nSua viagem *{{trip_number}}* está em andamento!\n\n📍 *ROTA*\n🟢 Origem: {{origin}}\n🔴 Destino: {{destination}}\n\n{{#driver_name}}👤 *SEU MOTORISTA*\n{{driver_name}}{{#driver_phone}}\n📞 {{driver_phone}}{{/driver_phone}}{{#vehicle_info}}\n🚗 {{vehicle_info}}{{/vehicle_info}}\n{{/driver_name}}\n{{#timeline_url}}🔍 *Acompanhe a Time Line da Viagem:*\n{{timeline_url}}{{/timeline_url}}\n\n_Esta é uma mensagem automática do TransferOnline_"
  },
  {
    event_type: "chegou_origem", channel: "whatsapp", language: "pt", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "WhatsApp PT - Motorista chegou à origem",
    subject_template: "",
    body_template: "✅ *Motorista chegou ao ponto de partida da viagem {{trip_number}}!*\nOlá *{{recipient_name}}*,\n👤 Passageiro: *{{passenger_name}}*\nO motorista *{{driver_name}}* (carro {{vehicle_info}}) chegou ao ponto de partida.\n{{#timeline_url}}Acompanhe: {{timeline_url}}{{/timeline_url}}"
  },
  {
    event_type: "passageiro_embarcou", channel: "whatsapp", language: "pt", is_enabled: true,
    send_to_passenger: false, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "WhatsApp PT - Passageiro embarcou",
    subject_template: "",
    body_template: "🚀 *Passageiro a bordo! Viagem {{trip_number}} em andamento.*\nOlá *{{recipient_name}}*,\n👤 Passageiro: *{{passenger_name}}*\nO passageiro embarcou com o motorista *{{driver_name}}* (carro {{vehicle_info}}).\n{{#timeline_url}}Acompanhe: {{timeline_url}}{{/timeline_url}}"
  },
  {
    event_type: "chegou_destino", channel: "whatsapp", language: "pt", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "WhatsApp PT - Motorista chegou ao destino",
    subject_template: "",
    body_template: "🎉 *Motorista chegou ao destino da viagem {{trip_number}}.*\nOlá *{{recipient_name}}*,\n👤 Passageiro: *{{passenger_name}}*\nO motorista *{{driver_name}}* (carro {{vehicle_info}}) chegou ao destino.\n{{#timeline_url}}Revise a viagem: {{timeline_url}}{{/timeline_url}}"
  },
  {
    event_type: "finalizada", channel: "whatsapp", language: "pt", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "WhatsApp PT - Viagem finalizada",
    subject_template: "",
    body_template: "✅ *Viagem {{trip_number}} finalizada com sucesso!*\nOlá *{{recipient_name}}*,\n👤 Passageiro: *{{passenger_name}}*\nA viagem foi finalizada com sucesso pelo motorista *{{driver_name}}*.\n{{#timeline_url}}Detalhes: {{timeline_url}}{{/timeline_url}}"
  },

  // ─── PT / Email ───────────────────────────────────────────────────────────────
  {
    event_type: "a_caminho", channel: "email", language: "pt", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: true,
    description: "Email PT - Motorista a caminho",
    subject_template: "🚗 Sua Viagem {{trip_number}} Está a Caminho!",
    body_template: "<p>Olá <strong>{{recipient_name}}</strong>,</p><p>Sua viagem <strong>{{trip_number}}</strong> está em andamento!</p><div style=\"background:#f3f4f6;padding:15px;border-radius:8px;margin:15px 0\"><h3>📍 ROTA</h3><p>🟢 <strong>Origem:</strong> {{origin}}<br>🔴 <strong>Destino:</strong> {{destination}}</p></div>{{#driver_name}}<div style=\"background:#ecfdf5;padding:15px;border-radius:8px;border-left:4px solid #10b981;margin:15px 0\"><h3>👤 SEU MOTORISTA</h3><p><strong>{{driver_name}}</strong>{{#driver_phone}}<br>📞 {{driver_phone}}{{/driver_phone}}{{#vehicle_info}}<br>🚗 {{vehicle_info}}{{/vehicle_info}}</p></div>{{/driver_name}}{{#timeline_url}}<p style=\"text-align:center;margin:20px 0\"><a href=\"{{timeline_url}}\" style=\"background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold\">🔍 Acompanhar Viagem em Tempo Real</a></p>{{/timeline_url}}"
  },
  {
    event_type: "chegou_origem", channel: "email", language: "pt", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "Email PT - Motorista chegou à origem",
    subject_template: "✅ Motorista chegou ao ponto de partida da viagem {{trip_number}}!",
    body_template: "<p>Olá <strong>{{recipient_name}}</strong>,</p><p>O motorista <strong>{{driver_name}}</strong> (carro {{vehicle_info}}) chegou ao ponto de partida da viagem {{trip_number}}.</p>{{#timeline_url}}<p>Acompanhe em tempo real: <a href=\"{{timeline_url}}\">{{timeline_url}}</a></p>{{/timeline_url}}"
  },
  {
    event_type: "passageiro_embarcou", channel: "email", language: "pt", is_enabled: true,
    send_to_passenger: false, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "Email PT - Passageiro embarcou",
    subject_template: "🚀 Passageiro a bordo! Viagem {{trip_number}} em andamento.",
    body_template: "<p>Olá <strong>{{recipient_name}}</strong>,</p><p>O passageiro embarcou na viagem {{trip_number}} com o motorista <strong>{{driver_name}}</strong> (carro {{vehicle_info}}).</p>{{#timeline_url}}<p>Acompanhe: <a href=\"{{timeline_url}}\">{{timeline_url}}</a></p>{{/timeline_url}}"
  },
  {
    event_type: "chegou_destino", channel: "email", language: "pt", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "Email PT - Motorista chegou ao destino",
    subject_template: "🎉 Motorista chegou ao destino da viagem {{trip_number}}.",
    body_template: "<p>Olá <strong>{{recipient_name}}</strong>,</p><p>O motorista <strong>{{driver_name}}</strong> (carro {{vehicle_info}}) chegou ao destino da viagem {{trip_number}}.</p>{{#timeline_url}}<p>Revise a viagem: <a href=\"{{timeline_url}}\">{{timeline_url}}</a></p>{{/timeline_url}}"
  },
  {
    event_type: "finalizada", channel: "email", language: "pt", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "Email PT - Viagem finalizada",
    subject_template: "✅ Viagem {{trip_number}} finalizada com sucesso!",
    body_template: "<p>Olá <strong>{{recipient_name}}</strong>,</p><p>A viagem {{trip_number}} foi finalizada com sucesso pelo motorista <strong>{{driver_name}}</strong> (carro {{vehicle_info}}).</p>{{#timeline_url}}<p>Detalhes: <a href=\"{{timeline_url}}\">{{timeline_url}}</a></p>{{/timeline_url}}"
  },

  // ─── EN / WhatsApp ───────────────────────────────────────────────────────────
  {
    event_type: "a_caminho", channel: "whatsapp", language: "en", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: true,
    description: "WhatsApp EN - Driver on the way",
    subject_template: "",
    body_template: "🚗 *Your Trip is On the Way!*\n\nHello *{{recipient_name}}*,\n\nYour trip *{{trip_number}}* is underway!\n\n📍 *ROUTE*\n🟢 Origin: {{origin}}\n🔴 Destination: {{destination}}\n\n{{#driver_name}}👤 *YOUR DRIVER*\n{{driver_name}}{{#driver_phone}}\n📞 {{driver_phone}}{{/driver_phone}}{{#vehicle_info}}\n🚗 {{vehicle_info}}{{/vehicle_info}}\n{{/driver_name}}\n{{#timeline_url}}🔍 *Track your trip:*\n{{timeline_url}}{{/timeline_url}}\n\n_This is an automated message from TransferOnline_"
  },
  {
    event_type: "chegou_origem", channel: "whatsapp", language: "en", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "WhatsApp EN - Driver arrived at origin",
    subject_template: "",
    body_template: "✅ *Driver arrived at the pickup point for trip {{trip_number}}!*\nHello *{{recipient_name}}*,\n👤 Passenger: *{{passenger_name}}*\nDriver *{{driver_name}}* (car {{vehicle_info}}) has arrived at the pickup point.\n{{#timeline_url}}Track: {{timeline_url}}{{/timeline_url}}"
  },
  {
    event_type: "passageiro_embarcou", channel: "whatsapp", language: "en", is_enabled: true,
    send_to_passenger: false, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "WhatsApp EN - Passenger boarded",
    subject_template: "",
    body_template: "🚀 *Passenger on board! Trip {{trip_number}} is underway.*\nHello *{{recipient_name}}*,\n👤 Passenger: *{{passenger_name}}*\nThe passenger boarded with driver *{{driver_name}}* (car {{vehicle_info}}).\n{{#timeline_url}}Track: {{timeline_url}}{{/timeline_url}}"
  },
  {
    event_type: "chegou_destino", channel: "whatsapp", language: "en", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "WhatsApp EN - Driver arrived at destination",
    subject_template: "",
    body_template: "🎉 *Driver arrived at the destination for trip {{trip_number}}.*\nHello *{{recipient_name}}*,\n👤 Passenger: *{{passenger_name}}*\nDriver *{{driver_name}}* (car {{vehicle_info}}) has arrived at the destination.\n{{#timeline_url}}Review trip: {{timeline_url}}{{/timeline_url}}"
  },
  {
    event_type: "finalizada", channel: "whatsapp", language: "en", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "WhatsApp EN - Trip completed",
    subject_template: "",
    body_template: "✅ *Trip {{trip_number}} completed successfully!*\nHello *{{recipient_name}}*,\n👤 Passenger: *{{passenger_name}}*\nYour trip was completed by driver *{{driver_name}}*.\n{{#timeline_url}}Trip details: {{timeline_url}}{{/timeline_url}}"
  },

  // ─── EN / Email ───────────────────────────────────────────────────────────────
  {
    event_type: "a_caminho", channel: "email", language: "en", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: true,
    description: "Email EN - Driver on the way",
    subject_template: "🚗 Your Trip {{trip_number}} is On the Way!",
    body_template: "<p>Hello <strong>{{recipient_name}}</strong>,</p><p>Your trip <strong>{{trip_number}}</strong> is underway!</p><div style=\"background:#f3f4f6;padding:15px;border-radius:8px;margin:15px 0\"><h3>📍 ROUTE</h3><p>🟢 <strong>Origin:</strong> {{origin}}<br>🔴 <strong>Destination:</strong> {{destination}}</p></div>{{#driver_name}}<div style=\"background:#ecfdf5;padding:15px;border-radius:8px;border-left:4px solid #10b981;margin:15px 0\"><h3>👤 YOUR DRIVER</h3><p><strong>{{driver_name}}</strong>{{#driver_phone}}<br>📞 {{driver_phone}}{{/driver_phone}}{{#vehicle_info}}<br>🚗 {{vehicle_info}}{{/vehicle_info}}</p></div>{{/driver_name}}{{#timeline_url}}<p style=\"text-align:center;margin:20px 0\"><a href=\"{{timeline_url}}\" style=\"background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold\">🔍 Track Your Trip in Real Time</a></p>{{/timeline_url}}"
  },
  {
    event_type: "chegou_origem", channel: "email", language: "en", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "Email EN - Driver arrived at origin",
    subject_template: "✅ Driver arrived at the pickup point for trip {{trip_number}}!",
    body_template: "<p>Hello <strong>{{recipient_name}}</strong>,</p><p>Driver <strong>{{driver_name}}</strong> (car {{vehicle_info}}) has arrived at the pickup point for trip {{trip_number}}.</p>{{#timeline_url}}<p>Track in real time: <a href=\"{{timeline_url}}\">{{timeline_url}}</a></p>{{/timeline_url}}"
  },
  {
    event_type: "passageiro_embarcou", channel: "email", language: "en", is_enabled: true,
    send_to_passenger: false, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "Email EN - Passenger boarded",
    subject_template: "🚀 Passenger on board! Trip {{trip_number}} is underway.",
    body_template: "<p>Hello <strong>{{recipient_name}}</strong>,</p><p>The passenger boarded for trip {{trip_number}} with driver <strong>{{driver_name}}</strong> (car {{vehicle_info}}).</p>{{#timeline_url}}<p>Track: <a href=\"{{timeline_url}}\">{{timeline_url}}</a></p>{{/timeline_url}}"
  },
  {
    event_type: "chegou_destino", channel: "email", language: "en", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "Email EN - Driver arrived at destination",
    subject_template: "🎉 Driver arrived at destination for trip {{trip_number}}.",
    body_template: "<p>Hello <strong>{{recipient_name}}</strong>,</p><p>Driver <strong>{{driver_name}}</strong> (car {{vehicle_info}}) has arrived at the destination for trip {{trip_number}}.</p>{{#timeline_url}}<p>Review trip: <a href=\"{{timeline_url}}\">{{timeline_url}}</a></p>{{/timeline_url}}"
  },
  {
    event_type: "finalizada", channel: "email", language: "en", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "Email EN - Trip completed",
    subject_template: "✅ Trip {{trip_number}} completed successfully!",
    body_template: "<p>Hello <strong>{{recipient_name}}</strong>,</p><p>Trip {{trip_number}} was completed successfully by driver <strong>{{driver_name}}</strong> (car {{vehicle_info}}).</p>{{#timeline_url}}<p>Trip details: <a href=\"{{timeline_url}}\">{{timeline_url}}</a></p>{{/timeline_url}}"
  },

  // ─── ES / WhatsApp ───────────────────────────────────────────────────────────
  {
    event_type: "a_caminho", channel: "whatsapp", language: "es", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: true,
    description: "WhatsApp ES - Conductor en camino",
    subject_template: "",
    body_template: "🚗 *¡Su Viaje Está en Camino!*\n\nHola *{{recipient_name}}*,\n\n¡Su viaje *{{trip_number}}* está en marcha!\n\n📍 *RUTA*\n🟢 Origen: {{origin}}\n🔴 Destino: {{destination}}\n\n{{#driver_name}}👤 *SU CONDUCTOR*\n{{driver_name}}{{#driver_phone}}\n📞 {{driver_phone}}{{/driver_phone}}{{#vehicle_info}}\n🚗 {{vehicle_info}}{{/vehicle_info}}\n{{/driver_name}}\n{{#timeline_url}}🔍 *Siga su viaje:*\n{{timeline_url}}{{/timeline_url}}\n\n_Este es un mensaje automático de TransferOnline_"
  },
  {
    event_type: "chegou_origem", channel: "whatsapp", language: "es", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "WhatsApp ES - Conductor llegó al origen",
    subject_template: "",
    body_template: "✅ *¡El conductor llegó al punto de recogida del viaje {{trip_number}}!*\nHola *{{recipient_name}}*,\n👤 Pasajero: *{{passenger_name}}*\nEl conductor *{{driver_name}}* (carro {{vehicle_info}}) llegó al punto de recogida.\n{{#timeline_url}}Seguimiento: {{timeline_url}}{{/timeline_url}}"
  },
  {
    event_type: "passageiro_embarcou", channel: "whatsapp", language: "es", is_enabled: true,
    send_to_passenger: false, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "WhatsApp ES - Pasajero abordó",
    subject_template: "",
    body_template: "🚀 *¡Pasajero a bordo! El viaje {{trip_number}} está en marcha.*\nHola *{{recipient_name}}*,\n👤 Pasajero: *{{passenger_name}}*\nEl pasajero abordó con el conductor *{{driver_name}}* (carro {{vehicle_info}}).\n{{#timeline_url}}Seguimiento: {{timeline_url}}{{/timeline_url}}"
  },
  {
    event_type: "chegou_destino", channel: "whatsapp", language: "es", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "WhatsApp ES - Conductor llegó al destino",
    subject_template: "",
    body_template: "🎉 *El conductor llegó al destino del viaje {{trip_number}}.*\nHola *{{recipient_name}}*,\n👤 Pasajero: *{{passenger_name}}*\nEl conductor *{{driver_name}}* (carro {{vehicle_info}}) llegó al destino.\n{{#timeline_url}}Revisar viaje: {{timeline_url}}{{/timeline_url}}"
  },
  {
    event_type: "finalizada", channel: "whatsapp", language: "es", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "WhatsApp ES - Viaje finalizado",
    subject_template: "",
    body_template: "✅ *¡Viaje {{trip_number}} finalizado con éxito!*\nHola *{{recipient_name}}*,\n👤 Pasajero: *{{passenger_name}}*\nEl viaje fue finalizado por el conductor *{{driver_name}}*.\n{{#timeline_url}}Detalles: {{timeline_url}}{{/timeline_url}}"
  },

  // ─── ES / Email ───────────────────────────────────────────────────────────────
  {
    event_type: "a_caminho", channel: "email", language: "es", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: true,
    description: "Email ES - Conductor en camino",
    subject_template: "🚗 ¡Su Viaje {{trip_number}} Está en Camino!",
    body_template: "<p>Hola <strong>{{recipient_name}}</strong>,</p><p>¡Su viaje <strong>{{trip_number}}</strong> está en marcha!</p><div style=\"background:#f3f4f6;padding:15px;border-radius:8px;margin:15px 0\"><h3>📍 RUTA</h3><p>🟢 <strong>Origen:</strong> {{origin}}<br>🔴 <strong>Destino:</strong> {{destination}}</p></div>{{#driver_name}}<div style=\"background:#ecfdf5;padding:15px;border-radius:8px;border-left:4px solid #10b981;margin:15px 0\"><h3>👤 SU CONDUCTOR</h3><p><strong>{{driver_name}}</strong>{{#driver_phone}}<br>📞 {{driver_phone}}{{/driver_phone}}{{#vehicle_info}}<br>🚗 {{vehicle_info}}{{/vehicle_info}}</p></div>{{/driver_name}}{{#timeline_url}}<p style=\"text-align:center;margin:20px 0\"><a href=\"{{timeline_url}}\" style=\"background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold\">🔍 Seguir su Viaje en Tiempo Real</a></p>{{/timeline_url}}"
  },
  {
    event_type: "chegou_origem", channel: "email", language: "es", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "Email ES - Conductor llegó al origen",
    subject_template: "✅ ¡El conductor llegó al punto de recogida del viaje {{trip_number}}!",
    body_template: "<p>Hola <strong>{{recipient_name}}</strong>,</p><p>El conductor <strong>{{driver_name}}</strong> (carro {{vehicle_info}}) llegó al punto de recogida del viaje {{trip_number}}.</p>{{#timeline_url}}<p>Seguimiento: <a href=\"{{timeline_url}}\">{{timeline_url}}</a></p>{{/timeline_url}}"
  },
  {
    event_type: "passageiro_embarcou", channel: "email", language: "es", is_enabled: true,
    send_to_passenger: false, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "Email ES - Pasajero abordó",
    subject_template: "🚀 ¡Pasajero a bordo! El viaje {{trip_number}} está en marcha.",
    body_template: "<p>Hola <strong>{{recipient_name}}</strong>,</p><p>El pasajero abordó el viaje {{trip_number}} con el conductor <strong>{{driver_name}}</strong> (carro {{vehicle_info}}).</p>{{#timeline_url}}<p>Seguimiento: <a href=\"{{timeline_url}}\">{{timeline_url}}</a></p>{{/timeline_url}}"
  },
  {
    event_type: "chegou_destino", channel: "email", language: "es", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "Email ES - Conductor llegó al destino",
    subject_template: "🎉 El conductor llegó al destino del viaje {{trip_number}}.",
    body_template: "<p>Hola <strong>{{recipient_name}}</strong>,</p><p>El conductor <strong>{{driver_name}}</strong> (carro {{vehicle_info}}) llegó al destino del viaje {{trip_number}}.</p>{{#timeline_url}}<p>Revisar viaje: <a href=\"{{timeline_url}}\">{{timeline_url}}</a></p>{{/timeline_url}}"
  },
  {
    event_type: "finalizada", channel: "email", language: "es", is_enabled: true,
    send_to_passenger: true, send_to_requester: true, send_to_client_contact: false, send_to_additional_phones: false,
    description: "Email ES - Viaje finalizado",
    subject_template: "✅ ¡Viaje {{trip_number}} finalizado con éxito!",
    body_template: "<p>Hola <strong>{{recipient_name}}</strong>,</p><p>El viaje {{trip_number}} fue finalizado con éxito por el conductor <strong>{{driver_name}}</strong> (carro {{vehicle_info}}).</p>{{#timeline_url}}<p>Detalles: <a href=\"{{timeline_url}}\">{{timeline_url}}</a></p>{{/timeline_url}}"
  },

  // ─── PT / WhatsApp - Lembrete Motorista ──────────────────────────────────────
  {
    event_type: "lembrete_motorista", channel: "whatsapp", language: "pt", is_enabled: true,
    send_to_driver: true, send_to_passenger: false, send_to_requester: false, send_to_client_contact: false, send_to_additional_phones: false,
    description: "WhatsApp PT - Lembrete de viagem ao motorista",
    subject_template: "",
    body_template: "🔔 *Lembrete de Viagem*\n\nOlá {{recipient_name}}, sua viagem é daqui a pouco!\n\n📅 Data: {{date}}\n⏰ Horário: {{time}}\n📍 Origem: {{origin}}\n🏁 Destino: {{destination}}\n👥 Passageiro: {{passenger_name}}\n\n{{#trip_url}}🔗 Acesse os detalhes da viagem:\n{{trip_url}}{{/trip_url}}"
  },
  {
    event_type: "lembrete_motorista", channel: "email", language: "pt", is_enabled: true,
    send_to_driver: true, send_to_passenger: false, send_to_requester: false, send_to_client_contact: false, send_to_additional_phones: false,
    description: "Email PT - Lembrete de viagem ao motorista",
    subject_template: "🔔 Lembrete de Viagem - {{trip_number}}",
    body_template: "<p>Olá <strong>{{recipient_name}}</strong>,</p><p>Sua viagem começa em breve.</p><div style=\"background:#f3f4f6;padding:15px;border-radius:8px;margin:15px 0\"><p><strong>📅 Data:</strong> {{date}}<br><strong>⏰ Horário:</strong> {{time}}<br><strong>📍 Origem:</strong> {{origin}}<br><strong>🏁 Destino:</strong> {{destination}}<br><strong>👥 Passageiro:</strong> {{passenger_name}}</p></div>{{#trip_url}}<p><a href=\"{{trip_url}}\" style=\"background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold\">Ver Detalhes da Viagem</a></p>{{/trip_url}}"
  },

  // ─── EN / Driver Reminder ─────────────────────────────────────────────────────
  {
    event_type: "lembrete_motorista", channel: "whatsapp", language: "en", is_enabled: true,
    send_to_driver: true, send_to_passenger: false, send_to_requester: false, send_to_client_contact: false, send_to_additional_phones: false,
    description: "WhatsApp EN - Driver trip reminder",
    subject_template: "",
    body_template: "🔔 *Trip Reminder*\n\nHello {{recipient_name}}, your trip starts soon.\n\n📅 Date: {{date}}\n⏰ Time: {{time}}\n📍 Origin: {{origin}}\n🏁 Destination: {{destination}}\n👥 Passenger: {{passenger_name}}\n\n{{#trip_url}}🔗 Open trip details:\n{{trip_url}}{{/trip_url}}"
  },
  {
    event_type: "lembrete_motorista", channel: "email", language: "en", is_enabled: true,
    send_to_driver: true, send_to_passenger: false, send_to_requester: false, send_to_client_contact: false, send_to_additional_phones: false,
    description: "Email EN - Driver trip reminder",
    subject_template: "🔔 Trip Reminder - {{trip_number}}",
    body_template: "<p>Hello <strong>{{recipient_name}}</strong>,</p><p>Your trip starts soon.</p><div style=\"background:#f3f4f6;padding:15px;border-radius:8px;margin:15px 0\"><p><strong>📅 Date:</strong> {{date}}<br><strong>⏰ Time:</strong> {{time}}<br><strong>📍 Origin:</strong> {{origin}}<br><strong>🏁 Destination:</strong> {{destination}}<br><strong>👥 Passenger:</strong> {{passenger_name}}</p></div>{{#trip_url}}<p><a href=\"{{trip_url}}\" style=\"background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold\">View Trip Details</a></p>{{/trip_url}}"
  },

  // ─── ES / Recordatorio al Conductor ──────────────────────────────────────────
  {
    event_type: "lembrete_motorista", channel: "whatsapp", language: "es", is_enabled: true,
    send_to_driver: true, send_to_passenger: false, send_to_requester: false, send_to_client_contact: false, send_to_additional_phones: false,
    description: "WhatsApp ES - Recordatorio de viaje al conductor",
    subject_template: "",
    body_template: "🔔 *Recordatorio de Viaje*\n\nHola {{recipient_name}}, su viaje empieza pronto.\n\n📅 Fecha: {{date}}\n⏰ Hora: {{time}}\n📍 Origen: {{origin}}\n🏁 Destino: {{destination}}\n👥 Pasajero: {{passenger_name}}\n\n{{#trip_url}}🔗 Abra los detalles del viaje:\n{{trip_url}}{{/trip_url}}"
  },
  {
    event_type: "lembrete_motorista", channel: "email", language: "es", is_enabled: true,
    send_to_driver: true, send_to_passenger: false, send_to_requester: false, send_to_client_contact: false, send_to_additional_phones: false,
    description: "Email ES - Recordatorio de viaje al conductor",
    subject_template: "🔔 Recordatorio de Viaje - {{trip_number}}",
    body_template: "<p>Hola <strong>{{recipient_name}}</strong>,</p><p>Su viaje empieza pronto.</p><div style=\"background:#f3f4f6;padding:15px;border-radius:8px;margin:15px 0\"><p><strong>📅 Fecha:</strong> {{date}}<br><strong>⏰ Hora:</strong> {{time}}<br><strong>📍 Origen:</strong> {{origin}}<br><strong>🏁 Destino:</strong> {{destination}}<br><strong>👥 Pasajero:</strong> {{passenger_name}}</p></div>{{#trip_url}}<p><a href=\"{{trip_url}}\" style=\"background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold\">Ver Detalles del Viaje</a></p>{{/trip_url}}"
  },

  // ─── PT / WhatsApp - Avaliação ───────────────────────────────────────────────
  {
    event_type: "solicitar_avaliacao", channel: "whatsapp", language: "pt", is_enabled: true,
    send_to_passenger: true, send_to_requester: false, send_to_client_contact: false, send_to_additional_phones: false,
    description: "WhatsApp PT - Solicitar avaliação da viagem",
    subject_template: "",
    body_template: "⭐ *Avalie Sua Viagem {{trip_number}}*\n\nOlá *{{passenger_name}}*,\n\nEsperamos que sua viagem com o motorista *{{driver_name}}* tenha sido excelente!\n\n📅 Data: {{date}}\n🕐 Horário: {{time}}\n\n{{#rating_link}}Avalie sua experiência e nos ajude a melhorar:\n{{rating_link}}{{/rating_link}}\n\nObrigado por escolher TransferOnline! 🙏"
  },
  {
    event_type: "solicitar_avaliacao", channel: "email", language: "pt", is_enabled: true,
    send_to_passenger: true, send_to_requester: false, send_to_client_contact: false, send_to_additional_phones: false,
    description: "Email PT - Solicitar avaliação da viagem",
    subject_template: "⭐ Como foi sua viagem {{trip_number}}?",
    body_template: "<p>Olá <strong>{{passenger_name}}</strong>,</p><p>Esperamos que sua viagem com o motorista <strong>{{driver_name}}</strong> tenha sido excelente!</p><div style=\"background:#f3f4f6;padding:15px;border-radius:8px;margin:15px 0\"><p>📅 <strong>Data:</strong> {{date}}<br>🕐 <strong>Horário:</strong> {{time}}</p></div>{{#rating_link}}<p style=\"text-align:center;margin:20px 0\"><a href=\"{{rating_link}}\" style=\"background:#f59e0b;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold\">⭐ Avaliar Minha Viagem</a></p>{{/rating_link}}<p style=\"text-align:center;color:#6b7280;font-size:12px\">Sua opinião nos ajuda a melhorar nossos serviços!</p>"
  },

  // ─── EN / WhatsApp - Avaliação ───────────────────────────────────────────────
  {
    event_type: "solicitar_avaliacao", channel: "whatsapp", language: "en", is_enabled: true,
    send_to_passenger: true, send_to_requester: false, send_to_client_contact: false, send_to_additional_phones: false,
    description: "WhatsApp EN - Request trip rating",
    subject_template: "",
    body_template: "⭐ *Rate Your Trip {{trip_number}}*\n\nHello *{{passenger_name}}*,\n\nWe hope your trip with driver *{{driver_name}}* was excellent!\n\n📅 Date: {{date}}\n🕐 Time: {{time}}\n\n{{#rating_link}}Rate your experience and help us improve:\n{{rating_link}}{{/rating_link}}\n\nThank you for choosing TransferOnline! 🙏"
  },
  {
    event_type: "solicitar_avaliacao", channel: "email", language: "en", is_enabled: true,
    send_to_passenger: true, send_to_requester: false, send_to_client_contact: false, send_to_additional_phones: false,
    description: "Email EN - Request trip rating",
    subject_template: "⭐ How was your trip {{trip_number}}?",
    body_template: "<p>Hello <strong>{{passenger_name}}</strong>,</p><p>We hope your trip with driver <strong>{{driver_name}}</strong> was excellent!</p><div style=\"background:#f3f4f6;padding:15px;border-radius:8px;margin:15px 0\"><p>📅 <strong>Date:</strong> {{date}}<br>🕐 <strong>Time:</strong> {{time}}</p></div>{{#rating_link}}<p style=\"text-align:center;margin:20px 0\"><a href=\"{{rating_link}}\" style=\"background:#f59e0b;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold\">⭐ Rate My Trip</a></p>{{/rating_link}}<p style=\"text-align:center;color:#6b7280;font-size:12px\">Your feedback helps us improve our services!</p>"
  },

  // ─── ES / WhatsApp - Avaliação ───────────────────────────────────────────────
  {
    event_type: "solicitar_avaliacao", channel: "whatsapp", language: "es", is_enabled: true,
    send_to_passenger: true, send_to_requester: false, send_to_client_contact: false, send_to_additional_phones: false,
    description: "WhatsApp ES - Solicitar evaluación del viaje",
    subject_template: "",
    body_template: "⭐ *Califique Su Viaje {{trip_number}}*\n\nHola *{{passenger_name}}*,\n\n¡Esperamos que su viaje con el conductor *{{driver_name}}* haya sido excelente!\n\n📅 Fecha: {{date}}\n🕐 Hora: {{time}}\n\n{{#rating_link}}Califique su experiencia y ayúdenos a mejorar:\n{{rating_link}}{{/rating_link}}\n\n¡Gracias por elegir TransferOnline! 🙏"
  },
  {
    event_type: "solicitar_avaliacao", channel: "email", language: "es", is_enabled: true,
    send_to_passenger: true, send_to_requester: false, send_to_client_contact: false, send_to_additional_phones: false,
    description: "Email ES - Solicitar evaluación del viaje",
    subject_template: "⭐ ¿Cómo fue su viaje {{trip_number}}?",
    body_template: "<p>Hola <strong>{{passenger_name}}</strong>,</p><p>¡Esperamos que su viaje con el conductor <strong>{{driver_name}}</strong> haya sido excelente!</p><div style=\"background:#f3f4f6;padding:15px;border-radius:8px;margin:15px 0\"><p>📅 <strong>Fecha:</strong> {{date}}<br>🕐 <strong>Hora:</strong> {{time}}</p></div>{{#rating_link}}<p style=\"text-align:center;margin:20px 0\"><a href=\"{{rating_link}}\" style=\"background:#f59e0b;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold\">⭐ Calificar Mi Viaje</a></p>{{/rating_link}}<p style=\"text-align:center;color:#6b7280;font-size:12px\">¡Su opinión nos ayuda a mejorar nuestros servicios!</p>"
  },
];