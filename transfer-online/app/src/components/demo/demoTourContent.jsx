// Conteúdo do tour guiado em 3 idiomas
// Steps são montados dinamicamente: welcome → escolha da modalidade → steps da modalidade → veículos → passageiro → pagamento

export const DEMO_LANGUAGES = [
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

// Modalidades disponíveis para seleção
export const DEMO_MODALITIES = {
  pt: [
    { id: 'one_way', label: 'Só Ida', icon: '🚗', desc: 'Transfer direto de um ponto a outro' },
    { id: 'round_trip', label: 'Ida e Volta', icon: '🔄', desc: 'Com retorno agendado' },
    { id: 'hourly', label: 'Por Hora', icon: '⏱️', desc: 'Veículo à disposição por período' },
    { id: 'multi_trip', label: 'Múltiplas Viagens', icon: '📋', desc: 'Vários trechos em uma reserva' },
  ],
  en: [
    { id: 'one_way', label: 'One Way', icon: '🚗', desc: 'Direct transfer from point A to B' },
    { id: 'round_trip', label: 'Round Trip', icon: '🔄', desc: 'With scheduled return' },
    { id: 'hourly', label: 'Hourly', icon: '⏱️', desc: 'Vehicle at your disposal' },
    { id: 'multi_trip', label: 'Multi Trip', icon: '📋', desc: 'Multiple legs in one booking' },
  ],
  es: [
    { id: 'one_way', label: 'Solo Ida', icon: '🚗', desc: 'Transfer directo de un punto a otro' },
    { id: 'round_trip', label: 'Ida y Vuelta', icon: '🔄', desc: 'Con retorno programado' },
    { id: 'hourly', label: 'Por Hora', icon: '⏱️', desc: 'Vehículo a disposición por período' },
    { id: 'multi_trip', label: 'Múltiples Viajes', icon: '📋', desc: 'Varios tramos en una reserva' },
  ],
};

// Steps por modalidade
const MODALITY_STEPS = {
  pt: {
    one_way: {
      id: 'one_way_form',
      title: '📍 Preencha a Rota — Só Ida',
      description: 'Informe origem, destino, data e horário. Se a origem ou destino for um aeroporto, um campo extra aparece para informar o número do voo.',
      highlight: 'O sistema detecta aeroportos automaticamente para rastreamento de voo.',
      mockSection: 'one_way',
    },
    round_trip: {
      id: 'round_trip_form',
      title: '🔄 Ida e Volta',
      description: 'Além da rota de ida, preencha também data e horário do retorno. O destino do retorno é automaticamente o mesmo da origem.',
      highlight: 'Desconto automático pode ser aplicado em viagens ida e volta.',
      mockSection: 'round_trip',
    },
    hourly: {
      id: 'hourly_form',
      title: '⏱️ Serviço Por Hora',
      description: 'Informe o ponto de partida, paradas intermediárias e o destino final. Escolha entre pacotes de 5h, 10h ou horas customizadas.',
      highlight: 'Ideal para executivos com múltiplas reuniões em um dia.',
      mockSection: 'hourly',
    },
    multi_trip: {
      id: 'multi_trip_form',
      title: '📋 Múltiplas Viagens',
      description: 'Adicione vários trechos de viagem numa única reserva. Cada trecho pode ter origem, destino, data e veículo diferentes.',
      highlight: 'Perfeito para grupos, eventos ou roteiros de vários dias.',
      mockSection: 'multi_trip',
    },
  },
  en: {
    one_way: {
      id: 'one_way_form',
      title: '📍 Fill the Route — One Way',
      description: 'Enter origin, destination, date and time. If origin or destination is an airport, an extra field appears for the flight number.',
      highlight: 'The system automatically detects airports for flight tracking.',
      mockSection: 'one_way',
    },
    round_trip: {
      id: 'round_trip_form',
      title: '🔄 Round Trip',
      description: 'In addition to the outbound route, fill in the return date and time. The return destination automatically matches the origin.',
      highlight: 'Automatic discounts may apply for round trips.',
      mockSection: 'round_trip',
    },
    hourly: {
      id: 'hourly_form',
      title: '⏱️ Hourly Service',
      description: 'Enter the starting point, intermediate stops, and the final destination. Choose from 5h, 10h packages or custom hours.',
      highlight: 'Ideal for executives with multiple meetings in a day.',
      mockSection: 'hourly',
    },
    multi_trip: {
      id: 'multi_trip_form',
      title: '📋 Multiple Trips',
      description: 'Add multiple trip legs in a single booking. Each leg can have different origin, destination, date and vehicle.',
      highlight: 'Perfect for groups, events, or multi-day itineraries.',
      mockSection: 'multi_trip',
    },
  },
  es: {
    one_way: {
      id: 'one_way_form',
      title: '📍 Complete la Ruta — Solo Ida',
      description: 'Ingrese origen, destino, fecha y hora. Si el origen o destino es un aeropuerto, aparece un campo extra para el número de vuelo.',
      highlight: 'El sistema detecta aeropuertos automáticamente para rastreo de vuelo.',
      mockSection: 'one_way',
    },
    round_trip: {
      id: 'round_trip_form',
      title: '🔄 Ida y Vuelta',
      description: 'Además de la ruta de ida, complete la fecha y hora de regreso. El destino del retorno es automáticamente el mismo que el origen.',
      highlight: 'Se pueden aplicar descuentos automáticos en viajes ida y vuelta.',
      mockSection: 'round_trip',
    },
    hourly: {
      id: 'hourly_form',
      title: '⏱️ Servicio Por Hora',
      description: 'Ingrese el punto de partida, paradas intermedias y el destino final. Elija entre paquetes de 5h, 10h u horas personalizadas.',
      highlight: 'Ideal para ejecutivos con múltiples reuniones en un día.',
      mockSection: 'hourly',
    },
    multi_trip: {
      id: 'multi_trip_form',
      title: '📋 Múltiples Viajes',
      description: 'Agregue varios tramos de viaje en una sola reserva. Cada tramo puede tener origen, destino, fecha y vehículo diferentes.',
      highlight: 'Perfecto para grupos, eventos o itinerarios de varios días.',
      mockSection: 'multi_trip',
    },
  },
};

// Steps finais (após modalidade)
const FINAL_STEPS = {
  pt: [
    {
      id: 'vehicle_selection',
      title: '🚘 Seleção de Veículo',
      description: 'Após preencher a rota, o sistema calcula os preços automaticamente para cada tipo de veículo disponível.',
      highlight: 'Os preços incluem pedágios e são calculados em tempo real.',
      mockSection: 'vehicles',
      bullets: [
        'Sedan Executivo — Conforto para até 3 passageiros',
        'SUV — Mais espaço e bagagem',
        'Van Executiva — Grupos de até 10 pessoas',
        'Blindado — Segurança máxima',
      ],
    },
    {
      id: 'passenger_data',
      title: '👤 Dados do Passageiro',
      description: 'Informe nome, email e telefone do passageiro principal. Você pode adicionar passageiros extras e observações.',
      highlight: 'Se estiver logado, seus dados são preenchidos automaticamente.',
      mockSection: 'passenger',
    },
    {
      id: 'payment',
      title: '💳 Pagamento e Confirmação',
      description: 'Revise o resumo da viagem e prossiga para o pagamento seguro via Stripe. Após confirmação, você recebe email com todos os detalhes.',
      highlight: 'Pagamento 100% seguro com criptografia.',
      mockSection: 'payment',
      bullets: [
        'Cartão de crédito/débito',
        'Resumo completo antes de pagar',
        'Confirmação instantânea por email',
        'Dados do motorista enviados antes da viagem',
      ],
    },
  ],
  en: [
    {
      id: 'vehicle_selection',
      title: '🚘 Vehicle Selection',
      description: 'After filling the route, the system automatically calculates prices for each available vehicle type.',
      highlight: 'Prices include tolls and are calculated in real time.',
      mockSection: 'vehicles',
      bullets: [
        'Executive Sedan — Comfort for up to 3 passengers',
        'SUV — More space and luggage',
        'Executive Van — Groups up to 10 people',
        'Armored — Maximum security',
      ],
    },
    {
      id: 'passenger_data',
      title: '👤 Passenger Details',
      description: 'Enter the main passenger name, email, and phone. You can add extra passengers and notes.',
      highlight: 'If logged in, your data is auto-filled.',
      mockSection: 'passenger',
    },
    {
      id: 'payment',
      title: '💳 Payment & Confirmation',
      description: 'Review the trip summary and proceed to secure payment via Stripe. After confirmation, you receive an email with all details.',
      highlight: '100% secure payment with encryption.',
      mockSection: 'payment',
      bullets: [
        'Credit/debit card',
        'Complete summary before paying',
        'Instant confirmation via email',
        'Driver details sent before the trip',
      ],
    },
  ],
  es: [
    {
      id: 'vehicle_selection',
      title: '🚘 Selección de Vehículo',
      description: 'Después de completar la ruta, el sistema calcula los precios automáticamente para cada tipo de vehículo disponible.',
      highlight: 'Los precios incluyen peajes y se calculan en tiempo real.',
      mockSection: 'vehicles',
      bullets: [
        'Sedán Ejecutivo — Confort para hasta 3 pasajeros',
        'SUV — Más espacio y equipaje',
        'Van Ejecutiva — Grupos de hasta 10 personas',
        'Blindado — Seguridad máxima',
      ],
    },
    {
      id: 'passenger_data',
      title: '👤 Datos del Pasajero',
      description: 'Ingrese nombre, email y teléfono del pasajero principal. Puede agregar pasajeros extras y observaciones.',
      highlight: 'Si está logueado, sus datos se completan automáticamente.',
      mockSection: 'passenger',
    },
    {
      id: 'payment',
      title: '💳 Pago y Confirmación',
      description: 'Revise el resumen del viaje y proceda al pago seguro vía Stripe. Tras la confirmación, recibirá un email con todos los detalles.',
      highlight: 'Pago 100% seguro con encriptación.',
      mockSection: 'payment',
      bullets: [
        'Tarjeta de crédito/débito',
        'Resumen completo antes de pagar',
        'Confirmación instantánea por email',
        'Datos del conductor enviados antes del viaje',
      ],
    },
  ],
};

// Labels de UI
export const DEMO_UI = {
  pt: {
    title: 'Tour Guiado — Sistema de Reservas',
    subtitle: 'Veja como é fácil reservar um transfer executivo',
    startTour: 'Iniciar Tour',
    next: 'Próximo',
    prev: 'Anterior',
    skip: 'Pular Tour',
    finish: 'Finalizar',
    stepOf: 'de',
    shareTitle: 'Compartilhar',
    shareCopied: 'Link copiado!',
    restartTour: 'Reiniciar Tour',
    chooseModality: 'Escolha a modalidade para explorar:',
    changeLanguage: 'Alterar idioma',
    howToAccessTitle: '📌 Como acessar o sistema de reservas:',
    howToAccessSteps: [
      'Acesse www.transferonline.com.br',
      'Clique no botão "Reservar Online" no menu superior',
      'Escolha a modalidade de transporte desejada',
    ],
  },
  en: {
    title: 'Guided Tour — Booking System',
    subtitle: 'See how easy it is to book an executive transfer',
    startTour: 'Start Tour',
    next: 'Next',
    prev: 'Previous',
    skip: 'Skip Tour',
    finish: 'Finish',
    stepOf: 'of',
    shareTitle: 'Share',
    shareCopied: 'Link copied!',
    restartTour: 'Restart Tour',
    chooseModality: 'Choose a mode to explore:',
    changeLanguage: 'Change language',
    howToAccessTitle: '📌 How to access the booking system:',
    howToAccessSteps: [
      'Visit www.transferonline.com.br',
      'Click the "Book Online" button in the top menu',
      'Choose the desired transport mode',
    ],
  },
  es: {
    title: 'Tour Guiado — Sistema de Reservas',
    subtitle: 'Vea lo fácil que es reservar un transfer ejecutivo',
    startTour: 'Iniciar Tour',
    next: 'Siguiente',
    prev: 'Anterior',
    skip: 'Saltar Tour',
    finish: 'Finalizar',
    stepOf: 'de',
    shareTitle: 'Compartir',
    shareCopied: '¡Enlace copiado!',
    restartTour: 'Reiniciar Tour',
    chooseModality: 'Elija una modalidad para explorar:',
    changeLanguage: 'Cambiar idioma',
    howToAccessTitle: '📌 Cómo acceder al sistema de reservas:',
    howToAccessSteps: [
      'Visite www.transferonline.com.br',
      'Haga clic en el botón "Reservar Online" en el menú superior',
      'Elija la modalidad de transporte deseada',
    ],
  },
};

// Monta os steps dinamicamente com base na modalidade escolhida
export function buildSteps(lang, modality) {
  const modalityStep = MODALITY_STEPS[lang]?.[modality];
  const finalSteps = FINAL_STEPS[lang] || [];

  if (!modalityStep) return finalSteps;

  return [modalityStep, ...finalSteps];
}