import React, { useState, useEffect } from 'react';
import { Share2, Copy, Download, ExternalLink, Check, QrCode as QrCodeIcon, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { Business } from '../../types';

interface AgendamentoOnlineViewProps {
  business: Business;
  onOpenPublicBooking: () => void;
}

export const AgendamentoOnlineView: React.FC<AgendamentoOnlineViewProps> = ({
  business,
  onOpenPublicBooking,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const bookingUrl = `${window.location.origin}/agendar/${business.slug}`;

  useEffect(() => {
    QRCode.toDataURL(bookingUrl, { width: 300, margin: 2 })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Erro ao gerar QR Code:', err));
  }, [bookingUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadQr = () => {
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qrcode_agendamento_${business.slug}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Banner de Confirmação para o Proprietário */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-3xl flex items-start gap-3.5 shadow-xs">
        <div className="p-2 bg-emerald-500 text-white rounded-2xl shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-emerald-950">Agendamento Online Ativo e Protegido</h3>
          <p className="text-xs text-emerald-800 mt-0.5">
            Sua página pública de agendamentos está no ar e protegida contra conflitos de horários e inserções não autorizadas. Seus clientes podem agendar 24 horas por dia diretamente no seu link exclusivo.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <h2 className="text-xl font-black text-gray-900">Agendamento Online 24/7</h2>
        <p className="text-xs text-gray-500">Seu link exclusivo e QR Code para clientes agendarem sem baixar app</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Link Box */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-gray-900">Link Personalizado do Estabelecimento</h3>

          <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 flex items-center justify-between text-xs">
            <span className="font-mono text-purple-950 font-bold truncate pr-2">{bookingUrl}</span>
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs shrink-0 flex items-center gap-1 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>

          <div className="pt-2">
            <button
              onClick={onOpenPublicBooking}
              className="w-full py-3 bg-purple-950 hover:bg-purple-900 text-white font-bold rounded-2xl shadow-md text-xs flex items-center justify-center space-x-2 transition"
            >
              <ExternalLink className="w-4 h-4" />
              <span>TESTAR PÁGINA PÚBLICA DE AGENDAMENTO</span>
            </button>
          </div>
        </div>

        {/* QR Code Box */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs text-center space-y-4">
          <h3 className="font-bold text-base text-gray-900">QR Code para Balcão ou Cartões</h3>

          {qrDataUrl && (
            <div className="bg-purple-50 p-4 rounded-3xl border border-purple-100 inline-block shadow-inner">
              <img src={qrDataUrl} alt="QR Code Agendamento" className="w-48 h-48 mx-auto rounded-xl" />
            </div>
          )}

          <div>
            <button
              onClick={handleDownloadQr}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition inline-flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>BAIXAR QR CODE (PNG)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
