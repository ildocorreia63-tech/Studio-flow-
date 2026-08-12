import React, { useState, useEffect } from 'react';
import { UserCheck, PlusCircle, Edit, Trash2, X, Phone, Mail, Award } from 'lucide-react';
import { DB } from '../../services/db';
import { Professional, Business } from '../../types';

interface ProfissionaisViewProps {
  business: Business;
}

export const ProfissionaisView: React.FC<ProfissionaisViewProps> = ({ business }) => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProf, setEditingProf] = useState<Partial<Professional>>({});

  const loadProfessionals = async () => {
    const list = await DB.getProfessionalsAsync(business.id);
    setProfessionals(list);
  };

  useEffect(() => {
    loadProfessionals();
  }, [business.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProf.name) return;

    try {
      await DB.saveProfessionalAsync({
        id: editingProf.id,
        business_id: business.id,
        name: editingProf.name,
        phone: editingProf.phone || '',
        whatsapp: editingProf.whatsapp || editingProf.phone || '',
        email: editingProf.email || '',
        specialty: editingProf.specialty || 'Geral',
        commission_rate: editingProf.commission_rate ?? 40,
        status: editingProf.status || 'active',
      });

      setIsModalOpen(false);
      setEditingProf({});
      await loadProfessionals();
    } catch (err: any) {
      alert('Erro ao salvar profissional: ' + (err.message || err));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir/desativar este profissional?')) {
      await DB.deleteProfessionalAsync(business.id, id);
      await loadProfessionals();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900">Equipe de Profissionais</h2>
          <p className="text-xs text-gray-500">Gerencie barbeiros, cabeleireiros, manicures e comissões</p>
        </div>

        <button
          onClick={() => {
            setEditingProf({ commission_rate: 40, status: 'active' });
            setIsModalOpen(true);
          }}
          className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-md flex items-center space-x-2 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ NOVO PROFISSIONAL</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {professionals.map((p) => (
          <div key={p.id} className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-900 font-extrabold flex items-center justify-center text-lg border border-purple-200">
                  {p.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{p.name}</h3>
                  <p className="text-xs text-purple-700 font-medium">{p.specialty}</p>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${p.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                {p.status === 'active' ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <div className="bg-purple-50 p-3 rounded-2xl border border-purple-100 text-xs flex justify-between items-center text-purple-950 font-semibold">
              <span>Taxa de Comissão:</span>
              <span className="text-sm font-black text-purple-900">{p.commission_rate}%</span>
            </div>

            <p className="text-xs text-gray-500">📞 {p.phone || 'Sem fone'} • ✉️ {p.email || 'Sem e-mail'}</p>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => {
                  setEditingProf(p);
                  setIsModalOpen(true);
                }}
                className="p-2 text-gray-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(p.id)}
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-lg text-gray-900">
                {editingProf.id ? 'Editar Profissional' : 'Novo Profissional'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Nome *</label>
                <input
                  type="text"
                  required
                  value={editingProf.name || ''}
                  onChange={(e) => setEditingProf({ ...editingProf, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">Especialidade</label>
                <input
                  type="text"
                  placeholder="Ex: Barbeiro Visagista"
                  value={editingProf.specialty || ''}
                  onChange={(e) => setEditingProf({ ...editingProf, specialty: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={editingProf.phone || ''}
                  onChange={(e) => setEditingProf({ ...editingProf, phone: e.target.value, whatsapp: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">Comissão (%) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={100}
                  value={editingProf.commission_rate ?? 40}
                  onChange={(e) => setEditingProf({ ...editingProf, commission_rate: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
