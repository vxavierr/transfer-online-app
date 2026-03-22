import React from 'react';
import {
  MapPin, Calendar, Clock, ArrowRight, Plane,
  Car, Users, Briefcase, Shield, CheckCircle, CreditCard, User, Mail, Phone,
  Baby, Wifi, Tag, Gift, Star, Plus
} from 'lucide-react';

// Traduções de todos os textos dos mocks
const T = {
  pt: {
    // Tabs
    tabOneWay: 'Só Ida', tabRoundTrip: 'Ida e Volta', tabHourly: 'Por Hora', tabMulti: 'Multi',
    // Common
    origin: 'Origem', destination: 'Destino', date: 'Data', time: 'Horário',
    viewVehicles: 'Ver Veículos e Preços',
    flightLabel: '✈️ Número do Voo (Origem é aeroporto)',
    // Round trip
    outbound: '🚗 Ida', returnTrip: '🔄 Volta',
    // Hourly
    startPoint: 'Ponto de Partida', hourPackage: 'Pacote de Horas',
    kmIncluded: 'km inclusos', minHours: 'Mín 5h', stops: '📍 Paradas',
    stop1: 'Reunião — Av. Paulista, 1000', stop2: 'Almoço — Itaim Bibi',
    finalDest: 'Destino Final',
    // Multi trip
    trip: 'Viagem', addTrip: 'Adicionar Viagem', total: 'Total',
    proceedPayment: 'Prosseguir para Pagamento',
    conventionCenter: 'Centro de Convenções',
    // Vehicles
    sedanExec: 'Sedan Executivo', suvPremium: 'SUV Premium', vanExec: 'Van Executiva', armored: 'Blindado',
    pax: 'pax', bags: 'malas',
    // Passenger
    passengerData: 'Dados do Passageiro', fullName: 'Nome Completo',
    email: 'Email', phone: 'Telefone', notes: 'Observações',
    notesPlaceholder: '2 malas grandes, chegando pelo Terminal 2...',
    addMorePassengers: 'Adicionar mais passageiros',
    sampleName: 'João da Silva',
    // Payment
    tripSummary: '📋 Resumo da Viagem', route: 'Rota', vehicle: 'Veículo', flight: 'Voo',
    transfer: 'Transfer', babySeat: 'Cadeira Bebê', airportSign: 'Placa Aeroporto',
    coupon10: 'Cupom 10%',
    securePayment: 'Pagamento Seguro', cardNumber: 'Número do Cartão',
    secureVia: 'Pagamento processado com segurança via',
    confirmPay: 'Confirmar e Pagar',
    // Extras
    additionalItems: '🎒 Itens Adicionais', wifi4g: 'Wi-Fi 4G', suitBag: 'Porta-Terno',
    discountCoupon: '🎁 Cupom de Desconto', apply: 'Aplicar',
    couponApplied: '✅ Cupom aplicado — 10% de desconto!',
  },
  en: {
    tabOneWay: 'One Way', tabRoundTrip: 'Round Trip', tabHourly: 'Hourly', tabMulti: 'Multi',
    origin: 'Origin', destination: 'Destination', date: 'Date', time: 'Time',
    viewVehicles: 'View Vehicles & Prices',
    flightLabel: '✈️ Flight Number (Origin is airport)',
    outbound: '🚗 Outbound', returnTrip: '🔄 Return',
    startPoint: 'Starting Point', hourPackage: 'Hour Package',
    kmIncluded: 'km included', minHours: 'Min 5h', stops: '📍 Stops',
    stop1: 'Meeting — Av. Paulista, 1000', stop2: 'Lunch — Itaim Bibi',
    finalDest: 'Final Destination',
    trip: 'Trip', addTrip: 'Add Trip', total: 'Total',
    proceedPayment: 'Proceed to Payment',
    conventionCenter: 'Convention Center',
    sedanExec: 'Executive Sedan', suvPremium: 'SUV Premium', vanExec: 'Executive Van', armored: 'Armored',
    pax: 'pax', bags: 'bags',
    passengerData: 'Passenger Details', fullName: 'Full Name',
    email: 'Email', phone: 'Phone', notes: 'Notes',
    notesPlaceholder: '2 large bags, arriving at Terminal 2...',
    addMorePassengers: 'Add more passengers',
    sampleName: 'John Smith',
    tripSummary: '📋 Trip Summary', route: 'Route', vehicle: 'Vehicle', flight: 'Flight',
    transfer: 'Transfer', babySeat: 'Baby Seat', airportSign: 'Airport Sign',
    coupon10: 'Coupon 10%',
    securePayment: 'Secure Payment', cardNumber: 'Card Number',
    secureVia: 'Payment securely processed via',
    confirmPay: 'Confirm & Pay',
    additionalItems: '🎒 Additional Items', wifi4g: 'Wi-Fi 4G', suitBag: 'Suit Bag',
    discountCoupon: '🎁 Discount Coupon', apply: 'Apply',
    couponApplied: '✅ Coupon applied — 10% discount!',
  },
  es: {
    tabOneWay: 'Solo Ida', tabRoundTrip: 'Ida y Vuelta', tabHourly: 'Por Hora', tabMulti: 'Multi',
    origin: 'Origen', destination: 'Destino', date: 'Fecha', time: 'Hora',
    viewVehicles: 'Ver Vehículos y Precios',
    flightLabel: '✈️ Número de Vuelo (Origen es aeropuerto)',
    outbound: '🚗 Ida', returnTrip: '🔄 Vuelta',
    startPoint: 'Punto de Partida', hourPackage: 'Paquete de Horas',
    kmIncluded: 'km incluidos', minHours: 'Mín 5h', stops: '📍 Paradas',
    stop1: 'Reunión — Av. Paulista, 1000', stop2: 'Almuerzo — Itaim Bibi',
    finalDest: 'Destino Final',
    trip: 'Viaje', addTrip: 'Agregar Viaje', total: 'Total',
    proceedPayment: 'Proceder al Pago',
    conventionCenter: 'Centro de Convenciones',
    sedanExec: 'Sedán Ejecutivo', suvPremium: 'SUV Premium', vanExec: 'Van Ejecutiva', armored: 'Blindado',
    pax: 'pax', bags: 'maletas',
    passengerData: 'Datos del Pasajero', fullName: 'Nombre Completo',
    email: 'Correo', phone: 'Teléfono', notes: 'Observaciones',
    notesPlaceholder: '2 maletas grandes, llegando por Terminal 2...',
    addMorePassengers: 'Agregar más pasajeros',
    sampleName: 'Juan García',
    tripSummary: '📋 Resumen del Viaje', route: 'Ruta', vehicle: 'Vehículo', flight: 'Vuelo',
    transfer: 'Transfer', babySeat: 'Silla de Bebé', airportSign: 'Letrero Aeropuerto',
    coupon10: 'Cupón 10%',
    securePayment: 'Pago Seguro', cardNumber: 'Número de Tarjeta',
    secureVia: 'Pago procesado con seguridad vía',
    confirmPay: 'Confirmar y Pagar',
    additionalItems: '🎒 Artículos Adicionales', wifi4g: 'Wi-Fi 4G', suitBag: 'Porta-Traje',
    discountCoupon: '🎁 Cupón de Descuento', apply: 'Aplicar',
    couponApplied: '✅ Cupón aplicado — 10% de descuento!',
  },
};

const MOCK_INPUT_CLASSES = "w-full h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 flex items-center";
const MOCK_BUTTON_CLASSES = "w-full h-11 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-sm flex items-center justify-center gap-2";

function MockInput({ icon: Icon, placeholder, value, accent }) {
  return (
    <div className={`${MOCK_INPUT_CLASSES} ${accent ? 'border-blue-300 bg-blue-50' : ''}`}>
      {Icon && <Icon className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />}
      <span className={accent ? 'text-blue-700 font-medium' : ''}>{value || placeholder}</span>
    </div>
  );
}

function MockLabel({ children }) {
  return <label className="text-xs font-semibold text-gray-700 block mb-1">{children}</label>;
}

function TabBar({ t, activeIndex }) {
  const tabs = [t.tabOneWay, t.tabRoundTrip, t.tabHourly, t.tabMulti];
  return (
    <div className="grid grid-cols-4 gap-1 bg-gray-100 p-1 rounded-lg mb-4">
      {tabs.map((label, i) => (
        <div key={i} className={`text-center py-2 rounded-md text-[10px] md:text-xs font-semibold transition-all ${i === activeIndex ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500'}`}>
          {label}
        </div>
      ))}
    </div>
  );
}

function OneWayMock({ t }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-5">
      <TabBar t={t} activeIndex={0} />
      <div className="space-y-3">
        <div><MockLabel>{t.origin}</MockLabel><MockInput icon={MapPin} value="Aeroporto de Guarulhos (GRU)" accent /></div>
        <div><MockLabel>{t.destination}</MockLabel><MockInput icon={MapPin} value="Hotel Hilton Morumbi, São Paulo" accent /></div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <MockLabel>{t.flightLabel}</MockLabel>
          <MockInput icon={Plane} value="LA3456" accent />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><MockLabel>{t.date}</MockLabel><MockInput icon={Calendar} value="25/04/2025" accent /></div>
          <div><MockLabel>{t.time}</MockLabel><MockInput icon={Clock} value="14:30" accent /></div>
        </div>
        <div className={MOCK_BUTTON_CLASSES}>{t.viewVehicles} <ArrowRight className="w-4 h-4" /></div>
      </div>
    </div>
  );
}

function RoundTripMock({ t }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-5">
      <TabBar t={t} activeIndex={1} />
      <div className="space-y-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-bold text-blue-700 mb-2">{t.outbound}</p>
          <div className="space-y-2">
            <MockInput icon={MapPin} value="Aeroporto de Congonhas (CGH)" accent />
            <MockInput icon={MapPin} value="Faria Lima, 1234 — SP" accent />
            <div className="grid grid-cols-2 gap-2">
              <MockInput icon={Calendar} value="25/04/2025" accent />
              <MockInput icon={Clock} value="09:00" accent />
            </div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs font-bold text-green-700 mb-2">{t.returnTrip}</p>
          <div className="space-y-2">
            <MockInput icon={MapPin} value="Faria Lima, 1234 — SP" />
            <MockInput icon={MapPin} value="Aeroporto de Congonhas (CGH)" />
            <div className="grid grid-cols-2 gap-2">
              <MockInput icon={Calendar} value="27/04/2025" accent />
              <MockInput icon={Clock} value="17:00" accent />
            </div>
          </div>
        </div>
        <div className={MOCK_BUTTON_CLASSES}>{t.viewVehicles} <ArrowRight className="w-4 h-4" /></div>
      </div>
    </div>
  );
}

function HourlyMock({ t }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-5">
      <TabBar t={t} activeIndex={2} />
      <div className="space-y-3">
        <div><MockLabel>{t.startPoint}</MockLabel><MockInput icon={MapPin} value="Hotel Renaissance, SP" accent /></div>
        <div><MockLabel>{t.hourPackage}</MockLabel>
          <div className="grid grid-cols-3 gap-2">
            <div className="border-2 border-blue-500 bg-blue-50 rounded-lg p-3 text-center"><span className="text-lg font-bold text-blue-700">5h</span><p className="text-[10px] text-blue-600">50 {t.kmIncluded}</p></div>
            <div className="border-2 border-gray-200 rounded-lg p-3 text-center"><span className="text-lg font-bold text-gray-600">10h</span><p className="text-[10px] text-gray-500">100 {t.kmIncluded}</p></div>
            <div className="border-2 border-gray-200 rounded-lg p-3 text-center"><span className="text-lg font-bold text-gray-600">Custom</span><p className="text-[10px] text-gray-500">{t.minHours}</p></div>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-bold text-amber-700 mb-2">{t.stops}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-700"><span className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-[10px]">1</span>{t.stop1}</div>
            <div className="flex items-center gap-2 text-xs text-gray-700"><span className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-[10px]">2</span>{t.stop2}</div>
          </div>
        </div>
        <div><MockLabel>{t.finalDest}</MockLabel><MockInput icon={MapPin} value="Hotel Renaissance, SP" accent /></div>
        <div className={MOCK_BUTTON_CLASSES}>{t.viewVehicles} <ArrowRight className="w-4 h-4" /></div>
      </div>
    </div>
  );
}

function MultiTripMock({ t }) {
  const legs = [
    { num: 1, origin: 'Aeroporto GRU', dest: 'Hotel Hilton', date: '25/04', price: 'R$ 280' },
    { num: 2, origin: 'Hotel Hilton', dest: t.conventionCenter, date: '26/04', price: 'R$ 120' },
    { num: 3, origin: t.conventionCenter, dest: 'Aeroporto GRU', date: '27/04', price: 'R$ 280' },
  ];
  return (
    <div className="bg-white rounded-xl shadow-lg p-5">
      <TabBar t={t} activeIndex={3} />
      <div className="space-y-3">
        {legs.map(leg => (
          <div key={leg.num} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-700">{t.trip} {leg.num}</span>
              <span className="text-xs font-bold text-green-600">{leg.price}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <MapPin className="w-3 h-3" />{leg.origin} <ArrowRight className="w-3 h-3" /> {leg.dest}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
              <Calendar className="w-3 h-3" />{leg.date} — {t.sedanExec}
            </div>
          </div>
        ))}
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-3 text-center cursor-pointer hover:bg-blue-50">
          <Plus className="w-5 h-5 mx-auto text-blue-500" />
          <span className="text-xs text-blue-600 font-medium">{t.addTrip}</span>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex justify-between items-center">
          <span className="text-sm font-bold text-gray-900">{t.total}</span>
          <span className="text-lg font-bold text-green-600">R$ 680,00</span>
        </div>
        <div className={MOCK_BUTTON_CLASSES}>{t.proceedPayment} <ArrowRight className="w-4 h-4" /></div>
      </div>
    </div>
  );
}

function VehiclesMock({ t }) {
  const vehicles = [
    { name: t.sedanExec, pax: 3, bags: 2, price: 'R$ 280,00', color: 'border-blue-500 bg-blue-50', icon: Car, selected: true },
    { name: t.suvPremium, pax: 4, bags: 4, price: 'R$ 380,00', color: 'border-gray-200', icon: Car, selected: false },
    { name: t.vanExec, pax: 10, bags: 10, price: 'R$ 520,00', color: 'border-gray-200', icon: Users, selected: false },
    { name: t.armored, pax: 3, bags: 2, price: 'R$ 680,00', color: 'border-gray-200', icon: Shield, selected: false },
  ];
  return (
    <div className="space-y-3">
      {vehicles.map(v => (
        <div key={v.name} className={`bg-white rounded-xl shadow-sm border-2 p-4 ${v.color} transition-all`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${v.selected ? 'bg-blue-600' : 'bg-gray-100'}`}>
                <v.icon className={`w-6 h-6 ${v.selected ? 'text-white' : 'text-gray-500'}`} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">{v.name}</h4>
                <div className="flex gap-3 text-[10px] text-gray-500 mt-0.5">
                  <span>👤 {v.pax} {t.pax}</span>
                  <span>🧳 {v.bags} {t.bags}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-600">{v.price}</p>
              {v.selected && <CheckCircle className="w-5 h-5 text-blue-600 ml-auto mt-1" />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PassengerMock({ t }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-5 space-y-4">
      <h3 className="font-bold text-gray-900 flex items-center gap-2"><User className="w-5 h-5 text-blue-600" /> {t.passengerData}</h3>
      <div className="space-y-3">
        <div><MockLabel>{t.fullName} *</MockLabel><MockInput icon={User} value={t.sampleName} accent /></div>
        <div><MockLabel>{t.email} *</MockLabel><MockInput icon={Mail} value="joao@email.com" accent /></div>
        <div><MockLabel>{t.phone} *</MockLabel><MockInput icon={Phone} value="+55 11 99999-0000" accent /></div>
        <div><MockLabel>{t.notes}</MockLabel>
          <div className="w-full h-16 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-400">
            {t.notesPlaceholder}
          </div>
        </div>
        <div className="border-2 border-dashed border-blue-200 rounded-lg p-3 text-center">
          <Plus className="w-4 h-4 mx-auto text-blue-500" />
          <span className="text-xs text-blue-600">{t.addMorePassengers}</span>
        </div>
      </div>
    </div>
  );
}

function PaymentMock({ t }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-lg p-5">
        <h3 className="font-bold text-gray-900 mb-3">{t.tripSummary}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">{t.route}</span><span className="font-medium text-gray-900">GRU → Hotel Hilton</span></div>
          <div className="flex justify-between"><span className="text-gray-500">{t.date}</span><span className="font-medium">25/04/2025 — 14:30</span></div>
          <div className="flex justify-between"><span className="text-gray-500">{t.vehicle}</span><span className="font-medium">{t.sedanExec}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">{t.flight}</span><span className="font-medium">LA3456</span></div>
          <hr className="my-2"/>
          <div className="flex justify-between"><span className="text-gray-500">{t.transfer}</span><span>R$ 280,00</span></div>
          <div className="flex justify-between"><span className="text-gray-500">{t.babySeat}</span><span>R$ 30,00</span></div>
          <div className="flex justify-between"><span className="text-gray-500">{t.airportSign}</span><span>R$ 25,00</span></div>
          <div className="flex justify-between text-green-600"><span>{t.coupon10}</span><span>-R$ 33,50</span></div>
          <hr className="my-2"/>
          <div className="flex justify-between text-lg font-bold"><span>{t.total}</span><span className="text-green-600">R$ 301,50</span></div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg p-5">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><CreditCard className="w-5 h-5 text-blue-600" /> {t.securePayment}</h3>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-white mb-3">
          <p className="text-[10px] text-slate-400 mb-2">{t.cardNumber}</p>
          <p className="text-lg font-mono tracking-wider">•••• •••• •••• 4242</p>
          <div className="flex justify-between mt-3 text-xs text-slate-400">
            <span>{t.sampleName.toUpperCase()}</span>
            <span>12/28</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-4">
          <Shield className="w-4 h-4 text-green-600" />
          <span>{t.secureVia} <strong>Stripe</strong></span>
        </div>
        <div className="w-full h-12 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg">
          <CheckCircle className="w-5 h-5" /> {t.confirmPay} R$ 301,50
        </div>
      </div>
    </div>
  );
}

const MOCK_MAP = {
  one_way: OneWayMock,
  round_trip: RoundTripMock,
  hourly: HourlyMock,
  multi_trip: MultiTripMock,
  vehicles: VehiclesMock,
  passenger: PassengerMock,
  payment: PaymentMock,
};

export default function DemoMockScreen({ section, lang = 'pt' }) {
  const Component = MOCK_MAP[section];
  if (!Component) return null;
  const t = T[lang] || T.pt;
  return <Component t={t} />;
}