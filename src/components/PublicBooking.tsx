import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Scissors,
  User,
  Calendar,
  Clock,
  CheckCircle,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Building,
} from 'lucide-react';
import { DB, addMinutesToTime } from '../services/db';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { WhatsAppService } from '../utils/whatsapp';
import { PwaService } from '../services/pwaService';
import { Business, Service, Professional } from '../types';

interface PublicBookingProps {
  businessSlug?: string;
  onBackToApp?: () => void;
}

export const PublicBooking: React.FC<PublicBookingProps> = ({ businessSlug = 'studioflow-demo', onBackToApp }) => {
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);

  // Booking Flow Steps: 1 = Service, 2 = Professional, 3 = Date & Time, 4 = Contact Info, 5 = Confirmation
  const [step, setStep] = useState(1);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProf, setSelectedProf] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedTime, setSelectedTime] = useState<string>('');

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState('');

  useEffect(() => {
    const biz = DB.getBusinessBySlug(businessSlug) || DB.getBusinesses()[0];
    if (biz) {
      setBusiness(biz);
      setServices(DB.getServices(biz.id).filter((s) => s.active));
      setProfessionals(DB.getProfessionals(biz.id).filter((p) => p.status === 'active'));
      PwaService.updateDynamicAppManifest(biz);
    }
  }, [businessSlug]);

  // Recalculate available slots whenever Service, Professional, or Date changes
  useEffect(() => {
    if (business && selectedProf && selectedService && selectedDate) {
      const slots = DB.getAvailableSlots({
        business_id: business.id,
        professional_id: selectedProf.id,
        service_id: selectedService.id,
        date: selectedDate,
      });
      setAvailableSlots(slots);
      if (slots.length > 0 && !slots.includes(selectedTime)) {
        setSelectedTime(slots[0]);
      } else if (slots.length === 0) {
        setSelectedTime('');
      }
    }
  }, [business, selectedProf, selectedService, selectedDate]);

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700">
        <p>Carregando estabelecimento...</p>
      </div>
    );
  }

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!clientName || !clientWhatsapp) {
      setErrorMsg('Por favor, informe seu nome e WhatsApp para contato.');
      return;
    }

    if (!selectedService || !selectedProf || !selectedDate || !selectedTime) {
      setErrorMsg('Selecione todos os passos do agendamento.');
      return;
    }

    // Security check: Ensure selected professional & service belong strictly to the target business
    if (selectedProf.business_id && selectedProf.business_id !== business.id) {
      setErrorMsg('Profissional inválido para este estabelecimento.');
      return;
    }

    if (selectedService.business_id && selectedService.business_id !== business.id) {
      setErrorMsg('Serviço inválido para este estabelecimento.');
      return;
    }

    try {
      const endTime = addMinutesToTime(selectedTime, selectedService.duration_minutes);
      const commissionAmount = (selectedService.price * (selectedProf.commission_rate || 0)) / 100;

      // 1. Supabase Insertion (if Supabase backend is configured)
      if (isSupabaseConfigured) {
        const { error: insertErr } = await supabase.from('appointments').insert([
          {
            business_id: business.id,
            client_name: clientName,
            client_phone: clientWhatsapp,
            professional_id: selectedProf.id,
            professional_name: selectedProf.name,
            service_id: selectedService.id,
            service_name: selectedService.name,
            date: selectedDate,
            start_time: selectedTime,
            end_time: endTime,
            duration_minutes: selectedService.duration_minutes,
            price: selectedService.price, // Will be double checked by DB trigger for anon role
            status: 'SCHEDULED', // Forced public default status
            payment_status: 'PENDING', // Forced public default payment status
            notes: 'Agendamento Online via Link Público',
          },
        ]);

        if (insertErr) {
          throw new Error(insertErr.message || 'Erro ao salvar agendamento no servidor.');
        }
      }

      // 2. Save or find Client & Create Appointment in Local DB fallback
      const existingClients = DB.getClients(business.id);
      let client = existingClients.find((c) => c.whatsapp.replace(/\D/g, '') === clientWhatsapp.replace(/\D/g, ''));

      if (!client) {
        client = DB.saveClient({
          business_id: business.id,
          name: clientName,
          phone: clientWhatsapp,
          whatsapp: clientWhatsapp,
        });
      }

      DB.createAppointment({
        business_id: business.id,
        client_id: client.id,
        client_name: client.name,
        client_whatsapp: client.whatsapp,
        professional_id: selectedProf.id,
        professional_name: selectedProf.name,
        service_id: selectedService.id,
        service_name: selectedService.name,
        date: selectedDate,
        start_time: selectedTime,
        end_time: endTime,
        duration_minutes: selectedService.duration_minutes,
        price: selectedService.price,
        commission_amount: commissionAmount,
        status: 'AGENDADO',
        notes: 'Agendamento Online via Link do Estabelecimento',
      });

      // 3. Format WhatsApp Confirmation Message
      const [yyyy, mm, dd] = selectedDate.split('-');
      const dateFormatted = `${dd}/${mm}/${yyyy}`;
      const priceFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedService.price);

      const waUrl = WhatsAppService.sendBookingConfirmation({
        clientName: client.name,
        clientPhone: business.whatsapp || client.whatsapp,
        serviceName: selectedService.name,
        professionalName: selectedProf.name,
        dateFormatted,
        time: selectedTime,
        priceFormatted,
      });

      setWhatsappUrl(waUrl);
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Não foi possível agendar este horário. Escolha outro slot.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between py-6 px-4">
      {/* Top Header Banner */}
      <div className="max-w-xl mx-auto w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-purple-100 mb-6">
        <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 p-6 text-white text-center relative">
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="absolute left-4 top-4 text-purple-200 hover:text-white bg-purple-800/40 p-2 rounded-xl text-xs flex items-center gap-1 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Painel</span>
            </button>
          )}

          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-black border-2 border-purple-400/80 shadow-2xl mx-auto flex items-center justify-center mb-3.5 overflow-hidden p-1 relative group">
            <img
              src={business.logo_url || '/studioflow-logo.png'}
              alt={business.name}
              className="max-w-full max-h-full object-cover rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">{business.name}</h1>
          <p className="text-xs sm:text-sm text-purple-200 mt-1 font-medium">{business.address} — {business.city}/{business.state}</p>
          <div className="inline-block mt-3 px-3 py-1 rounded-full bg-purple-800/70 border border-purple-700/50 text-[11px] font-semibold text-purple-100">
            Agendamento Online 24h
          </div>
        </div>

        {/* Success Screen */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-5">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold shadow-inner">
              ✓
            </div>
            <h2 className="text-2xl font-black text-gray-900">Agendamento Realizado!</h2>
            <p className="text-sm text-gray-600">
              Seu horário foi agendado com sucesso na <strong>{business.name}</strong>.
            </p>

            <div className="bg-purple-50/80 p-4 rounded-2xl border border-purple-100 text-left text-sm space-y-1.5 text-gray-800">
              <p><strong>Serviço:</strong> {selectedService?.name}</p>
              <p><strong>Profissional:</strong> {selectedProf?.name}</p>
              <p><strong>Data & Hora:</strong> {selectedDate} às {selectedTime}</p>
              <p><strong>Valor:</strong> R$ {selectedService?.price.toFixed(2)}</p>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg flex items-center justify-center space-x-2 text-base transition"
            >
              <MessageSquare className="w-5 h-5" />
              <span>ABRIR WHATSAPP E CONFIRMAR</span>
            </a>

            <button
              onClick={() => {
                setIsSuccess(false);
                setStep(1);
                setSelectedService(null);
                setSelectedProf(null);
              }}
              className="text-xs font-semibold text-gray-500 hover:text-purple-700 underline"
            >
              Fazer novo agendamento
            </button>
          </div>
        ) : (
          <div className="p-6">
            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Stepper progress */}
            <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-6 pb-4 border-b border-gray-100">
              <span className={step >= 1 ? 'text-purple-800' : ''}>1. Serviço</span>
              <span className={step >= 2 ? 'text-purple-800' : ''}>2. Profissional</span>
              <span className={step >= 3 ? 'text-purple-800' : ''}>3. Data e Hora</span>
              <span className={step >= 4 ? 'text-purple-800' : ''}>4. Confirmar</span>
            </div>

            {/* STEP 1: Select Service */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-gray-900">Escolha o Serviço</h3>
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {services.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedService(s);
                        setStep(2);
                      }}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                        selectedService?.id === s.id
                          ? 'border-purple-600 bg-purple-50/80 shadow-md'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.description || 'Atendimento profissional completo'}</p>
                        <span className="inline-block mt-1 text-[11px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                          {s.duration_minutes} min
                        </span>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <span className="text-base font-black text-purple-950">
                          R$ {s.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: Select Professional */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900">Escolha o Profissional</h3>
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs font-semibold text-purple-700 hover:underline"
                  >
                    ← Voltar
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {professionals.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProf(p);
                        setStep(3);
                      }}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex items-center space-x-3 ${
                        selectedProf?.id === p.id
                          ? 'border-purple-600 bg-purple-50/80 shadow-md'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-purple-200 text-purple-800 font-extrabold flex items-center justify-center text-lg">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.specialty}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: Select Date & Time */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900">Data e Horário</h3>
                  <button
                    onClick={() => setStep(2)}
                    className="text-xs font-semibold text-purple-700 hover:underline"
                  >
                    ← Voltar
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Selecione a Data
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Horários Disponíveis
                  </label>
                  {availableSlots.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs text-center font-medium">
                      Não há horários disponíveis para este profissional nesta data. Escolha outro dia.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                      {availableSlots.map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setSelectedTime(time)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                            selectedTime === time
                              ? 'bg-purple-700 text-white border-purple-700 shadow-md'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-50 hover:border-purple-300'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  disabled={!selectedTime}
                  onClick={() => setStep(4)}
                  className="w-full mt-4 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold py-3 rounded-2xl shadow-md text-sm transition"
                >
                  Continuar →
                </button>
              </div>
            )}

            {/* STEP 4: Confirm Contact Details */}
            {step === 4 && (
              <form onSubmit={handleConfirmBooking} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900">Seus Dados de Contato</h3>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="text-xs font-semibold text-purple-700 hover:underline"
                  >
                    ← Voltar
                  </button>
                </div>

                <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-100 text-xs space-y-1 text-purple-950">
                  <p><strong>Resumo:</strong> {selectedService?.name} com {selectedProf?.name}</p>
                  <p><strong>Data/Hora:</strong> {selectedDate} às {selectedTime}</p>
                  <p><strong>Valor:</strong> R$ {selectedService?.price.toFixed(2)}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Seu Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João Silva"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Seu WhatsApp com DDD *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 11999998888"
                    value={clientWhatsapp}
                    onChange={(e) => setClientWhatsapp(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl shadow-lg text-sm flex items-center justify-center space-x-2 transition"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>CONFIRMAR AGENDAMENTO</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <footer className="text-center text-xs text-gray-400">
        Desenvolvido por <strong>StudioFlow SaaS</strong>
      </footer>
    </div>
  );
};
