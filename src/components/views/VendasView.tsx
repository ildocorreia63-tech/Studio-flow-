import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, CheckCircle, DollarSign } from 'lucide-react';
import { DB } from '../../services/db';
import { Business, Service, Client, Professional, PaymentMethod } from '../../types';

interface VendasViewProps {
  business: Business;
}

export const VendasView: React.FC<VendasViewProps> = ({ business }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProfId, setSelectedProfId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [discount, setDiscount] = useState(0);

  const [cart, setCart] = useState<{ id: string; name: string; price: number; quantity: number }[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      const cli = await DB.getClientsAsync(business.id);
      setClients(cli);
      const srvs = await DB.getServicesAsync(business.id);
      setServices(srvs.filter((s) => s.active));
      const profs = await DB.getProfessionalsAsync(business.id);
      const activeProfs = profs.filter((p) => p.status === 'active');
      setProfessionals(activeProfs);
      if (activeProfs.length > 0) setSelectedProfId(activeProfs[0].id);
    };
    load();
  }, [business.id]);

  const addToCart = (srv: Service) => {
    const existing = cart.find((i) => i.id === srv.id);
    if (existing) {
      setCart(cart.map((i) => (i.id === srv.id ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      setCart([...cart, { id: srv.id, name: srv.name, price: srv.price, quantity: 1 }]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((i) => i.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const finalTotal = Math.max(0, subtotal - discount);

  const handleFinishSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const selClient = clients.find((c) => c.id === selectedClientId);

      await DB.createSaleAsync({
        business_id: business.id,
        client_id: selectedClientId || undefined,
        client_name: selClient?.name || undefined,
        professional_id: selectedProfId || undefined,
        items: cart.map((c) => ({
          item_type: 'service',
          item_id: c.id,
          name: c.name,
          quantity: c.quantity,
          unit_price: c.price,
        })),
        payments: [{ method: paymentMethod, amount: finalTotal }],
        discount,
      });

      setSuccessMsg(`Venda de R$ ${finalTotal.toFixed(2)} registrada com sucesso!`);
      setCart([]);
      setDiscount(0);

      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao registrar a venda. Verifique se o caixa está aberto.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-gray-900">Ponto de Venda (PDV)</h2>
          <p className="text-xs text-gray-500">Registre vendas avulsas de serviços e produtos</p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm font-bold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm font-bold flex items-center gap-2">
          <span>⚠️ {errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Catalog List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-gray-900">Selecione os Serviços/Produtos</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((srv) => (
              <div
                key={srv.id}
                onClick={() => addToCart(srv)}
                className="p-4 rounded-2xl border border-gray-200 hover:border-purple-600 hover:bg-purple-50/50 transition cursor-pointer flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-sm text-gray-900">{srv.name}</p>
                  <p className="text-xs text-gray-500">{srv.category}</p>
                </div>
                <div className="text-right">
                  <span className="font-black text-purple-950 text-sm">R$ {srv.price.toFixed(2)}</span>
                  <span className="block text-[10px] text-purple-700 font-bold">+ Adicionar</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Checkout */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-gray-900 pb-2 border-b">Resumo do Carrinho</h3>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-6">Carrinho vazio</p>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-bold text-gray-900">{item.name}</p>
                    <p className="text-gray-500">{item.quantity}x R$ {item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-purple-900">R$ {(item.price * item.quantity).toFixed(2)}</span>
                    <button onClick={() => removeFromCart(item.id)} className="text-rose-500 hover:text-rose-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3 pt-3 border-t border-gray-100">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Cliente (Opcional)</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full p-2 border rounded-xl text-xs"
              >
                <option value="">Cliente Ocasional</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Forma de Pagamento *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full p-2 border rounded-xl text-xs font-bold"
              >
                <option value="pix">PIX</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="debito">Cartão de Débito</option>
                <option value="credito">Cartão de Crédito</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Desconto (R$)</label>
              <input
                type="number"
                min={0}
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full p-2 border rounded-xl text-xs"
              />
            </div>

            <div className="p-3 bg-purple-900 text-white rounded-2xl flex justify-between items-center">
              <span className="text-xs font-bold">Total a Pagar:</span>
              <span className="text-lg font-black">R$ {finalTotal.toFixed(2)}</span>
            </div>

            <button
              onClick={handleFinishSale}
              disabled={cart.length === 0}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-2xl shadow-md text-sm transition"
            >
              FINALIZAR VENDA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
