import React, { useState, useEffect } from 'react';
import { Scissors, PlusCircle, Edit, Trash2, X, Clock, DollarSign } from 'lucide-react';
import { DB } from '../../services/db';
import { Service, ServiceCategory, Business } from '../../types';

interface ServicosViewProps {
  business: Business;
}

export const ServicosView: React.FC<ServicosViewProps> = ({ business }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('Todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service>>({});

  const categories: ServiceCategory[] = [
    'Barbearia',
    'Cabelo',
    'Manicure',
    'Pedicure',
    'Sobrancelha',
    'Estética',
    'Outros',
  ];

  const loadServices = async () => {
    const list = await DB.getServicesAsync(business.id);
    setServices(list);
  };

  useEffect(() => {
    loadServices();
  }, [business.id]);

  const filteredServices = services.filter((s) => {
    if (activeCategory === 'Todas') return true;
    return s.category === activeCategory;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService.name || !editingService.price) return;

    await DB.saveServiceAsync({
      id: editingService.id,
      business_id: business.id,
      category: editingService.category || 'Barbearia',
      name: editingService.name,
      description: editingService.description || '',
      price: Number(editingService.price),
      duration_minutes: Number(editingService.duration_minutes || 30),
      commission_rate: Number(editingService.commission_rate || 40),
      active: editingService.active ?? true,
    });

    setIsModalOpen(false);
    setEditingService({});
    await loadServices();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir/desativar este serviço?')) {
      await DB.deleteServiceAsync(business.id, id);
      await loadServices();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900">Catálogo de Serviços</h2>
          <p className="text-xs text-gray-500">Cadastre preços, durações e comissões dos serviços</p>
        </div>

        <button
          onClick={() => {
            setEditingService({ category: 'Barbearia', duration_minutes: 30, commission_rate: 40, active: true });
            setIsModalOpen(true);
          }}
          className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-md flex items-center space-x-2 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ NOVO SERVIÇO</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveCategory('Todas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeCategory === 'Todas' ? 'bg-purple-900 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-purple-50'
          }`}
        >
          Todas
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeCategory === cat ? 'bg-purple-900 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-purple-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((s) => (
          <div key={s.id} className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full">
                  {s.category}
                </span>
                <h3 className="font-bold text-gray-900 text-base mt-1.5">{s.name}</h3>
              </div>
              <span className="text-lg font-black text-purple-950">
                R$ {s.price.toFixed(2)}
              </span>
            </div>

            <p className="text-xs text-gray-500 line-clamp-2">{s.description || 'Sem descrição.'}</p>

            <div className="bg-gray-50 p-3 rounded-2xl flex justify-between text-xs font-semibold text-gray-700">
              <span>⏱️ Duração: <strong>{s.duration_minutes} min</strong></span>
              <span>💰 Comissão: <strong>{s.commission_rate}%</strong></span>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setEditingService(s);
                  setIsModalOpen(true);
                }}
                className="p-2 text-gray-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(s.id)}
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
                {editingService.id ? 'Editar Serviço' : 'Novo Serviço'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Nome do Serviço *</label>
                <input
                  type="text"
                  required
                  value={editingService.name || ''}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">Categoria *</label>
                <select
                  value={editingService.category || 'Barbearia'}
                  onChange={(e) => setEditingService({ ...editingService, category: e.target.value as ServiceCategory })}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Preço (R$) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={editingService.price || ''}
                    onChange={(e) => setEditingService({ ...editingService, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Duração (Minutos) *</label>
                  <input
                    type="number"
                    required
                    value={editingService.duration_minutes || 30}
                    onChange={(e) => setEditingService({ ...editingService, duration_minutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">Comissão (%)</label>
                <input
                  type="number"
                  value={editingService.commission_rate || 40}
                  onChange={(e) => setEditingService({ ...editingService, commission_rate: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={editingService.description || ''}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
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
