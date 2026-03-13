import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import NovaReserva from './NovaReserva';
import { ArrowRight, CheckCircle, Car, Users, Plane, Facebook, Instagram, Linkedin, Menu, X, MessageCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Index() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showSuccess, setShowSuccess] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState('');

  // Parâmetros de URL
  const searchParams = new URLSearchParams(location.search);
  const paymentSuccess = searchParams.get('payment_success');
  const quote = searchParams.get('quote');

  useEffect(() => {
    const init = async () => {
      // Check auth first
      let isAdminUser = false;
      try {
        const user = await base44.auth.me();
        if (user && (user.role === 'admin' || user.email === 'fernandotransferonline@gmail.com')) {
          isAdminUser = true;
        }
      } catch (e) {
        // Not logged in
      }

      // If admin, prioritize redirect to Dashboard (handled by layout or here)
      if (isAdminUser) {
        navigate(createPageUrl('AdminDashboard') + location.search, { replace: true });
        return;
      }

      // Redirect app domain root to NovaReserva immediately (ONLY if not admin)
      const hostname = window.location.hostname;
      if (hostname === 'app.transferonline.com.br' || hostname === 'www.app.transferonline.com.br') {
         if (!paymentSuccess) {
           navigate(createPageUrl('NovaReserva') + location.search, { replace: true });
           return;
         }
      }
    };

    init();

    // Verificar se há parâmetros de sucesso de pagamento na URL
    if (paymentSuccess === 'true' && quote) {
      setQuoteNumber(quote);
      setShowSuccess(true);
      
      // Ocultar a mensagem após 10 segundos
      setTimeout(() => {
        setShowSuccess(false);
        // Limpar os parâmetros da URL sem recarregar a página e redirecionar para home limpa
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 10000);
    }
  }, [paymentSuccess, quote, navigate, location.search]);

  // Lógica original do Inicio.js
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { data: siteContent } = useQuery({
    queryKey: ['site-content-public'],
    queryFn: async () => {
      const items = await base44.entities.SiteContent.list();
      return items.reduce((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {});
    },
    staleTime: 1000 * 60 * 5 // 5 minutes cache
  });

  const getContent = (key, defaultValue) => {
    return siteContent?.[key] || defaultValue;
  };

  const scrollToBooking = () => {
    const element = document.getElementById('booking');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  // Renderização Condicional: Sucesso de Pagamento OU Página Inicial Completa
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <Alert className="bg-green-50 border-green-200 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="bg-green-500 rounded-full p-3">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-green-900 mb-2">
                  🎉 Pagamento Confirmado!
                </h2>
                <AlertDescription className="text-green-800 space-y-3">
                  <p className="text-lg">
                    Seu pagamento foi processado com sucesso para a cotação <strong>{quoteNumber}</strong>!
                  </p>
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="font-semibold text-green-900 mb-2">✅ Próximos Passos:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Sua reserva foi criada automaticamente</li>
                      <li>Você receberá um e-mail de confirmação em instantes</li>
                      <li>Nossa equipe entrará em contato para confirmar os detalhes</li>
                      <li>Aguarde as informações do motorista antes da viagem</li>
                    </ul>
                  </div>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        </div>
      </div>
    );
  }

  // Renderização da Página Inicial (Cópia do Inicio.js)
  return (
    <div className="min-h-screen font-sans text-gray-900 bg-white">
      {/* Navigation Bar */}
      <nav className="fixed w-full z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center cursor-pointer gap-3" onClick={() => scrollToSection('home')}>
              <div className="h-12 w-auto">
                <img 
                  src={getContent('site_logo', "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68effdb75fcac474f3f66b8f/57204d3c2_logo-icone.jpg")}
                  alt="TransferOnline Logo" 
                  className="h-full w-auto object-contain rounded-md"
                />
              </div>
              <span className="font-extrabold text-2xl bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent">
                TransferOnline
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSection('home')} className="text-gray-600 hover:text-blue-700 font-medium transition-colors">
                Início
              </button>
              <button onClick={() => scrollToSection('services')} className="text-gray-600 hover:text-blue-700 font-medium transition-colors">
                Serviços
              </button>
              <button onClick={() => scrollToSection('fleet')} className="text-gray-600 hover:text-blue-700 font-medium transition-colors">
                Frota
              </button>
              <Link to={createPageUrl('ConsultarViagem')}>
                <button className="text-gray-600 hover:text-blue-700 font-medium transition-colors">
                  Consultar Viagem
                </button>
              </Link>
              <Link to={createPageUrl('PortalCorporativo')}>
                <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                  Portal Corporativo
                </Button>
              </Link>
              <Button onClick={scrollToBooking} className="bg-blue-600 hover:bg-blue-700 text-white">
                Reservar
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-600 hover:text-blue-700 focus:outline-none">
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg absolute w-full">
            <div className="px-4 pt-2 pb-6 space-y-2">
              <button onClick={() => scrollToSection('home')} className="block w-full text-left px-3 py-3 text-base font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded-md">
                Início
              </button>
              <button onClick={() => scrollToSection('services')} className="block w-full text-left px-3 py-3 text-base font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded-md">
                Serviços
              </button>
              <button onClick={() => scrollToSection('fleet')} className="block w-full text-left px-3 py-3 text-base font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded-md">
                Frota
              </button>
              <Link to={createPageUrl('ConsultarViagem')} className="block">
                <button className="w-full text-left px-3 py-3 text-base font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded-md">
                  Consultar Viagem
                </button>
              </Link>
              <Link to={createPageUrl('PortalCorporativo')} className="block">
                <button className="w-full text-left px-3 py-3 text-base font-medium text-blue-600 hover:bg-blue-50 rounded-md">
                  Portal Corporativo
                </button>
              </Link>
              <div className="pt-2">
                <Button onClick={() => { scrollToBooking(); setIsMenuOpen(false); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Fazer Reserva
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 to-blue-800/80 z-10" />
          <img
            src={getContent('home_hero_bg', "https://images.unsplash.com/photo-1544620347-c4fd4a3d5699?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w0NzEyNjZ8MHwxfHNlYXJjaHw1fHxhcnJpdmFsfGVufDB8fHx8MTY5OTY5NTc0NHww&ixlib=rb-4.0.3&q=80&w=1080")}
            alt="Luxury car background"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="text-white text-center lg:text-left animate-in slide-in-from-left duration-700">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 drop-shadow-lg">
                Transporte Executivo <br className="hidden lg:block"/> de Alto Padrão
              </h1>
              <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-2xl mx-auto lg:mx-0">
                Experiência premium em mobilidade corporativa e receptiva. Pontualidade, segurança e conforto para suas viagens em todo o Brasil.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button 
                  onClick={scrollToBooking}
                  size="lg"
                  className="lg:hidden bg-white text-blue-900 hover:bg-blue-50 font-bold text-lg px-8 py-6 h-auto shadow-lg transition-transform hover:scale-105"
                >
                  Reservar Agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="bg-transparent border-white text-white hover:bg-white/10 font-medium text-lg px-8 py-6 h-auto backdrop-blur-sm"
                  onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Nossos Serviços
                </Button>
              </div>

              <div className="mt-12 grid grid-cols-3 gap-6 border-t border-blue-400/30 pt-8">
                <div>
                  <p className="text-3xl font-bold">50k+</p>
                  <p className="text-blue-200 text-sm">Viagens Realizadas</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">98%</p>
                  <p className="text-blue-200 text-sm">Satisfação</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">24/7</p>
                  <p className="text-blue-200 text-sm">Suporte</p>
                </div>
              </div>
            </div>

            {/* Booking Form Container */}
            <div id="booking" className="relative z-30 animate-in slide-in-from-right duration-700 delay-200">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
                <div className="bg-blue-600 px-6 py-4 text-white">
                  <h3 className="font-bold text-lg flex items-center">
                    <Car className="mr-2 h-5 w-5" />
                    Faça sua cotação online
                  </h3>
                </div>
                <div className="p-2 md:p-4">
                  {/* Embedded Booking Component */}
                  <NovaReserva isEmbedded={true} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-gray-50 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
              Soluções Completas em Transporte
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Atendemos todas as suas necessidades logísticas com uma frota diversificada e motoristas treinados.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 group">
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors duration-300">
                <Plane className="h-7 w-7 text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Transfer Aeroporto</h3>
              <p className="text-gray-600 leading-relaxed">
                Receptivo nos principais aeroportos com monitoramento de voo em tempo real. Seu motorista estará aguardando no desembarque.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 group">
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors duration-300">
                <Car className="h-7 w-7 text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Diárias à Disposição</h3>
              <p className="text-gray-600 leading-relaxed">
                Veículo e motorista à sua disposição por horas ou dias. Ideal para reuniões sequenciais, roadshows e visitas comerciais.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 group">
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors duration-300">
                <Users className="h-7 w-7 text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Eventos e Grupos</h3>
              <p className="text-gray-600 leading-relaxed">
                Coordenação logística para eventos corporativos, casamentos e grandes grupos. Vans, micro-ônibus e ônibus executivos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fleet Section */}
      <section id="fleet" className="py-20 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
              Nossa Frota
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Veículos modernos, blindados e equipados para oferecer o máximo de conforto e segurança.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Sedan Executivo */}
            <div className="group rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className="relative h-48 overflow-hidden bg-gray-100">
                <img 
                  src={getContent('home_fleet_sedan', "https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&q=80&w=800")}
                  alt="Sedan Executivo" 
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <span className="text-white font-medium">Ideal para executivos</span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Sedan Executivo</h3>
                <p className="text-gray-500 text-sm mb-4">Toyota Corolla, Honda Civic ou similar</p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-gray-600 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> 3 Passageiros
                  </li>
                  <li className="flex items-center text-gray-600 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> 2 Malas
                  </li>
                  <li className="flex items-center text-gray-600 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> Ar-condicionado & Wi-Fi
                  </li>
                </ul>
                <Button onClick={scrollToBooking} variant="outline" className="w-full border-blue-600 text-blue-600 hover:bg-blue-50">
                  Selecionar
                </Button>
              </div>
            </div>

            {/* SUV Blindado */}
            <div className="group rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className="relative h-48 overflow-hidden bg-gray-100">
                <img 
                  src={getContent('home_fleet_suv', "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800")}
                  alt="SUV Blindado" 
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
                 <div className="absolute top-4 right-4 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Blindado
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Blindado Executivo</h3>
                <p className="text-gray-500 text-sm mb-4">Sedan blindado ou similar</p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-gray-600 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> 3 Passageiros
                  </li>
                  <li className="flex items-center text-gray-600 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> 2 Malas
                  </li>
                  <li className="flex items-center text-gray-600 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> Blindagem Nível III-A
                  </li>
                </ul>
                <Button onClick={scrollToBooking} variant="outline" className="w-full border-blue-600 text-blue-600 hover:bg-blue-50">
                  Selecionar
                </Button>
              </div>
            </div>

            {/* Van Executiva */}
            <div className="group rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className="relative h-48 overflow-hidden bg-gray-100">
                <img 
                  src={getContent('home_fleet_van', "https://images.unsplash.com/photo-1464219789935-c2d9d9aba644?auto=format&fit=crop&q=80&w=800")}
                  alt="Van Executiva" 
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Van Executiva</h3>
                <p className="text-gray-500 text-sm mb-4">Mercedes-Benz Sprinter ou similar</p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-gray-600 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> 15 Passageiros
                  </li>
                  <li className="flex items-center text-gray-600 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> 10 Malas
                  </li>
                  <li className="flex items-center text-gray-600 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> Bancos Reclináveis
                  </li>
                </ul>
                <Button onClick={scrollToBooking} variant="outline" className="w-full border-blue-600 text-blue-600 hover:bg-blue-50">
                  Selecionar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Differentials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
              <div className="absolute -bottom-4 -right-4 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
              <img
                src={getContent('home_differentials_img', "https://images.unsplash.com/photo-1549929283-f38b2d184000?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w0NzEyNjZ8MHwxfHNlYXJjaHw3fHx0cmFuc2ZlciUyMHNlcnZpY2VzfGVufDB8fHx8MTY5OTY5NTc0NHww&ixlib=rb-4.0.3&q=80&w=1080")}
                alt="Professional driver opening car door"
                className="relative rounded-2xl shadow-2xl z-10"
              />
            </div>
            
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6">
                Por que somos a escolha certa?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Nosso compromisso é com a sua tranquilidade. Cuidamos de cada detalhe para que você possa focar no que realmente importa.
              </p>

              <div className="space-y-6">
                {[
                  { title: 'Motoristas Profissionais', desc: 'Treinados, uniformizados e bilingues (opcional).', icon: Users },
                  { title: 'Frota Premium', desc: 'Veículos novos, blindados e higienizados a cada viagem.', icon: Car },
                  { title: 'Tecnologia e Segurança', desc: 'Rastreamento em tempo real e atendimento 24 horas.', icon: CheckCircle }
                ].map((item, idx) => (
                  <div key={idx} className="flex">
                    <div className="flex-shrink-0 mr-4">
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-600">
                        <item.icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">{item.title}</h4>
                      <p className="mt-1 text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA / Footer Simple */}
      <footer className="bg-gray-900 text-white py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold mb-4">TransferOnline</h3>
              <p className="text-gray-400 max-w-sm">
                Sua parceira de confiança para mobilidade corporativa e transporte executivo em todo o território nacional.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contato</h4>
              <ul className="space-y-2 text-gray-400">
              <li>contato@transferonline.com.br</li>
              <li>(11) 5102-3892</li>
              <li>São Paulo, SP</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Social</h4>
              <div className="flex space-x-4">
                <a href="https://instagram.com/transferonline" target="_blank" rel="noopener noreferrer" className="bg-gray-800 p-2 rounded-full hover:bg-blue-600 transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-blue-600 transition-colors">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-blue-600 transition-colors">
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm gap-4">
            <div>
              &copy; {new Date().getFullYear()} TransferOnline. Todos os direitos reservados.
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              <Link to={createPageUrl('PoliticaDePrivacidade')} className="hover:text-blue-400 transition-colors">
                Política de Privacidade
              </Link>
              <a href="https://solicitacao.transferonline.com.br/transferadm/Default.aspx" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors flex items-center gap-1">
                <Lock className="w-3 h-3" /> Restrito
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}