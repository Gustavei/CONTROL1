import React, { useState } from 'react';
import { Share2, Copy, Check, X, QrCode, Globe, ShieldAlert, ExternalLink } from 'lucide-react';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Construct pure viewer link
  const origin = window.location.origin;
  const viewerUrl = `${origin}?view=public`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(viewerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0057B8] text-white p-5 flex items-center justify-between border-b-4 border-[#FFD100]">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFD100] text-[#002B5C] p-2 rounded-lg font-black">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Link de Visualização em Tempo Real
              </h3>
              <p className="text-xs text-blue-100">
                Acesso somente leitura para clientes, diretoria e galpão
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-100 hover:text-white p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
            <Globe className="w-4 h-4 text-[#0057B8] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Acesso Somente Leitura Garantido:</span>
              <p className="mt-0.5 text-blue-800 leading-relaxed">
                Quem acessar este link poderá acompanhar todos os dados, gráficos, rankings e relatórios em tempo real, sem permissão para cadastrar, editar ou excluir qualquer informação.
              </p>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              Link Oficial de Acesso Visualizador:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={viewerUrl}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-mono select-all focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0057B8] hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition active:scale-95 shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-[#FFD100]" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#FFD100]" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick QR Code representation */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
            <div className="w-20 h-20 bg-white p-1.5 rounded-lg border border-slate-300 flex items-center justify-center shrink-0 shadow-xs">
              {/* High contrast QR Code vector preview */}
              <div className="w-full h-full bg-[#002B5C] rounded flex flex-col items-center justify-center text-white p-1 text-center">
                <QrCode className="w-10 h-10 text-[#FFD100]" />
                <span className="text-[7px] font-bold tracking-tighter">GLS VIEWER</span>
              </div>
            </div>
            <div className="text-xs text-slate-600">
              <span className="font-bold text-slate-900 block mb-1">
                Acesso Móvel via Smartphone:
              </span>
              Abra a câmera do celular no galpão para abrir o painel de qualidade diretamente.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
