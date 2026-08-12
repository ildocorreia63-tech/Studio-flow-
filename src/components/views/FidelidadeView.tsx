import React, { useState, useEffect } from 'react';
import { Award, Plus, Check, Gift, Sparkles, MessageSquare } from 'lucide-react';
import { DB } from '../../services/db';
import { WhatsAppService } from '../../utils/whatsapp';
import { Business, LoyaltyProgram, LoyaltyCard, Client } from '../../types';

interface FidelidadeViewProps {
  business: Business;
}

export const FidelidadeView: React.FC<FidelidadeViewProps> = ({ business }) => {
  const [program, setProgram] = useState<LoyaltyProgram | undefined>(undefined);
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Program Edit State
  const [requiredStamps, setRequiredStamps] = useState(10);
  const [rewardDescription, setRewardDescription] = useState('1 Corte / Escova Grátis');
  const [isActive, setIsActive] = useState(true);

  const loadFidelidade = async () => {
    const p = await DB.getLoyaltyProgramAsync(business.id);
    setProgram(p);
    if (p) {
      setRequiredStamps(p.required_stamps);
      setRewardDescription(p.reward_description);
      setIsActive(p.is_active ?? true);
    }
    const loadedCards = await DB.getLoyaltyCardsAsync(business.id);
    setCards(loadedCards);
    const loadedClients = await DB.getClientsAsync(business.id);
    setClients(loadedClients);
  };

  useEffect(() => {
    loadFidelidade();
  }, [business.id]);

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    await DB.saveLoyaltyProgramAsync({
      business_id: business.id,
      required_stamps: requiredStamps,
      reward_description: rewardDescription,
      is_active: isActive,
      discount_type: 'free_service',
      discount_value: 100,
      validity_days: 90,
    });
    await loadFidelidade();
  };

  const handleAddStamp = async (card: LoyaltyCard) => {
    await DB.addLoyaltyStampAsync(business.id, card.client_id);
    await loadFidelidade();
  };

  const handleRedeemReward = async (card: LoyaltyCard) => {
    await DB.redeemLoyaltyRewardAsync(business.id, card.client_id);
    await loadFidelidade();
  };

  const maxStamps = program?.required_stamps || requiredStamps;

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Award className="w-6 h-6 text-purple-700" />
            <h2 className="text-xl font-black text-gray-900">Programa de Fidelidade Digital</h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Fidelize seus clientes com selos digitais e recompensas</p>
        </div>
      </div>

      {/* Program Config Box */}
      <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 p-6 rounded-3xl text-white shadow-lg space-y-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-purple-200" />
          <h3 className="font-bold text-base">Regras do Seu Cartão Fidelidade</h3>
        </div>

        <form onSubmit={handleSaveProgram} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-purple-200 uppercase mb-1">Status *</label>
            <select
              value={isActive ? 'active' : 'inactive'}
              onChange={(e) => setIsActive(e.target.value === 'active')}
              className="w-full px-3 py-2 bg-purple-900/80 border border-purple-700 rounded-xl text-sm font-bold text-white outline-none"
            >
              <option value="active" className="bg-purple-950 text-white">Programa Ativo</option>
              <option value="inactive" className="bg-purple-950 text-white">Programa Inativo</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-purple-200 uppercase mb-1">Quantidade de Selos *</label>
            <input
              type="number"
              min={3}
              max={20}
              required
              value={requiredStamps}
              onChange={(e) => setRequiredStamps(Number(e.target.value))}
              className="w-full px-3 py-2 bg-purple-900/80 border border-purple-700 rounded-xl text-sm font-bold text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-purple-200 uppercase mb-1">Prêmio/Recompensa *</label>
            <input
              type="text"
              required
              placeholder="Ex: 1 Corte Grátis ou R$ 50 de Desconto"
              value={rewardDescription}
              onChange={(e) => setRewardDescription(e.target.value)}
              className="w-full px-3 py-2 bg-purple-900/80 border border-purple-700 rounded-xl text-sm font-bold text-white outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-white text-purple-950 font-black py-2.5 px-4 rounded-xl text-xs hover:bg-purple-50 transition shadow-md"
          >
            ATUALIZAR REGRAS
          </button>
        </form>
      </div>

      {/* Clients Loyalty Cards Grid */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-purple-950 text-white font-bold text-xs">
          Cartões Fidelidade Ativos dos Clientes ({cards.length})
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card) => {
            const client = clients.find((c) => c.id === card.client_id);
            const clientName = client?.name || card.client_name || 'Cliente';

            return (
              <div
                key={card.id}
                className={`p-5 rounded-3xl border space-y-3 transition ${
                  card.reward_available
                    ? 'bg-amber-50/80 border-amber-300 shadow-md'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{clientName}</h4>
                    <p className="text-xs text-gray-500">
                      Progresso: <strong>{card.current_stamps}/{maxStamps} selos</strong>
                    </p>
                  </div>

                  {card.reward_available ? (
                    <span className="text-xs font-black bg-amber-200 text-amber-900 px-3 py-1 rounded-full border border-amber-400 animate-pulse flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5" />
                      Prêmio Liberado!
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAddStamp(card)}
                      className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Selo</span>
                    </button>
                  )}
                </div>

                {/* Visual Stamps Grid */}
                <div className="flex flex-wrap gap-2 py-2">
                  {Array.from({ length: maxStamps }).map((_, idx) => {
                    const isStamped = idx < card.current_stamps;
                    return (
                      <div
                        key={idx}
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition ${
                          isStamped
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'bg-gray-100 text-gray-300 border border-gray-200'
                        }`}
                      >
                        {isStamped ? '✓' : idx + 1}
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-100 text-xs">
                  <span className="text-gray-500 italic">Prêmio: {rewardDescription}</span>

                  <div className="flex items-center space-x-2">
                    {card.reward_available && (
                      <button
                        onClick={() => handleRedeemReward(card)}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                      >
                        Resgatar Prêmio
                      </button>
                    )}

                    {client && (
                      <a
                        href={WhatsAppService.sendLoyaltyProgress({
                          clientName: client.name,
                          clientPhone: client.whatsapp,
                          currentStamps: card.current_stamps,
                          targetStamps: maxStamps,
                          rewardDescription,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                        title="Enviar Selos no WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
