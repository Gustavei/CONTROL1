import React, { useEffect, useState } from 'react';
import { Download, Smartphone, X, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (!showIOSGuide) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowIOSGuide(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showIOSGuide]);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 bg-white text-[#002B5C] hover:bg-blue-50 font-bold text-xs px-2.5 sm:px-3 py-1.5 rounded-lg shadow-xs transition active:scale-95 whitespace-nowrap"
        title="Instalar GLS Gestão de Qualidade como aplicativo"
      >
        <Download className="w-4 h-4 text-[#0057B8] shrink-0" />
        <span className="hidden sm:inline">Instalar App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 bg-white text-[#002B5C] hover:bg-blue-50 font-bold text-xs px-2.5 sm:px-3 py-1.5 rounded-lg shadow-xs transition active:scale-95 whitespace-nowrap"
          title="Instalar no iPhone ou iPad"
        >
          <Smartphone className="w-4 h-4 text-[#0057B8] shrink-0" />
          <span className="hidden sm:inline">Instalar App</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 text-slate-800"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowIOSGuide(false);
            }}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ios-install-title"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#0057B8] text-[#FFD100] font-black text-sm flex items-center justify-center font-['Outfit',sans-serif]">
                    GLS
                  </div>
                  <div>
                    <h3 id="ios-install-title" className="text-base font-bold text-[#002B5C]">
                      Instalar no iPhone / iPad
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Adicione à Tela de Início via Safari
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-2.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0057B8] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                    1
                  </span>
                  <p className="pt-0.5">
                    Toque no botão <strong className="text-slate-900 inline-flex items-center gap-1">Compartilhar <Share className="w-3.5 h-3.5 text-[#0057B8]" /></strong> na barra do Safari.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0057B8] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                    2
                  </span>
                  <p className="pt-0.5">
                    Role para baixo e toque em <strong className="text-slate-900">Adicionar à Tela de Início</strong>.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-[#0057B8] py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
