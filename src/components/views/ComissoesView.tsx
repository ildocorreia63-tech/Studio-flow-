import React, { useState, useEffect } from 'react';
import { Award, CheckCircle, DollarSign, Filter } from 'lucide-react';
import { DB } from '../../services/db';
import { Business, Commission, Professional } from '../../types';

interface ComissoesViewProps {
  business: Business;
}

export const ComissoesView: React.FC<ComissoesViewProps> = ({ business }) => {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfId, setSelectedProfId] = useState<string>('all');

  const loadData = async () => {
    const comms = await DB.getCommissionsAsync(business.id);
    const profs = await DB.getProfessionalsAsync(business.id);
    setCommissions(comms);
    setProfessionals(profs);
  };

  useEffect(() => {
    loadData();
  }, [business.id]);

  const filteredCommissions = commissions.filter((c) => {
    return selectedProfId === 'all' || c.professional_id === selectedProfId;
  });

  const pendingTotal = filteredCommissions
    .filter((c) => c.status === 'PENDENTE')
    .reduce((sum, c) => sum + c.amount, 0);

  const paidTotal = filteredCommissions
    .filter((c) => c.status === 'PAGO')
    .reduce((sum, c) => sum + c.amount, 0);

  const handlePayCommission = async (id: string) => {
    await DB.payCommissionAsync(business.id, id);
    await loadData();
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900">Gestão de Comissões</h2>
          <p className="text-xs text-gray-500">Cálculo automático de repasses para a equipe</p>
        </div>

        <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={selectedProfId}
            onChange={(e) => setSelectedProfId(e.target.value)}
            className="bg-transparent text-xs font-bold text-gray-800 outline-none"
          >
            <option value="all">Todos os Profissionais</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-xs font-bold text-amber-700 uppercase">Comissões Pendentes</span>
          <p className="text-2xl font-black text-amber-600">R$ {pendingTotal.toFixed(2)}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-xs font-bold text-emerald-700 uppercase">Comissões Pagas</span>
          <p className="text-2xl font-black text-emerald-600">R$ {paidTotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-purple-900 text-white font-bold text-xs flex justify-between">
          <span>Relatório de Comissões por Atendimento</span>
          <span>Ação</span>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredCommissions.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs">Nenhuma comissão registrada.</div>
          ) : (
            filteredCommissions.map((comm) => (
              <div key={comm.id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-gray-900">{comm.professional_name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      comm.status === 'PAGO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {comm.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Serviço: {comm.service_name} (R$ {comm.service_price.toFixed(2)}) • Taxa: {comm.rate}% • Data: {comm.date}
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="font-black text-purple-950 text-sm">
                    R$ {comm.amount.toFixed(2)}
                  </span>

                  {comm.status === 'PENDENTE' && (
                    <button
                      onClick={() => handlePayCommission(comm.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                    >
                      Dar Baixa (Pagar)
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
