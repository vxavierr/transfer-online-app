import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, MessageCircle, Save, AlertCircle, CheckCircle, ArrowLeftRight, Percent, Image as ImageIcon, Upload, X, Mail, MapPin, DollarSign, Calendar, Plane } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '../components/LanguageContext';

export default function Configuracoes() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [adminWhatsappNumber, setAdminWhatsappNumber] = useState(''); // New state
  const [roundTripDiscount, setRoundTripDiscount] = useState('10');
  const [splashScreenUrl, setSplashScreenUrl] = useState('');
  const [defaultLogoUrl, setDefaultLogoUrl] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [supplierBaseAddress, setSupplierBaseAddress] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [airportKeywords, setAirportKeywords] = useState('aeroporto, airport, gru, guarulhos, cgh, congonhas, vcp, viracopos, galeão, gig, santos dumont, sdu, confins, cnf');
  
  // Public Pricing States
  const [publicPricingEnabled, setPublicPricingEnabled] = useState(false);
  const [publicPricingStartDate, setPublicPricingStartDate] = useState('');
  const [publicPricingEndDate, setPublicPricingEndDate] = useState('');

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Verificar se é admin
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser.role !== 'admin') {
          window.location.href = '/';
          return;
        }
        setIsCheckingAuth(false);
      } catch (error) {
        console.error("Authentication check failed:", error);
        base44.auth.redirectToLogin();
      }
    };

    checkAuth();
  }, []);

  const { data: configs, isLoading } = useQuery({
    queryKey: ['appConfigs'],
    queryFn: () => base44.entities.AppConfig.list(),
    initialData: [],
    enabled: !isCheckingAuth
  });

  React.useEffect(() => {
    if (!isCheckingAuth) {
      const whatsappConfig = configs.find(c => c.config_key === 'whatsapp_number');
      if (whatsappConfig) {
        setWhatsappNumber(whatsappConfig.config_value || '');
      }
      
      const adminWhatsappConfig = configs.find(c => c.config_key === 'admin_whatsapp_number'); // New: find admin whatsapp
      if (adminWhatsappConfig) {
        setAdminWhatsappNumber(adminWhatsappConfig.config_value || '');
      }
      
      const discountConfig = configs.find(c => c.config_key === 'round_trip_discount_percentage');
      if (discountConfig) {
        setRoundTripDiscount(discountConfig.config_value || '10');
      }

      const splashConfig = configs.find(c => c.config_key === 'splash_screen_url');
      if (splashConfig) {
        setSplashScreenUrl(splashConfig.config_value || '');
      }

      const logoConfig = configs.find(c => c.config_key === 'default_splash_logo_url');
      if (logoConfig) {
        setDefaultLogoUrl(logoConfig.config_value || '');
      }

      const emailConfig = configs.find(c => c.config_key === 'admin_notification_email');
      if (emailConfig) {
        setAdminEmail(emailConfig.config_value || '');
      }

      const supplierAddressConfig = configs.find(c => c.config_key === 'supplier_base_address');
      if (supplierAddressConfig) {
        setSupplierBaseAddress(supplierAddressConfig.config_value || '');
      }

      const airportKeywordsConfig = configs.find(c => c.config_key === 'airport_keywords');
      if (airportKeywordsConfig) {
        setAirportKeywords(airportKeywordsConfig.config_value || '');
      }

      // Public Pricing Configs
      const ppEnabledConfig = configs.find(c => c.config_key === 'public_pricing_enabled');
      setPublicPricingEnabled(ppEnabledConfig?.config_value === 'true');

      const ppStartConfig = configs.find(c => c.config_key === 'public_pricing_start_date');
      setPublicPricingStartDate(ppStartConfig?.config_value || '');

      const ppEndConfig = configs.find(c => c.config_key === 'public_pricing_end_date');
      setPublicPricingEndDate(ppEndConfig?.config_value || '');
    }
  }, [configs, isCheckingAuth]);

  const updateConfigMutation = useMutation({
    mutationFn: async (dataArray) => {
      const results = [];
      for (const config of dataArray) {
        const existing = configs.find(c => c.config_key === config.config_key);
        if (existing) {
          results.push(await base44.entities.AppConfig.update(existing.id, config));
        } else {
          results.push(await base44.entities.AppConfig.create(config));
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appConfigs'] });
      setSuccess(true);
      setError('');
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err) => {
      console.error("Failed to save configurations:", err);
      setError('Erro ao salvar configurações. Tente novamente.');
      setSuccess(false);
    }
  });

  const handleImageUpload = async (e, type = 'splash') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB.');
      return;
    }

    if (type === 'splash') {
      setUploadingImage(true);
    } else {
      setUploadingLogo(true);
    }
    setError('');

    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      if (type === 'splash') {
        setSplashScreenUrl(response.file_url);
        setUploadingImage(false);
      } else {
        setDefaultLogoUrl(response.file_url);
        setUploadingLogo(false);
      }
    } catch (err) {
      console.error('Erro ao fazer upload:', err);
      setError('Erro ao fazer upload da imagem. Tente novamente.');
      if (type === 'splash') {
        setUploadingImage(false);
      } else {
        setUploadingLogo(false);
      }
    }
  };

  const handleRemoveSplash = () => {
    setSplashScreenUrl('');
  };

  const handleRemoveLogo = () => {
    setDefaultLogoUrl('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    setError('');

    if (!whatsappNumber) {
      setError('Por favor, informe o número do WhatsApp de suporte.'); // Updated error message
      return;
    }
    if (!whatsappNumber.startsWith('+')) {
      setError('O número do WhatsApp deve começar com + seguido do código do país (ex: +5511999998888)');
      return;
    }

    // New validation for admin whatsapp number
    if (adminWhatsappNumber && !adminWhatsappNumber.startsWith('+')) {
      setError('O número do WhatsApp do admin deve começar com + seguido do código do país (ex: +5511999998888)');
      return;
    }

    const discount = parseFloat(roundTripDiscount);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      setError('O percentual de desconto deve ser um número entre 0 e 100.');
      return;
    }

    // Existing validation for admin email
    if (adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      setError('Por favor, informe um e-mail válido para notificações administrativas.');
      return;
    }

    // Validation for supplier base address
    if (!supplierBaseAddress) {
      setError('Por favor, informe o endereço base do fornecedor.');
      return;
    }

    updateConfigMutation.mutate([
      {
        config_key: 'whatsapp_number',
        config_value: whatsappNumber,
        description: 'Número do WhatsApp para contato e suporte ao cliente' // Updated description
      },
      // New config for admin whatsapp number
      {
        config_key: 'admin_whatsapp_number',
        config_value: adminWhatsappNumber,
        description: 'Número do WhatsApp do administrador para receber notificações de reservas e cotações'
      },
      {
        config_key: 'round_trip_discount_percentage',
        config_value: roundTripDiscount,
        description: 'Percentual de desconto para reservas de ida e volta'
      },
      {
        config_key: 'splash_screen_url',
        config_value: splashScreenUrl,
        description: 'URL da imagem do splash screen'
      },
      {
        config_key: 'default_splash_logo_url',
        config_value: defaultLogoUrl,
        description: 'URL do logo padrão exibido no splash screen quando não há imagem personalizada'
      },
      // Existing config for admin email
      {
        config_key: 'admin_notification_email',
        config_value: adminEmail,
        description: 'E-mail do administrador para receber notificações de novas reservas'
      },
      // Existing config for supplier base address
      {
        config_key: 'supplier_base_address',
        config_value: supplierBaseAddress,
        description: 'Endereço base do fornecedor para cálculo de distâncias'
      },
      {
        config_key: 'airport_keywords',
        config_value: airportKeywords,
        description: 'Palavras-chave para identificar aeroportos (separadas por vírgula)'
      },
      // Public Pricing Configs
      {
        config_key: 'public_pricing_enabled',
        config_value: String(publicPricingEnabled),
        description: 'Habilita a visualização pública de preços sem login'
      },
      {
        config_key: 'public_pricing_start_date',
        config_value: publicPricingStartDate,
        description: 'Data de início da visualização pública de preços'
      },
      {
        config_key: 'public_pricing_end_date',
        config_value: publicPricingEndDate,
        description: 'Data de término da visualização pública de preços'
      }
    ]);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 relative overflow-hidden">
      {/* Formas Abstratas Animadas - Apenas Desktop */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 right-1/4 w-80 h-80 bg-gradient-to-br from-indigo-300/15 to-purple-200/10 rounded-full blur-3xl animate-blob-config"></div>
        <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-300/15 to-cyan-200/10 rounded-full blur-3xl animate-blob-config animation-delay-6000"></div>
        <div className="absolute top-1/3 left-10 w-72 h-72 bg-gradient-to-br from-green-200/10 to-blue-200/15 rounded-full blur-3xl animate-blob-config animation-delay-9000"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">
              {t('settings.title')}
            </h1>
          </div>
          <p className="text-gray-600">{t('settings.subtitle')}</p>
        </div>

        {isLoading && !isCheckingAuth ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {success && (
              <Alert className="bg-green-50 border-green-200 mb-4">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {t('settings.savedSuccessfully')}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="general" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-[600px] h-auto p-1 bg-gray-200">
                <TabsTrigger value="general" className="py-2">Geral</TabsTrigger>
                <TabsTrigger value="communication" className="py-2">Comunicação</TabsTrigger>
                <TabsTrigger value="financial" className="py-2">Financeiro</TabsTrigger>
                <TabsTrigger value="appearance" className="py-2">Aparência</TabsTrigger>
              </TabsList>

              {/* ABA GERAL */}
              <TabsContent value="general" className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                {/* Endereço Base do Fornecedor */}
                <Card className="shadow-sm border-t-4 border-t-blue-600">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <MapPin className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Endereço Base</CardTitle>
                        <CardDescription>
                          Ponto de partida e retorno dos veículos para cálculo de distâncias
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="supplierBaseAddress" className="text-base font-semibold">
                          Endereço Completo *
                        </Label>
                        <Input
                          id="supplierBaseAddress"
                          type="text"
                          value={supplierBaseAddress}
                          onChange={(e) => setSupplierBaseAddress(e.target.value)}
                          placeholder="Ex: Rua Exemplo, 123 - Bairro - Cidade/Estado"
                          className="text-lg h-12 mt-2"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Usado como base para calcular a distância total (Base → Origem → Destino → Base).
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Palavras-chave de Aeroporto */}
                <Card className="shadow-sm border-t-4 border-t-cyan-600">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-cyan-100 rounded-lg">
                        <Plane className="w-6 h-6 text-cyan-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Aeroportos</CardTitle>
                        <CardDescription>
                          Configuração para identificação automática de aeroportos
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="airportKeywords" className="text-base font-semibold">
                          Palavras-chave (separadas por vírgula)
                        </Label>
                        <Input
                          id="airportKeywords"
                          type="text"
                          value={airportKeywords}
                          onChange={(e) => setAirportKeywords(e.target.value)}
                          placeholder="aeroporto, airport, gru, ..."
                          className="text-lg h-12 mt-2"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Se o endereço contiver uma dessas palavras, o sistema pedirá o número do voo.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ABA COMUNICAÇÃO */}
              <TabsContent value="communication" className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                {/* WhatsApp Config Card */}
                <Card className="shadow-sm border-t-4 border-t-green-600">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <MessageCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{t('settings.whatsappConfig')}</CardTitle>
                        <CardDescription>
                          Canais de comunicação via WhatsApp
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="whatsapp" className="text-base font-semibold">
                        {t('settings.whatsappNumber')} (Suporte ao Cliente) *
                      </Label>
                      <Input
                        id="whatsapp"
                        type="text"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        placeholder="+5511999998888"
                        className="text-lg h-12 mt-2"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Exibido no botão flutuante para clientes.
                      </p>
                    </div>

                    <div className="border-t pt-4">
                      <Label htmlFor="admin_whatsapp" className="text-base font-semibold">
                        WhatsApp do Administrador (Notificações)
                      </Label>
                      <Input
                        id="admin_whatsapp"
                        type="text"
                        value={adminWhatsappNumber}
                        onChange={(e) => setAdminWhatsappNumber(e.target.value)}
                        placeholder="+5511999998888"
                        className="text-lg h-12 mt-2"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Recebe alertas de novas reservas e cotações.
                      </p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                      <strong>Formato obrigatório:</strong> +[CódigoPaís][DDD][Número] (ex: +5511999998888)
                    </div>
                  </CardContent>
                </Card>

                {/* E-mail de Notificações */}
                <Card className="shadow-sm border-t-4 border-t-indigo-600">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Mail className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">E-mail</CardTitle>
                        <CardDescription>
                          Configurações de notificações por e-mail
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <Label htmlFor="adminEmail" className="text-base font-semibold">
                        E-mail do Administrador (Opcional)
                      </Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@seudominio.com"
                        className="text-lg h-12 mt-2"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Recebe cópia de todas as confirmações de reserva.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ABA FINANCEIRO */}
              <TabsContent value="financial" className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                {/* Round Trip Discount */}
                <Card className="shadow-sm border-t-4 border-t-orange-600">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <ArrowLeftRight className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Desconto Ida e Volta</CardTitle>
                        <CardDescription>
                          Incentive reservas de retorno com desconto automático
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="discount" className="text-base font-semibold flex items-center gap-2">
                          <Percent className="w-5 h-5 text-orange-600" />
                          Percentual de Desconto (%)
                        </Label>
                        <Input
                          id="discount"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={roundTripDiscount}
                          onChange={(e) => setRoundTripDiscount(e.target.value)}
                          className="text-lg h-12 mt-2"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Aplicado sobre o valor total quando o cliente agenda ida e volta juntos.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Preços Públicos */}
                <Card className="shadow-sm border-t-4 border-t-teal-600">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-100 rounded-lg">
                        <DollarSign className="w-6 h-6 text-teal-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Preços Públicos</CardTitle>
                        <CardDescription>
                          Controle de visibilidade de preços para visitantes
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-base font-semibold">
                          Permitir visualização sem login
                        </Label>
                        <p className="text-sm text-gray-500">
                          Visitantes podem ver preços na home page.
                        </p>
                      </div>
                      <Switch
                        checked={publicPricingEnabled}
                        onCheckedChange={setPublicPricingEnabled}
                      />
                    </div>

                    {publicPricingEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                          <Label htmlFor="pp_start_date">Data de Início (Opcional)</Label>
                          <Input
                            id="pp_start_date"
                            type="date"
                            value={publicPricingStartDate}
                            onChange={(e) => setPublicPricingStartDate(e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="pp_end_date">Data de Término (Opcional)</Label>
                          <Input
                            id="pp_end_date"
                            type="date"
                            value={publicPricingEndDate}
                            onChange={(e) => setPublicPricingEndDate(e.target.value)}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ABA APARÊNCIA */}
              <TabsContent value="appearance" className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                {/* Splash Screen */}
                <Card className="shadow-sm border-t-4 border-t-purple-600">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <ImageIcon className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Splash Screen</CardTitle>
                        <CardDescription>
                          Personalize a tela de carregamento inicial
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                      <div className="flex-1 space-y-4 w-full">
                        {splashScreenUrl ? (
                          <div className="relative group max-w-xs mx-auto md:mx-0">
                            <img
                              src={splashScreenUrl}
                              alt="Preview"
                              className="w-full rounded-lg border shadow-sm"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={handleRemoveSplash}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
                            <input
                              type="file"
                              id="splash-upload"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, 'splash')}
                              className="hidden"
                              disabled={uploadingImage}
                            />
                            <label htmlFor="splash-upload" className="cursor-pointer flex flex-col items-center">
                              <Upload className="w-10 h-10 text-gray-400 mb-2" />
                              <span className="text-sm font-medium text-gray-700">
                                {uploadingImage ? 'Enviando...' : 'Carregar Imagem'}
                              </span>
                              <span className="text-xs text-gray-500 mt-1">PNG/JPG até 5MB</span>
                            </label>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                        <p className="font-semibold mb-2">Recomendações:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Fundo transparente (PNG)</li>
                          <li>Dimensões quadradas (ex: 500x500px)</li>
                          <li>Centralizada</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Logo Padrão */}
                <Card className="shadow-sm border-t-4 border-t-pink-600">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-pink-100 rounded-lg">
                        <ImageIcon className="w-6 h-6 text-pink-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Logo Padrão</CardTitle>
                        <CardDescription>
                          Fallback quando Splash Screen não está definido
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                      <div className="flex-1 space-y-4 w-full">
                        {defaultLogoUrl ? (
                          <div className="relative group max-w-xs mx-auto md:mx-0">
                            <img
                              src={defaultLogoUrl}
                              alt="Logo Preview"
                              className="w-full rounded-lg border shadow-sm"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={handleRemoveLogo}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
                            <input
                              type="file"
                              id="logo-upload"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, 'logo')}
                              className="hidden"
                              disabled={uploadingLogo}
                            />
                            <label htmlFor="logo-upload" className="cursor-pointer flex flex-col items-center">
                              <Upload className="w-10 h-10 text-gray-400 mb-2" />
                              <span className="text-sm font-medium text-gray-700">
                                {uploadingLogo ? 'Enviando...' : 'Carregar Logo'}
                              </span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="sticky bottom-4 z-10 mx-auto max-w-4xl">
              <Button
                type="submit"
                disabled={updateConfigMutation.isPending || uploadingImage || uploadingLogo}
                className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-lg shadow-lg"
              >
                {updateConfigMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    {t('common.processing')}
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    {t('common.save')}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>

      <style jsx>{`
        @keyframes blob-config {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          50% {
            transform: translate(30px, -30px) scale(1.15);
          }
        }

        .animate-blob-config {
          animation: blob-config 32s infinite ease-in-out;
        }

        .animation-delay-6000 {
          animation-delay: 6s;
        }

        .animation-delay-9000 {
          animation-delay: 9s;
        }
      `}</style>
    </div>
  );
}