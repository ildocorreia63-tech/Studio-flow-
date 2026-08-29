import React, { useState, useEffect } from 'react';
import { DollarSign, Lock, Unlock, Plus, Minus, ArrowUpRight, ArrowDownRight, CheckCircle, AlertCircle } from 'lucide-react';
import { DB } from '../../services/db';
import { Business, CashRegister, CashTransaction, CashTransactionType, PaymentMethod } from '../../types';

interface CaixaViewProps {
  business: Business;
}

export const CaixaView: React.FC<CaixaViewProps> = ({ business }) => {
  const [openRegister, setOpenRegister] = useState<CashRegister | undefined>(undefined);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);

  // Open Modal State
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [initialAmount, setInitialAmount] = useState(150.0);

  // Close Modal State
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [reportedAmount, setReportedAmount] = useState(0);

  // Add Transaction Modal
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<CashTransactionType>('SANGRIA');
  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState(0);

  const loadCaixa = async () => {
    const active = await DB.getOpenCashRegisterAsync(business.id);
    setOpenRegister(active);
    if (active) {
      const txs = await DB.getCashTransactionsAsync(active.id);
      setTransactions(txs);
      setReportedAmount(active.final_amount_expected);
    } else {
      setTransactions([]);
    }
  };

  useEffect(() => {
    loadCaixa();
  }, [business.id]);

  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    await DB.openCashRegisterAsync(business.id, initialAmount, business.owner_name);
    setIsOpenModalOpen(false);
    await loadCaixa();
  };

  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openRegister) return;
    await DB.closeCashRegisterAsync(business.id, openRegister.id, reportedAmount);
    setIsCloseModalOpen(false);
    await loadCaixa();
  };

  const handleAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openRegister || !txDesc || txAmount <= 0) return;

    await DB.addCashTransactionAsync({
      cash_register_id: openRegister.id,
      business_id: business.id,
      type: txType,
      description: txDesc,
      amount: txAmount,
    });

    setIsTxModalOpen(false);
    setTxDesc('');
    setTxAmount(0);
    await loadCaixa();
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-black text-gray-900">Controle de Caixa</h2>
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${openRegister ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              {openRegister ? 'CAIXA ABERTO' : 'CAIXA FECHADO'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Gerencie entradas, sangrias, suprimentos e fechamento diário</p>
        </div>

        <div>
          {openRegister ? (
            <div className="flex gap-2">
              <button
                onClick={() => setIsTxModalOpen(true)}
                className="bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold py-2.5 px-4 rounded-xl text-xs transition"
              >
                + Movimentação (Sangria/Suprimento)
              </button>
              <button
                onClick={() => setIsCloseModalOpen(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" />
                <span>FECHAR CAIXA</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsOpenModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-md transition flex items-center gap-1.5"
            >
              <Unlock className="w-4 h-4" />
              <span>ABRIR CAIXA</span>
            </button>
          )}
        </div>
      </div>

      {openRegister ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Fundo Inicial</span>
              <p className="text-xl font-black text-gray-900">R$ {openRegister.initial_amount.toFixed(2)}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Vendas no Dinheiro</span>
              <p className="text-xl font-black text-emerald-600">R$ {openRegister.sales_summary.dinheiro.toFixed(2)}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Vendas no PIX</span>
              <p className="text-xl font-black text-purple-700">R$ {openRegister.sales_summary.pix.toFixed(2)}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Cartões (Déb/Créd)</span>
              <p className="text-xl font-black text-blue-700">
                R$ {(openRegister.sales_summary.debito + openRegister.sales_summary.credito).toFixed(2)}
              </p>
            </div>

            <div className="bg-purple-950 text-white p-4 rounded-2xl space-y-1 col-span-2 lg:col-span-1 shadow-md">
              <span className="text-[10px] font-bold text-purple-300 uppercase">Saldo Esperado em Caixa</span>
              <p className="text-2xl font-black text-white">R$ {openRegister.final_amount_expected.toFixed(2)}</p>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
            <div className="p-4 bg-purple-900 text-white font-bold text-xs">
              Histórico de Lançamentos do Caixa
            </div>

            <div className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">Nenhuma movimentação no caixa até o momento.</div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-xl text-white ${
                        tx.type === 'ENTRY' || tx.type === 'SUPRIMENTO' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}>
                        {tx.type === 'ENTRY' || tx.type === 'SUPRIMENTO' ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">{tx.description}</p>
                        <p className="text-[11px] text-gray-500">
                          {new Date(tx.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {tx.type} {tx.payment_method ? `(${tx.payment_method.toUpperCase()})` : ''}
                        </p>
                      </div>
                    </div>

                    <span className={`font-black text-sm ${
                      tx.type === 'ENTRY' || tx.type === 'SUPRIMENTO' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {tx.type === 'ENTRY' || tx.type === 'SUPRIMENTO' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl border border-gray-200/80 text-center space-y-4">
          <Lock className="w-16 h-16 text-gray-300 mx-auto" />
          <h3 className="text-xl font-bold text-gray-900">Caixa Fechado</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Abra o caixa informando o valor inicial em gaveta para começar a registrar recebimentos e vendas.
          </p>
          <button
            onClick={() => setIsOpenModalOpen(true)}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-emerald-700 transition"
          >
            Abrir Caixa Agora
          </button>
        </div>
      )}

      {/* Open Modal */}
      {isOpenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-purple-100 space-y-4">
            <h3 className="font-bold text-lg text-gray-900">Abertura de Caixa</h3>
            <form onSubmit={handleOpenRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase mb-1">Valor Inicial em Gaveta (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(Number(e.target.value))}
                  className="w-full p-3 bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Confirmar Abertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Modal */}
      {isCloseModalOpen && openRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-purple-100 space-y-4">
            <h3 className="font-bold text-lg text-gray-900">Fechamento de Caixa</h3>

            <div className="bg-purple-50 p-3 rounded-2xl text-xs space-y-1 text-purple-950 font-medium">
              <p>Fundo Inicial: R$ {openRegister.initial_amount.toFixed(2)}</p>
              <p>Saldo Esperado no Sistema: <strong>R$ {openRegister.final_amount_expected.toFixed(2)}</strong></p>
            </div>

            <form onSubmit={handleCloseRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase mb-1">Saldo Físico Informado (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={reportedAmount}
                  onChange={(e) => setReportedAmount(Number(e.target.value))}
                  className="w-full p-3 bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Fechar Caixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Modal (Sangria/Suprimento) */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-purple-100 space-y-4">
            <h3 className="font-bold text-lg text-gray-900">Movimentação Manual de Caixa</h3>

            <form onSubmit={handleAddTx} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase mb-1">Tipo de Operação</label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as CashTransactionType)}
                  className="w-full p-2.5 bg-white text-gray-900 border border-gray-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                >
                  <option value="SANGRIA">SANGRIA (Retirada de Dinheiro)</option>
                  <option value="SUPRIMENTO">SUPRIMENTO (Reforço de Caixa)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase mb-1">Descrição / Motivo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Compra de pó de café e açúcar"
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  className="w-full p-2.5 bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase mb-1">Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min={0.01}
                  placeholder="0.00"
                  value={txAmount || ''}
                  onChange={(e) => setTxAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTxModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
