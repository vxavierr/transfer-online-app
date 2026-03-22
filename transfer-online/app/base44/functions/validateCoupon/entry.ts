import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json(
        { valid: false, error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { couponCode, totalAmount, serviceType, vehicleTypeId } = body;

    if (!couponCode || !totalAmount) {
      return Response.json(
        { valid: false, error: 'Código do cupom e valor total são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar o cupom pelo código (case insensitive)
    const coupons = await base44.asServiceRole.entities.Coupon.list();
    const coupon = coupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase());

    if (!coupon) {
      return Response.json({
        valid: false,
        error: 'Cupom inválido'
      });
    }

    // Validar se o cupom está ativo
    if (!coupon.active) {
      return Response.json({
        valid: false,
        error: 'Este cupom não está mais ativo'
      });
    }

    // Validar validade temporal
    const now = new Date();
    
    if (coupon.valid_from) {
      const validFrom = new Date(coupon.valid_from);
      if (now < validFrom) {
        return Response.json({
          valid: false,
          error: 'Este cupom ainda não está válido'
        });
      }
    }

    if (coupon.valid_until) {
      const validUntil = new Date(coupon.valid_until);
      if (now > validUntil) {
        return Response.json({
          valid: false,
          error: 'Este cupom já expirou'
        });
      }
    }

    // Validar valor mínimo de compra
    if (coupon.min_purchase_amount && totalAmount < coupon.min_purchase_amount) {
      return Response.json({
        valid: false,
        error: `Este cupom requer um valor mínimo de ${new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(coupon.min_purchase_amount)}`
      });
    }

    // Validar uso máximo total
    if (coupon.max_usage !== null && coupon.max_usage !== undefined) {
      const currentUsage = coupon.current_usage_count || 0;
      if (currentUsage >= coupon.max_usage) {
        return Response.json({
          valid: false,
          error: 'Este cupom atingiu o limite máximo de uso'
        });
      }
    }

    // Validar uso máximo por usuário
    if (coupon.max_usage_per_user !== null && coupon.max_usage_per_user !== undefined) {
      const userBookings = await base44.asServiceRole.entities.Booking.list();
      const userBookingsWithCoupon = userBookings.filter(
        b => b.created_by === user.email && b.coupon_id === coupon.id
      );
      
      if (userBookingsWithCoupon.length >= coupon.max_usage_per_user) {
        return Response.json({
          valid: false,
          error: 'Você já utilizou este cupom o número máximo de vezes permitido'
        });
      }
    }

    // Validar aplicabilidade
    if (coupon.applies_to && coupon.applies_to !== 'all') {
      // Se for para veículo específico, validar apenas os veículos, não o tipo de serviço
      if (coupon.applies_to === 'specific_vehicle') {
        // Validação de veículo específico será feita no próximo bloco
        if (!coupon.target_vehicle_ids || coupon.target_vehicle_ids.length === 0) {
          return Response.json({
            valid: false,
            error: 'Configuração do cupom inválida - nenhum veículo específico definido'
          });
        }
      } else if (coupon.applies_to !== serviceType) {
        // Validar tipo de serviço apenas se não for 'specific_vehicle'
        const serviceNames = {
          one_way: 'Só Ida',
          round_trip: 'Ida e Volta',
          hourly: 'Por Hora'
        };
        return Response.json({
          valid: false,
          error: `Este cupom é válido apenas para serviço ${serviceNames[coupon.applies_to] || coupon.applies_to}`
        });
      }
    }

    // Validar veículo específico
    if (coupon.applies_to === 'specific_vehicle' && coupon.target_vehicle_ids && coupon.target_vehicle_ids.length > 0) {
      if (!vehicleTypeId || !coupon.target_vehicle_ids.includes(vehicleTypeId)) {
        return Response.json({
          valid: false,
          error: 'Este cupom não é válido para o veículo selecionado'
        });
      }
    }

    // Calcular desconto
    let discountAmount = 0;
    
    if (coupon.discount_type === 'percentage') {
      discountAmount = (totalAmount * coupon.discount_value) / 100;
    } else if (coupon.discount_type === 'fixed_amount') {
      discountAmount = coupon.discount_value;
    }

    // Garantir que o desconto não seja maior que o total
    discountAmount = Math.min(discountAmount, totalAmount);
    
    const newTotal = totalAmount - discountAmount;

    return Response.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        description: coupon.description
      },
      discount_amount: discountAmount,
      new_total: newTotal,
      original_total: totalAmount
    });

  } catch (error) {
    console.error('Erro ao validar cupom:', error);
    return Response.json(
      { valid: false, error: error.message || 'Erro ao validar cupom' },
      { status: 500 }
    );
  }
});