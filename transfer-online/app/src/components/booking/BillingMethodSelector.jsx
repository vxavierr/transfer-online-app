import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  FileText,
  Receipt,
  User,
  Mail,
  CheckCircle,
  AlertCircle,
  UserPlus,
  X,
  Search
} from 'lucide-react';

export default function BillingMethodSelector({
  billingData,
  onChange,
  currentUser,
  availableFinancialResponsibles = [],
  isMasterUser,
  clientRequiresPurchaseOrder = false
}) {
  const [showResponsibleSelector, setShowResponsibleSelector] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Safety reset: if purchase_order was selected but option is no longer available, reset to invoiced
  React.useEffect(() => {
    if (billingData.billing_method === 'purchase_order' && !clientRequiresPurchaseOrder) {
      handleMethodChange('invoiced');
    }
  }, [clientRequiresPurchaseOrder]);

  const handleMethodChange = (method) => {
    let newBillingData = {
      ...billingData,
      billing_method: method,
      purchase_order_number: ''
    };

    if (method === 'invoiced') {
      if (isMasterUser) {
        newBillingData = {
          ...newBillingData,
          billing_responsible_user_id: null,
          billing_responsible_email: '',
          billing_responsible_name: ''
        };
        setShowResponsibleSelector(true);
      } else {
        newBillingData = {
          ...newBillingData,
          billing_responsible_user_id: currentUser.id,
          billing_responsible_email: currentUser.email,
          billing_responsible_name: currentUser.full_name
        };
      }
    } else if (method === 'credit_card') {
      newBillingData = {
        ...newBillingData,
        billing_responsible_user_id: null,
        billing_responsible_email: currentUser.email,
        billing_responsible_name: '',
        credit_card_payment_link_recipient: 'myself'
      };
    } else {
      newBillingData = {
        ...newBillingData,
        billing_responsible_user_id: null,
        billing_responsible_email: '',
        billing_responsible_name: '',
        credit_card_payment_link_recipient: null
      };
    }
    
    onChange(newBillingData);
    if (method !== 'invoiced' || !isMasterUser) {
      setShowResponsibleSelector(false);
    }
  };

  const handleSelectResponsible = (user) => {
    onChange({
      ...billingData,
      billing_responsible_user_id: user.is_system_user !== false ? user.id : null,
      billing_responsible_email: user.email,
      billing_responsible_name: user.full_name
    });
    setShowResponsibleSelector(false);
    setSearchTerm('');
  };

  const handleSetResponsibleAsOther = () => {
    onChange({
      ...billingData,
      billing_responsible_user_id: null,
      billing_responsible_email: '',
      billing_responsible_name: ''
    });
    if (availableFinancialResponsibles.length > 0) {
      setShowResponsibleSelector(true);
    }
  };

  const filteredResponsibles = availableFinancialResponsibles.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

  const isResponsibleOther = isMasterUser || (billingData.billing_method === 'invoiced' && 
                               billingData.billing_responsible_user_id !== currentUser.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Receipt className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Forma de Faturamento *</h3>
      </div>

      <Alert className="bg-blue-50 border-blue-300">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900 text-sm">
          <strong>💡 Importante:</strong> Selecione como será realizado o pagamento desta viagem.
        </AlertDescription>
      </Alert>

      <div className="grid gap-3">
        <Card
          className={`cursor-pointer transition-all border-2 ${
            billingData.billing_method === 'invoiced'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
          }`}
          onClick={() => handleMethodChange('invoiced')}
        >
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  billingData.billing_method === 'invoiced' ? 'bg-blue-600' : 'bg-gray-200'
                }`}>
                  <FileText className={`w-5 h-5 ${
                    billingData.billing_method === 'invoiced' ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Faturado</h4>
                  <p className="text-sm text-gray-600">Será incluído na fatura do responsável financeiro</p>
                </div>
              </div>
              {billingData.billing_method === 'invoiced' && (
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              )}
            </div>

            {billingData.billing_method === 'invoiced' && (
              <div className="mt-4 pt-4 border-t border-blue-200 space-y-4">
                <Label className="text-sm font-semibold text-gray-900 block mb-2">Quem é o responsável financeiro?</Label>
                
                <div className="space-y-3">
                  {!isMasterUser && (
                    <div 
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        billingData.billing_responsible_user_id === currentUser.id 
                          ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400 shadow-sm' 
                          : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange({
                          ...billingData,
                          billing_responsible_user_id: currentUser.id,
                          billing_responsible_email: currentUser.email,
                          billing_responsible_name: currentUser.full_name
                        });
                      }}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        billingData.billing_responsible_user_id === currentUser.id ? 'border-blue-600' : 'border-gray-400'
                      }`}>
                        {billingData.billing_responsible_user_id === currentUser.id && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                      </div>
                      <div>
                        <span className="font-medium text-sm text-gray-900 block">Eu mesmo</span>
                        <span className="text-xs text-gray-500 block">{currentUser.full_name} (Responsável Padrão)</span>
                      </div>
                    </div>
                  )}
                  
                  <div 
                    className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-all ${
                      isMasterUser || isResponsibleOther
                        ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400 shadow-sm' 
                        : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                    }`}
                    onClick={(e) => {
                      // Evita re-disparar se clicar em elementos internos interativos
                      if (['INPUT', 'BUTTON', 'SVG', 'PATH'].includes(e.target.tagName)) return;
                      
                      e.stopPropagation();
                      if (!(isMasterUser || isResponsibleOther)) {
                        handleSetResponsibleAsOther();
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isMasterUser || isResponsibleOther ? 'border-blue-600' : 'border-gray-400'
                      }`}>
                        {(isMasterUser || isResponsibleOther) && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                      </div>
                      <span className="font-medium text-sm text-gray-900">Outra pessoa</span>
                    </div>

                    {/* Conteúdo expandido de "Outra pessoa" */}
                    {(isMasterUser || isResponsibleOther) && (
                      <div className="pl-8 w-full mt-1" onClick={(e) => e.stopPropagation()}>
                        {/* Mostrar responsável selecionado (Usuário do Sistema ou Manual) */}
                        {((billingData.billing_responsible_user_id && billingData.billing_responsible_user_id !== currentUser.id) || 
                          (!billingData.billing_responsible_user_id && billingData.billing_responsible_name && !showResponsibleSelector)) && (
                          <div className="bg-white rounded-lg p-3 border border-blue-200 mb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-600" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {billingData.billing_responsible_name}
                                    {!billingData.billing_responsible_user_id && <span className="text-[10px] text-blue-600 ml-2 bg-blue-50 px-1 rounded">(Externo)</span>}
                                  </p>
                                  <p className="text-xs text-gray-500">{billingData.billing_responsible_email}</p>
                                </div>
                              </div>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowResponsibleSelector(true);
                                  // Se tiver dados mas sem ID, é manual, então reabre como manual
                                  if (!billingData.billing_responsible_user_id) {
                                    setIsManualEntry(true);
                                  } else {
                                    setIsManualEntry(false);
                                  }
                                }}
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                Alterar
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Seletor ou Manual */}
                        {(showResponsibleSelector || (!billingData.billing_responsible_user_id && !billingData.billing_responsible_name)) && (
                          <div className="mt-2">
                            {isManualEntry ? (
                              <div className="bg-gray-50 border-2 border-blue-300 rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-center mb-2">
                                  <h5 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                                    <UserPlus className="w-4 h-4 text-blue-600" />
                                    Novo Responsável
                                  </h5>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsManualEntry(false);
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                                
                                <Alert className="bg-blue-50 border-blue-200 mb-3">
                                  <AlertCircle className="h-4 w-4 text-blue-600" />
                                  <AlertDescription className="text-blue-800 text-xs">
                                     Informe os dados abaixo para registrar um responsável não listado.
                                  </AlertDescription>
                                </Alert>

                                <div className="space-y-2">
                                  <Label className="text-xs">Nome do Responsável *</Label>
                                  <Input
                                    placeholder="Nome completo"
                                    value={billingData.billing_responsible_name || ''}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      onChange({
                                        ...billingData,
                                        billing_responsible_name: e.target.value,
                                        billing_responsible_user_id: null // Garantir que é manual
                                      });
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs">Email do Responsável *</Label>
                                  <Input
                                    type="email"
                                    placeholder="email@exemplo.com"
                                    value={billingData.billing_responsible_email || ''}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      onChange({
                                        ...billingData,
                                        billing_responsible_email: e.target.value
                                      });
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                                
                                <Button
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2"
                                  size="sm"
                                  onClick={(e) => {
                                     e.stopPropagation();
                                     setShowResponsibleSelector(false);
                                     // Mantém os dados manuais preenchidos
                                  }}
                                >
                                  Confirmar
                                </Button>
                              </div>
                            ) : (
                              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-3">
                                <div className="relative">
                                   <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                   <Input
                                      placeholder="Buscar responsável por nome ou email..."
                                      value={searchTerm}
                                      onChange={(e) => setSearchTerm(e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full pl-9"
                                   />
                                </div>

                                <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg bg-white p-2">
                                  {filteredResponsibles.length === 0 ? (
                                     <div className="text-center py-4 text-gray-500 text-sm">
                                        Nenhuma pessoa encontrada
                                     </div>
                                  ) : (
                                     filteredResponsibles.map((user) => (
                                        <button
                                          key={user.id || user.email} // Fallback key se não tiver id
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectResponsible(user);
                                          }}
                                          className="w-full text-left p-3 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all group"
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100">
                                               <User className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
                                            </div>
                                            <div>
                                              <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                                              <p className="text-xs text-gray-500">{user.email}</p>
                                            </div>
                                          </div>
                                        </button>
                                     ))
                                  )}
                                </div>

                                <div className="relative flex py-2 items-center">
                                   <div className="flex-grow border-t border-gray-300"></div>
                                   <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">OU</span>
                                   <div className="flex-grow border-t border-gray-300"></div>
                                </div>

                                <Button
                                   variant="outline"
                                   className="w-full border-dashed border-blue-300 text-blue-700 hover:bg-blue-50"
                                   onClick={(e) => {
                                      e.stopPropagation();
                                      setIsManualEntry(true);
                                      if (billingData.billing_responsible_user_id) {
                                         onChange({
                                            ...billingData,
                                            billing_responsible_user_id: null,
                                            billing_responsible_name: '',
                                            billing_responsible_email: ''
                                         });
                                      }
                                   }}
                                >
                                   <UserPlus className="w-4 h-4 mr-2" />
                                   Cadastrar Novo Responsável
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card
          className={`cursor-pointer transition-all border-2 ${
            billingData.billing_method === 'credit_card'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
          }`}
          onClick={() => handleMethodChange('credit_card')}
        >
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  billingData.billing_method === 'credit_card' ? 'bg-green-600' : 'bg-gray-200'
                }`}>
                  <CreditCard className={`w-5 h-5 ${
                    billingData.billing_method === 'credit_card' ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Cartão de Crédito</h4>
                  <p className="text-sm text-gray-600">Link de pagamento será enviado por email</p>
                </div>
              </div>
              {billingData.billing_method === 'credit_card' && (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              )}
            </div>

            {billingData.billing_method === 'credit_card' && (
              <div className="mt-4 pt-4 border-t border-green-200 space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">O link de pagamento será enviado para:</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="link-myself"
                        name="payment-link-recipient"
                        checked={billingData.credit_card_payment_link_recipient === 'myself'}
                        onChange={() => onChange({
                          ...billingData,
                          credit_card_payment_link_recipient: 'myself',
                          billing_responsible_email: currentUser.email
                        })}
                        className="w-4 h-4 text-green-600"
                      />
                      <Label htmlFor="link-myself" className="cursor-pointer text-sm font-medium">
                        Para mim ({currentUser.email})
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="link-other"
                        name="payment-link-recipient"
                        checked={billingData.credit_card_payment_link_recipient === 'other'}
                        onChange={() => onChange({
                          ...billingData,
                          credit_card_payment_link_recipient: 'other',
                          billing_responsible_email: ''
                        })}
                        className="w-4 h-4 text-green-600"
                      />
                      <Label htmlFor="link-other" className="cursor-pointer text-sm font-medium">
                        Para outra pessoa
                      </Label>
                    </div>
                  </div>
                </div>

                {billingData.credit_card_payment_link_recipient === 'other' && (
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4 text-green-600" />
                      Email do destinatário *
                    </Label>
                    <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={billingData.billing_responsible_email || ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        onChange({
                          ...billingData,
                          billing_responsible_email: e.target.value
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {clientRequiresPurchaseOrder && (
          <Card
            className={`cursor-pointer transition-all border-2 ${
              billingData.billing_method === 'purchase_order'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
            }`}
            onClick={() => handleMethodChange('purchase_order')}
          >
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    billingData.billing_method === 'purchase_order' ? 'bg-purple-600' : 'bg-gray-200'
                  }`}>
                    <Receipt className={`w-5 h-5 ${
                      billingData.billing_method === 'purchase_order' ? 'text-white' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">Ordem de Compra</h4>
                    <p className="text-sm text-gray-600">Já possui um número de pedido/OC</p>
                  </div>
                </div>
                {billingData.billing_method === 'purchase_order' && (
                  <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0" />
                )}
              </div>

              {billingData.billing_method === 'purchase_order' && (
                <div className="mt-4 pt-4 border-t border-purple-200 space-y-2">
                  <Label className="text-sm font-semibold">
                    Número da Ordem de Compra / Pedido *
                  </Label>
                  <Input
                    placeholder="Ex: OC-2025-001234"
                    value={billingData.purchase_order_number || ''}
                    onChange={(e) => {
                      e.stopPropagation();
                      onChange({
                        ...billingData,
                        purchase_order_number: e.target.value
                      });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full font-mono"
                  />
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}