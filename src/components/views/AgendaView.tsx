import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  PlusCircle,
  MessageSquare,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { DB } from '../../services/db';
import { WhatsAppService } from '../../utils/whatsapp';
import { Appointment, Business, Professional, AppointmentStatus } from '../../types';

interface AgendaViewProps {
  business: Business;
  onOpenNewAppointment: () => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({ business, onOpenNewAppointment }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [selectedProfId, setSelectedProfId] = useState<string>('all');

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const loadData = async () => {
    const profs = await DB.getProfessionalsAsync(business.id);
    setProfessionals(profs.filter((p) => p.status === 'active'));
    const apts = await DB.getAppointmentsAsync(business.id);
    setAppointments(apts);
  };

  useEffect(() => {
    loadData();
  }, [business.id]);

  const filteredAppointments = appointments.filter((apt) => {
    const matchesDate = apt.date === selectedDate;
    const matchesProf = selectedProfId === 'all' || apt.professional_id === selectedProfId;
    return matchesDate && matchesProf;
  });

  const handleDateShift = (days: number) => {
    const current = new Date(selectedDate + 'T12:00:00');
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().slice(0, 10));
  };

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00',
  ];

  const handleUpdateStatus = async (aptId: string, status: AppointmentStatus) => {
    await DB.updateAppointmentStatusAsync(business.id, aptId, status);
    await loadData();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Agenda Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Date Selector */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleDateShift(-1)}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition text-gray-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-purple-700" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="font-bold text-gray-900 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          <button
            onClick={() => handleDateShift(1)}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition text-gray-700"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
            className="px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition"
          >
            Hoje
          </button>
        </div>

        {/* Professional Filter & Actions */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
            <Filter className="w-4 h-4 text-gray-500 ml-1" />
            <select
              value={selectedProfId}
              onChange={(e) => setSelectedProfId(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-800 outline-none pr-2"
            >
              <option value="all">Todos os Profissionais</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onOpenNewAppointment}
            className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md flex items-center space-x-1.5 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Agendar</span>
          </button>
        </div>
      </div>

      {/* Grid Schedule */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-purple-900 text-white flex items-center justify-between text-xs font-bold">
          <span>Horário</span>
          <span>Atendimentos Agendados para {selectedDate}</span>
          <span className="text-purple-200">Total: {filteredAppointments.length}</span>
        </div>

        <div className="divide-y divide-gray-100">
          {timeSlots.map((time) => {
            const aptsForSlot = filteredAppointments.filter((a) => {
              return a.start_time <= time && a.end_time > time;
            });

            return (
              <div key={time} className="flex min-h-[60px] hover:bg-purple-50/20 transition">
                <div className="w-20 p-3 text-xs font-bold text-gray-500 border-r border-gray-100 shrink-0 bg-gray-50/50 flex items-center justify-center">
                  {time}
                </div>

                <div className="flex-1 p-2 flex flex-wrap gap-2 items-center">
                  {aptsForSlot.length === 0 ? (
                    <span className="text-[11px] text-gray-300 italic pl-2">Livre</span>
                  ) : (
                    aptsForSlot.map((apt) => (
                      <div
                        key={apt.id}
                        className={`p-3 rounded-2xl border text-xs shadow-2xs flex-1 min-w-[240px] flex items-center justify-between gap-3 ${
                          apt.status === 'CONCLUÍDO'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                            : apt.status === 'EM_ATENDIMENTO'
                            ? 'bg-purple-50 border-purple-200 text-purple-950'
                            : apt.status === 'CANCELADO'
                            ? 'bg-rose-50 border-rose-200 text-rose-950 opacity-60'
                            : 'bg-white border-purple-100 text-gray-900'
                        }`}
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold">{apt.client_name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-white/80 border border-gray-200">
                              {apt.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-600 mt-0.5">
                            ✂️ {apt.service_name} — 👤 {apt.professional_name}
                          </p>
                          <p className="text-[10px] font-bold text-purple-900">
                            {apt.start_time} - {apt.end_time} • R$ {apt.price.toFixed(2)}
                          </p>
                        </div>

                        {/* Status Controls */}
                        <div className="flex items-center space-x-1 shrink-0">
                          {apt.status !== 'CONCLUÍDO' && apt.status !== 'CANCELADO' && (
                            <button
                              onClick={() => handleUpdateStatus(apt.id, 'CONCLUÍDO')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                            >
                              Concluir
                            </button>
                          )}
                          <a
                            href={WhatsAppService.sendBookingReminder({
                              clientName: apt.client_name,
                              clientPhone: apt.client_whatsapp,
                              serviceName: apt.service_name,
                              professionalName: apt.professional_name,
                              time: apt.start_time,
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 transition"
                            title="Lembrete WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
