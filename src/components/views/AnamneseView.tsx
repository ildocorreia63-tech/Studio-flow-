import React, { useState, useEffect } from 'react';
import { ClipboardList, PlusCircle, Search, Save, User } from 'lucide-react';
import { DB } from '../../services/db';
import { Business, Client, AnamneseRecord } from '../../types';

interface AnamneseViewProps {
  business: Business;
}

export const AnamneseView: React.FC<AnamneseViewProps> = ({ business }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [records, setRecords] = useState<AnamneseRecord[]>([]);

  // Form State
  const [allergies, setAllergies] = useState('');
  const [hairType, setHairType] = useState('');
  const [chemicalHistory, setChemicalHistory] = useState('');
  const [preferences, setPreferences] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const list = DB.getClients(business.id);
    setClients(list);
    if (list.length > 0) {
      setSelectedClientId(list[0].id);
    }
  }, [business.id]);

  useEffect(() => {
    if (selectedClientId) {
      const recs = DB.getAnamneseRecords(business.id, selectedClientId);
      setRecords(recs);

      if (recs.length > 0) {
        const latest = recs[0];
        setAllergies(latest.allergies || '');
        setHairType(latest.hair_type || '');
        setChemicalHistory(latest.chemical_history || '');
        setPreferences(latest.preferences || '');
        setGeneralNotes(latest.notes || '');
      } else {
        setAllergies('');
        setHairType('');
        setChemicalHistory('');
        setPreferences('');
        setGeneralNotes('');
      }
    }
  }, [selectedClientId, business.id]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;

    DB.saveAnamneseRecord({
      business_id: business.id,
      client_id: selectedClientId,
      allergies,
      hair_type: hairType,
      chemical_history: chemicalHistory,
      preferences,
      notes: generalNotes,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-gray-900">Ficha de Anamnese do Cliente</h2>
          <p className="text-xs text-gray-500">Registre histórico químico, alergias, tipo de cabelo e preferências</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Client Selection List */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-gray-900">Selecione o Cliente</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {clients.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedClientId(c.id)}
                className={`p-3 rounded-2xl border cursor-pointer transition text-xs flex items-center space-x-3 ${
                  selectedClientId === c.id
                    ? 'border-purple-600 bg-purple-50 font-bold text-purple-950'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-purple-200 text-purple-900 font-extrabold flex items-center justify-center shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-sm">{c.name}</p>
                  <p className="text-[11px] text-gray-500">{c.phone}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Anamnese Form */}
        <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
              ✓ Ficha técnica de anamnese salva com sucesso!
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Alergias Conhecidas</label>
                <input
                  type="text"
                  placeholder="Ex: Alergia a Amônia / Esmalte"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">Tipo de Cabelo / Pele</label>
                <input
                  type="text"
                  placeholder="Ex: Ondulado 2B, Porosidade Alta"
                  value={hairType}
                  onChange={(e) => setHairType(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Histórico Químico Anterior</label>
              <textarea
                rows={2}
                placeholder="Ex: Progressiva com formol há 3 meses, descoloração recente no topo."
                value={chemicalHistory}
                onChange={(e) => setChemicalHistory(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Preferências Pessoais do Cliente</label>
              <textarea
                rows={2}
                placeholder="Ex: Gosta de café expresso sem açúcar, prefere pomada efeito matte."
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Observações Gerais</label>
              <textarea
                rows={2}
                placeholder="Outras notas relevantes..."
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-md text-xs transition flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>SALVAR FICHA ANAMNESE</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
