import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Scissors, AlertCircle, MessageSquare } from 'lucide-react';
import { DB, addMinutesToTime } from '../../services/db';
import { WhatsAppService } from '../../utils/whatsapp';
import { Client, Professional, Service } from '../../types';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  onSuccess: () => void;
  defaultDate?: string;
  defaultTime?: string;
  defaultProfessionalId?: string;
}

export const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({
  isOpen,
  onClose,
  businessId,
  onSuccess,
  defaultDate,
  defaultTime,
  defaultProfessionalId,
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);

  const [selectedProfId, setSelectedProfId] = useState(defaultProfessionalId || '');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [date, setDate] = useState(defaultDate || new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(defaultTime || '14:00');
  const [notes, setNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successLink, setSuccessLink] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessLink('');

      const fetchInitialData = async () => {
        const loadedClients = await DB.getClientsAsync(businessId);
        const loadedProfs = (await DB.getProfessionalsAsync(businessId)).filter((p) => p.status === 'active');
        const loadedServices = (await DB.getServicesAsync(businessId)).filter((s) => s.active);

        setClients(loadedClients);
        setProfessionals(loadedProfs);
        setServices(loadedServices);

        if (loadedProfs.length > 0 && !selectedProfId) {
          setSelectedProfId(loadedProfs[0].id);
        }
        if (loadedServices.length > 0 && !selectedServiceId) {
          setSelectedServiceId(loadedServices[0].id);
        }
        if (loadedClients.length > 0 && !selectedClientId) {
          setSelectedClientId(loadedClients[0].id);
        }
      };

      fetchInitialData();
    }
  }, [isOpen, businessId]);

  if (!isOpen) return null;

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const selectedProf = professionals.find((p) => p.id === selectedProfId);
  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const duration = selectedService ? selectedService.duration_minutes : 30;
  const price = selectedService ? selectedService.price : 0;
  const endTime = addMinutesToTime(startTime, duration);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      let finalClientId = selectedClientId;
      let finalClientName = selectedClient ? selectedClient.name : '';
      let finalClientWhatsapp = selectedClient ? selectedClient.whatsapp : '';

      if (isNewClient) {
        if (!newClientName || !newClientPhone) {
          setErrorMsg('Por favor, informe o nome e WhatsApp do novo cliente.');
          return;
        }
        const createdClient = await DB.saveClientAsync({
          business_id: businessId,
          name: newClientName,
          phone: newClientPhone,
          whatsapp: newClientPhone,
        });
        finalClientId = createdClient.id;
        finalClientName = createdClient.name;
        finalClientWhatsapp = createdClient.whatsapp;
      }

      if (!finalClientId) {
        setErrorMsg('Por favor, selecione ou cadastre um cliente.');
        return;
      }

      if (!selectedProfId || !selectedServiceId) {
        setErrorMsg('Por favor, selecione o profissional e o serviço.');
        return;
      }

      const commissionRate = selectedProf ? selectedProf.commission_rate : 40;
      const commissionAmount = (price * commissionRate) / 100;

      // Create appointment (handles schedule conflict validation inside DB engine)
      const createdApt = await DB.createAppointmentAsync({
        business_id: businessId,
        client_id: finalClientId,
        client_name: finalClientName,
        client_whatsapp: finalClientWhatsapp,
        professional_id: selectedProfId,
        professional_name: selectedProf ? selectedProf.name : 'Profissional',
        service_id: selectedServiceId,
        service_name: selectedService ? selectedService.name : 'Serviço',
        date,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: duration,
        price,
        commission_amount: commissionAmount,
        status: 'AGENDADO',
        notes,
      });

      // Format Date for WhatsApp (DD/MM/YYYY)
      const [yyyy, mm, dd] = date.split('-');
      const dateFormatted = `${dd}/${mm}/${yyyy}`;
      const priceFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

      const waUrl = WhatsAppService.sendBookingConfirmation({
        clientName: finalClientName,
        clientPhone: finalClientWhatsapp,
        serviceName: selectedService ? selectedService.name : 'Serviço',
        professionalName: selectedProf ? selectedProf.name : 'Profissional',
        dateFormatted,
        time: startTime,
        priceFormatted,
      });

      setSuccessLink(waUrl);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar agendamento.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-purple-100 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-700/50 rounded-xl">
              <Calendar className="w-6 h-6 text-purple-200" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Novo Agendamento</h2>
              <p className="text-xs text-purple-200">Agende um serviço sem conflitos de horário</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-purple-200 hover:text-white hover:bg-purple-800/50 p-1.5 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {successLink ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Agendamento Criado!</h3>
              <p className="text-sm text-gray-600">
                O horário foi reservado com sucesso no sistema. Você pode enviar a confirmação agora mesmo pelo WhatsApp!
              </p>

              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-left text-sm space-y-1 text-gray-700">
                <p><strong>Cliente:</strong> {selectedClient?.name || newClientName}</p>
                <p><strong>Serviço:</strong> {selectedService?.name}</p>
                <p><strong>Profissional:</strong> {selectedProf?.name}</p>
                <p><strong>Data/Hora:</strong> {date} às {startTime} ({duration} min)</p>
                <p><strong>Valor:</strong> R$ {price.toFixed(2)}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a
                  href={successLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition"
                >
                  <MessageSquare className="w-5 h-5" />
                  ENVIAR PELO WHATSAPP
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition"
                >
                  Concluir
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3.5 rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Client selection toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Cliente
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsNewClient(!isNewClient)}
                    className="text-xs text-purple-700 font-semibold hover:underline"
                  >
                    {isNewClient ? '← Selecionar existente' : '+ Cadastrar novo cliente'}
                  </button>
                </div>

                {isNewClient ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-50/60 p-3 rounded-xl border border-purple-100">
                    <div>
                      <input
                        type="text"
                        placeholder="Nome completo *"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="WhatsApp (ex: 11999998888) *"
                        value={newClientPhone}
                        onChange={(e) => setNewClientPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id} className="text-gray-900">
                        {c.name} — {c.phone}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Professional */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Profissional
                </label>
                <select
                  value={selectedProfId}
                  onChange={(e) => setSelectedProfId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none"
                >
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id} className="text-gray-900">
                      {p.name} ({p.specialty})
                    </option>
                  ))}
                </select>
              </div>

              {/* Service */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Serviço
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id} className="text-gray-900">
                      {s.name} — R$ {s.price.toFixed(2)} ({s.duration_minutes} min)
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Data
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Horário Inicial
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none"
                  />
                </div>
              </div>

              {/* Calculated Price & Time summary */}
              <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-100 flex items-center justify-between text-xs text-purple-900 font-medium">
                <div>
                  <span>Duração: </span>
                  <strong className="text-purple-950 font-bold">{startTime} até {endTime}</strong> ({duration} min)
                </div>
                <div className="text-right">
                  <span>Valor: </span>
                  <strong className="text-purple-950 text-sm font-bold">R$ {price.toFixed(2)}</strong>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Observações
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Cliente prefere degradê alto na tesoura..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-sm shadow-md transition"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
