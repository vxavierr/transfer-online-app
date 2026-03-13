import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { User, Mail, Phone, MessageSquare, CreditCard, AlertCircle, Loader2, Users, Ticket, Check, X, BellRing, Plus, Trash2 } from 'lucide-react';
import PhoneInputWithCountry from '@/components/ui/PhoneInputWithCountry';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { base44 } from '@/api/base44Client';
import { validateCoupon } from '@/functions/validateCoupon';
import { generateBookingNumber } from '@/functions/generateBookingNumber';
import { sendBookingEmail } from '@/functions/sendBookingEmail';
import { useLanguage } from '@/components/LanguageContext';

function PaymentForm({ bookingId, onSuccess, onError, totalPrice }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message);
        setIsProcessing(false);
        onError(error.message);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        await base44.entities.Booking.update(bookingId, {
          payment_status: 'pago',
          status: 'confirmada',
          payment_intent_id: paymentIntent.id
        });
        setIsProcessing(false);
        onSuccess();
      }
    } catch (err) {
      console.error("Erro ao confirmar pagamento:", err);
      setErrorMessage(t('bookingForm.paymentError'));
      setIsProcessing(false);
      onError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 p-3 rounded-lg mb-3">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-900 text-sm">{t('bookingForm.totalToPay')}</span>
          <span className="text-xl font-bold text-blue-600">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(totalPrice)}
          </span>
        </div>
      </div>

      <PaymentElement />

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs font-medium">{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-green-600 hover:bg-green-700 py-2.5 h-11 text-sm"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('bookingForm.processingPayment')}
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            {t('bookingForm.confirmPayment')}
          </>
        )}
      </Button>
    </form>
  );
}

export default function BookingForm({ 
  serviceType, 
  tripDetails, 
  distanceData, 
  selectedVehicle, 
  driverLanguage = 'pt',
  onPaymentCompleted 
}) {
  const { t } = useLanguage();
  const [isBookingForOther, setIsBookingForOther] = useState(false);
  const [loggedUserData, setLoggedUserData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: ''
  });

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    passengers: 1,
    notes: ''
  });

  const [wantNotifications, setWantNotifications] = useState(false);
  const [notificationPhones, setNotificationPhones] = useState(['']);

  const [user, setUser] = useState(null);

  const [couponCode, setCouponCode] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [priceBeforeCoupon, setPriceBeforeCoupon] = useState(selectedVehicle.calculated_price);
  const [finalPrice, setFinalPrice] = useState(selectedVehicle.calculated_price);

  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [currentBookingId, setCurrentBookingId] = useState(null);
  const [currentBookingNumber, setCurrentBookingNumber] = useState(null);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [stripePromise, setStripePromise] = useState(null);

  useEffect(() => {
    const initStripe = async () => {
      try {
        const response = await base44.functions.invoke('getPublicConfig');
        const key = response.data?.stripePublishableKey;
        if (key) {
          setStripePromise(loadStripe(key));
        }
      } catch (err) {
        console.error('Failed to load Stripe key', err);
      }
    };
    initStripe();
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const userData = {
          customer_name: currentUser.full_name || '',
          customer_email: currentUser.email || '',
          customer_phone: ''
        };
        
        setLoggedUserData(userData);
        setFormData(prev => ({ ...prev, ...userData }));
      } catch (error) {
        console.log('[BookingForm] Usuário não autenticado:', error);
        const guestData = {
          customer_name: '',
          customer_email: tripDetails.email || '',
          customer_phone: tripDetails.phone || ''
        };
        setLoggedUserData(guestData);
        setFormData(prev => ({ ...prev, ...guestData }));
      }
    };
    loadUserData();
  }, [tripDetails]);

  useEffect(() => {
    setPriceBeforeCoupon(selectedVehicle.calculated_price);
    setFinalPrice(selectedVehicle.calculated_price);
    setAppliedCoupon(null);
    setCouponCode('');
  }, [selectedVehicle.calculated_price]);

  const handleBookingForOtherChange = (checked) => {
    setIsBookingForOther(checked);
    if (checked) {
      setFormData(prev => ({ ...prev, customer_name: '', customer_email: '', customer_phone: '' }));
    } else {
      setFormData(prev => ({ ...prev, ...loggedUserData }));
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError(t('bookingForm.errEmptyCoupon'));
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError('');

    try {
      const response = await validateCoupon({
        couponCode: couponCode.trim(),
        totalAmount: priceBeforeCoupon,
        serviceType: serviceType,
        vehicleTypeId: selectedVehicle.id
      });

      if (response.data.valid) {
        setAppliedCoupon(response.data.coupon);
        setFinalPrice(response.data.new_total);
        setCouponError('');
      } else {
        setCouponError(response.data.error || t('bookingForm.errInvalidCoupon'));
        setAppliedCoupon(null);
      }
    } catch (error) {
      console.error('Erro ao validar cupom:', error);
      setCouponError(error.response?.data?.error || t('bookingForm.errValidateCoupon'));
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    setFinalPrice(priceBeforeCoupon);
  };

  const handleAddNotificationPhone = () => {
    setNotificationPhones([...notificationPhones, '']);
  };

  const handleRemoveNotificationPhone = (index) => {
    setNotificationPhones(notificationPhones.filter((_, i) => i !== index));
  };

  const handleNotificationPhoneChange = (index, value) => {
    const updated = [...notificationPhones];
    updated[index] = value;
    setNotificationPhones(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.passengers < 1) {
      setErrorMessage(t('bookingForm.errPassengers'));
      return;
    }

    if (formData.passengers > selectedVehicle.max_passengers) {
      setErrorMessage(t('bookingForm.errMaxPassengers').replace('{max}', selectedVehicle.max_passengers));
      return;
    }

    if (!user) {
      handleGuestCheckout();
      return;
    }

    setIsCreatingBooking(true);
    setErrorMessage('');

    try {
      const bookingNumberResponse = await generateBookingNumber();
      const bookingNumber = bookingNumberResponse.data.bookingNumber;

      const bookingData = {
        booking_number: bookingNumber,
        service_type: serviceType,
        vehicle_type_id: selectedVehicle.id,
        vehicle_type_name: selectedVehicle.name,
        driver_language: driverLanguage,
        origin: tripDetails.origin,
        destination: tripDetails.destination || tripDetails.origin,
        date: tripDetails.date,
        time: tripDetails.time,
        distance_km: parseFloat(distanceData?.distance_km || 0),
        duration_minutes: parseInt(distanceData?.duration_minutes || 0),
        passengers: formData.passengers,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        is_booking_for_other: isBookingForOther,
        notes: formData.notes,
        price_before_coupon: priceBeforeCoupon,
        total_price: finalPrice,
        payment_status: 'aguardando',
        status: 'pendente',
        notification_phones: wantNotifications ? notificationPhones.filter(p => p && p.trim().length > 5) : []
      };

      if (tripDetails.origin_flight_number) {
        bookingData.origin_flight_number = tripDetails.origin_flight_number;
      }
      if (tripDetails.destination_flight_number) {
        bookingData.destination_flight_number = tripDetails.destination_flight_number;
      }

      if (appliedCoupon) {
        bookingData.coupon_code = appliedCoupon.code;
        bookingData.coupon_id = appliedCoupon.id;
        bookingData.coupon_discount_type = appliedCoupon.discount_type;
        bookingData.coupon_discount_value = appliedCoupon.discount_value;
        bookingData.coupon_discount_amount = priceBeforeCoupon - finalPrice;
      }

      if (serviceType === 'round_trip') {
        bookingData.return_date = tripDetails.return_date;
        bookingData.return_time = tripDetails.return_time;
        if (tripDetails.return_origin_flight_number) {
          bookingData.return_origin_flight_number = tripDetails.return_origin_flight_number;
        }
        if (tripDetails.return_destination_flight_number) {
          bookingData.return_destination_flight_number = tripDetails.return_destination_flight_number;
        }
      } else if (serviceType === 'hourly') {
        bookingData.hours = tripDetails.hours;
      }

      const booking = await base44.entities.Booking.create(bookingData);
      setCurrentBookingId(booking.id);
      setCurrentBookingNumber(booking.booking_number);

      if (appliedCoupon) {
        try {
          const coupons = await base44.entities.Coupon.list();
          const coupon = coupons.find(c => c.id === appliedCoupon.id);
          if (coupon) {
            await base44.entities.Coupon.update(coupon.id, {
              current_usage_count: (coupon.current_usage_count || 0) + 1
            });
          }
        } catch (couponError) {
          console.error('Erro ao atualizar contador do cupom:', couponError);
        }
      }

      const response = await base44.functions.invoke('createPaymentIntent', {
        amount: finalPrice,
        currency: 'brl',
        metadata: {
          booking_id: booking.id,
          booking_number: booking.booking_number,
          customer_email: formData.customer_email,
          customer_name: formData.customer_name,
          service_type: serviceType,
          coupon_code: appliedCoupon?.code || null
        }
      });

      if (response.data.clientSecret) {
        setClientSecret(response.data.clientSecret);
        setShowPayment(true);
      } else {
        throw new Error('Erro ao iniciar pagamento. Resposta do servidor incompleta.');
      }
    } catch (error) {
      console.error('Erro ao criar reserva:', error);
      setErrorMessage(error.response?.data?.error || error.message || 'Erro ao processar reserva. Tente novamente.');
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const handleGuestCheckout = async () => {
    setIsCreatingBooking(true);
    setErrorMessage('');

    try {
      const payload = {
        serviceType,
        vehicleTypeId: selectedVehicle.id,
        formData: {
          ...formData,
          origin_flight_number: tripDetails.origin_flight_number,
          destination_flight_number: tripDetails.destination_flight_number,
          return_origin_flight_number: tripDetails.return_origin_flight_number,
          return_destination_flight_number: tripDetails.return_destination_flight_number,
          origin: tripDetails.origin,
          destination: tripDetails.destination,
          date: tripDetails.date,
          time: tripDetails.time,
          return_date: tripDetails.return_date,
          return_time: tripDetails.return_time,
          hours: tripDetails.hours
        },
        driverLanguage
      };

      const response = await base44.functions.invoke('createGuestBookingAndStripeCheckout', payload);

      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error(response.data.error || 'Erro ao gerar link de pagamento.');
      }
    } catch (error) {
      console.error('Erro no checkout de visitante:', error);
      const msg = error.response?.data?.error || error.message || 'Erro ao processar reserva.';
      setErrorMessage(msg);
      setIsCreatingBooking(false);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      await sendBookingEmail({ bookingId: currentBookingId, recipientType: 'customer', emailType: 'confirmation' });
      await sendBookingEmail({ bookingId: currentBookingId, recipientType: 'admin', emailType: 'new_booking_notification' });
    } catch (emailError) {
      console.error('Erro ao enviar e-mails:', emailError);
    }

    if (onPaymentCompleted) {
      onPaymentCompleted(currentBookingNumber);
    }
  };

  const handlePaymentError = (error) => {
    console.error('Erro no pagamento:', error);
    setErrorMessage(error);
  };

  if (showPayment && clientSecret) {
    return (
      <Card className="shadow-xl rounded-2xl">
        <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-t-2xl">
          <CardTitle className="text-lg">{t('bookingForm.payment')}</CardTitle>
          <div className="text-green-100 text-xs">
            {t('bookingForm.booking')} {currentBookingNumber}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: { theme: 'stripe', variables: { colorPrimary: '#2563eb' } },
              locale: 'pt-BR'
            }}
          >
            <PaymentForm
              bookingId={currentBookingId}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              totalPrice={finalPrice}
            />
          </Elements>
        </CardContent>
      </Card>
    );
  }

  const discountAmount = priceBeforeCoupon - finalPrice;

  return (
    <Card className="shadow-xl rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <CardTitle className="text-lg">{t('bookingForm.title')}</CardTitle>
        <div className="text-blue-100 text-xs">
          {tripDetails.origin} → {tripDetails.destination || tripDetails.origin}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {errorMessage && (
          <Alert variant="destructive" className="mb-4 rounded-lg">
            <AlertCircle className="h-3.5 w-3.5" />
            <AlertDescription className="text-xs font-medium">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Resumo da Viagem */}
        <div className="bg-blue-50 p-3 rounded-lg mb-4 space-y-1.5">
          <h3 className="font-semibold text-gray-900 text-sm mb-2">{t('bookingForm.summary')}</h3>
          <div className="grid md:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-600">{t('bookingForm.type')}</span>
              <span className="ml-2 font-medium">
                {serviceType === 'one_way' ? t('novaReserva.oneWay') : serviceType === 'round_trip' ? t('novaReserva.roundTrip') : t('novaReserva.hourly')}
              </span>
            </div>
            <div>
              <span className="text-gray-600">{t('bookingForm.vehicle')}</span>
              <span className="ml-2 font-medium">{selectedVehicle.name}</span>
            </div>
            <div>
              <span className="text-gray-600">{t('bookingForm.language')}</span>
              <span className="ml-2 font-medium">
                {driverLanguage === 'pt' ? t('bookingForm.langPt') : driverLanguage === 'en' ? t('bookingForm.langEn') : t('bookingForm.langEs')}
              </span>
            </div>
            {serviceType === 'hourly' && (
              <div>
                <span className="text-gray-600">{t('bookingForm.hours')}</span>
                <span className="ml-2 font-medium">{tripDetails.hours}h</span>
              </div>
            )}
            <div>
              <span className="text-gray-600">{t('bookingForm.date')}</span>
              <span className="ml-2 font-medium">{formatDateDisplay(tripDetails.date)}</span>
            </div>
            <div>
              <span className="text-gray-600">{t('bookingForm.time')}</span>
              <span className="ml-2 font-medium">{tripDetails.time}</span>
            </div>
            {serviceType === 'round_trip' && (
              <>
                <div>
                  <span className="text-gray-600">{t('bookingForm.return')}</span>
                  <span className="ml-2 font-medium">{formatDateDisplay(tripDetails.return_date)}</span>
                </div>
                <div>
                  <span className="text-gray-600">{t('bookingForm.time')}</span>
                  <span className="ml-2 font-medium">{tripDetails.return_time}</span>
                </div>
              </>
            )}
            {tripDetails.origin_flight_number && (
              <div>
                <span className="text-gray-600">{t('bookingForm.flightOrigin')}</span>
                <span className="ml-2 font-medium">{tripDetails.origin_flight_number}</span>
              </div>
            )}
            {tripDetails.destination_flight_number && (
              <div>
                <span className="text-gray-600">{t('bookingForm.flightDestination')}</span>
                <span className="ml-2 font-medium">{tripDetails.destination_flight_number}</span>
              </div>
            )}
            {serviceType === 'round_trip' && tripDetails.return_origin_flight_number && (
              <div>
                <span className="text-gray-600">{t('bookingForm.flightReturnOrigin')}</span>
                <span className="ml-2 font-medium">{tripDetails.return_origin_flight_number}</span>
              </div>
            )}
            {serviceType === 'round_trip' && tripDetails.return_destination_flight_number && (
              <div>
                <span className="text-gray-600">{t('bookingForm.flightReturnDestination')}</span>
                <span className="ml-2 font-medium">{tripDetails.return_destination_flight_number}</span>
              </div>
            )}
          </div>
        </div>

        {/* Formulário de Dados do Passageiro */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border-t pt-4">
            <h3 className="font-semibold text-base mb-3 text-gray-900">{t('bookingForm.passengerData')}</h3>
            
            <div className="flex items-center space-x-2 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Checkbox
                id="booking_for_other"
                checked={isBookingForOther}
                onCheckedChange={handleBookingForOtherChange}
              />
              <Label
                htmlFor="booking_for_other"
                className="flex items-center gap-1.5 text-sm font-medium text-gray-900 cursor-pointer"
              >
                <Users className="w-4 h-4 text-yellow-600" />
                {t('bookingForm.bookingForOther')}
              </Label>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="customer_name" className="flex items-center gap-1.5 text-xs font-semibold text-gray-900">
                  <User className="w-4 h-4 text-blue-600" />
                  {t('bookingForm.fullName')} {isBookingForOther && t('bookingForm.ofPassenger')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customer_name"
                  required
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder={isBookingForOther ? t('bookingForm.otherNamePlaceholder') : t('bookingForm.namePlaceholder')}
                  className="w-full px-3 py-2.5 text-sm h-10"
                  disabled={!isBookingForOther && !!loggedUserData.customer_name}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customer_email" className="flex items-center gap-1.5 text-xs font-semibold text-gray-900">
                  <Mail className="w-4 h-4 text-blue-600" />
                  {t('bookingForm.emailLabel')} {isBookingForOther && t('bookingForm.ofPassenger')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customer_email"
                  type="email"
                  required
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  placeholder={isBookingForOther ? t('bookingForm.passengerEmailPlaceholder') : t('bookingForm.yourEmailPlaceholder')}
                  className="w-full px-3 py-2.5 text-sm h-10"
                  disabled={!isBookingForOther && !!loggedUserData.customer_email}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customer_phone" className="flex items-center gap-1.5 text-xs font-semibold text-gray-900">
                  <Phone className="w-4 h-4 text-blue-600" />
                  {t('bookingForm.phone')} {isBookingForOther && t('bookingForm.ofPassenger')} <span className="text-red-500">*</span>
                </Label>
                <PhoneInputWithCountry
                  id="customer_phone"
                  required
                  value={formData.customer_phone}
                  onChange={(value) => setFormData({ ...formData, customer_phone: value })}
                  placeholder={t('bookingForm.phonePlaceholder')}
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="passengers" className="text-xs font-semibold text-gray-900">
                  {t('bookingForm.numPassengers')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="passengers"
                  type="number"
                  min="1"
                  max={selectedVehicle.max_passengers}
                  required
                  value={formData.passengers}
                  onChange={(e) => setFormData({ ...formData, passengers: parseInt(e.target.value) })}
                  className="w-full px-3 py-2.5 text-sm h-10"
                />
                <p className="text-xs text-gray-500">
                  {t('bookingForm.maxPassengers').replace('{max}', selectedVehicle.max_passengers)}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="flex items-center gap-1.5 text-xs font-semibold text-gray-900">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  {t('bookingForm.notes')}
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('bookingForm.notesPlaceholder')}
                  className="w-full min-h-[80px] px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Notificações em Tempo Real */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-base mb-3 text-gray-900 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-blue-600" />
              {t('bookingForm.tripNotifications')}
            </h3>
            
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-3 mb-3">
                <Checkbox 
                  id="want_notifications" 
                  checked={wantNotifications} 
                  onCheckedChange={setWantNotifications}
                  className="mt-1"
                />
                <div>
                  <Label 
                    htmlFor="want_notifications" 
                    className="text-sm font-medium text-blue-900 cursor-pointer"
                  >
                    {t('bookingForm.wantNotifications')}
                  </Label>
                  <p className="text-xs text-blue-700 mt-1">
                    {t('bookingForm.notificationsDesc')}
                  </p>
                </div>
              </div>

              {wantNotifications && (
                <div className="pl-7 space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-xs font-semibold text-blue-900">
                    {t('bookingForm.notificationPhones')}
                  </Label>
                  
                  {notificationPhones.map((phone, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1">
                        <PhoneInputWithCountry
                          value={phone}
                          onChange={(value) => handleNotificationPhoneChange(index, value)}
                          placeholder="(00) 00000-0000"
                          className="bg-white h-9 text-sm"
                        />
                      </div>
                      {notificationPhones.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveNotificationPhone(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddNotificationPhone}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs h-8"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {t('bookingForm.addPhone')}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Cupom de Desconto */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-base mb-3 text-gray-900 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-green-600" />
              {t('bookingForm.coupon')}
            </h3>
            
            {!appliedCoupon ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder={t('bookingForm.couponPlaceholder')}
                    className="flex-1 text-sm h-10 uppercase"
                    disabled={isValidatingCoupon}
                  />
                  <Button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isValidatingCoupon || !couponCode.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isValidatingCoupon ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t('bookingForm.applyCoupon')
                    )}
                  </Button>
                </div>
                {couponError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-3 w-3" />
                    <AlertDescription className="text-xs">{couponError}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <div>
                      <code className="font-mono font-bold text-green-700">{appliedCoupon.code}</code>
                      <p className="text-xs text-green-600">
                        {appliedCoupon.discount_type === 'percentage' 
                          ? t('bookingForm.percentDiscount').replace('{value}', appliedCoupon.discount_value)
                          : t('bookingForm.fixedDiscount').replace('{value}', formatPrice(appliedCoupon.discount_value))
                        }
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveCoupon}
                    className="text-green-700 hover:text-green-900"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="bg-blue-50 p-3 rounded-lg space-y-2">
            {appliedCoupon && (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{t('bookingForm.subtotal')}</span>
                  <span className="text-gray-700">{formatPrice(priceBeforeCoupon)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-green-600">
                  <span className="font-medium">{t('bookingForm.discount')}</span>
                  <span className="font-semibold">- {formatPrice(discountAmount)}</span>
                </div>
                <div className="border-t border-blue-200 pt-2"></div>
              </>
            )}
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold text-gray-900">{t('bookingForm.totalValue')}</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-blue-600">
                  {formatPrice(finalPrice)}
                </span>
                {selectedVehicle.calculation_details?.tolls_error && (
                  <p className="text-xs text-orange-600 mt-1 font-medium flex items-center justify-end gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {t('bookingForm.tollsNotIncluded')}
                  </p>
                )}
                {selectedVehicle.calculation_details?.tolls_included && (
                  <p className="text-xs text-green-600 mt-1 font-medium flex items-center justify-end gap-1">
                    <Check className="w-3 h-3" />
                    {t('bookingForm.tollsIncluded')}
                  </p>
                )}
              </div>
            </div>
            {selectedVehicle.calculation_details?.tolls_error && (
              <Alert className="mt-3 bg-orange-50 border-orange-200 py-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 text-xs leading-snug">
                  {t('bookingForm.tollsError')}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Button
            type="submit"
            disabled={isCreatingBooking}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white h-11 text-sm font-semibold shadow-md rounded-lg"
          >
            {isCreatingBooking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('bookingForm.processing')}
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                {t('bookingForm.proceedToPayment')}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}