import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Eye,
  Share2,
  FileText,
  PlusCircle,
  LogIn,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { ADMIN_EMAIL, loginWithGoogle, logoutUser } from '../lib/firebase.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface HeaderProps {
  isAdmin: boolean;
  userEmail: string | null;
  onOpenRouteModal: () => void;
  onOpenDriverModal: () => void;
  onOpenShareModal: () => void;
  onOpenReportModal: () => void;
  onOpenAIAssistant?: () => void;
  onToggleAdminMode: (enable: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isAdmin,
  userEmail,
  onOpenRouteModal,
  onOpenShareModal,
  onOpenReportModal,
  onOpenAIAssistant,
  onToggleAdminMode,
}) => {
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAdminMenu) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAdminMenu(false);
        setShowPinInput(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAdminMenu(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAdminMenu]);

  const handleGoogleLogin = async () => {
    try {
      const user = await loginWithGoogle();
      if (user) {
        setShowAdminMenu(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === 'gls2026' || adminPin === 'admin' || adminPin === '94') {
      onToggleAdminMode(true);
      setShowPinInput(false);
      setShowAdminMenu(false);
      setAdminPin('');
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0057B8] text-white shadow-md border-b-4 border-[#FFD100]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo & System Name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-[#FFD100] text-[#002B5C] font-black text-xl sm:text-2xl px-2.5 py-0.5 rounded shadow-inner tracking-tighter flex items-center font-['Outfit',sans-serif] shrink-0">
              GLS
            </div>
            <div className="border-l border-blue-400/40 pl-3 min-w-0">
              <h1 className="font-extrabold text-sm sm:text-lg tracking-tight text-white flex items-center gap-2 truncate">
                <span className="truncate">GESTÃO DE QUALIDADE</span>
                <span className="hidden md:inline-block text-[10px] font-extrabold bg-[#FFD100] text-[#002B5C] px-2 py-0.5 rounded uppercase tracking-wider shrink-0 tabular-nums">
                  Meta 94%
                </span>
              </h1>
              <p className="text-[11px] text-blue-100/90 hidden sm:block truncate">
                Auditoria de Rotas, Frota & Provedores Oscar e Tiago
              </p>
            </div>
          </div>

          {/* Right Action Items */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Access Mode Badge */}
            <div className="relative" ref={menuRef}>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  className="flex items-center gap-1.5 bg-emerald-600/95 hover:bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-emerald-400/80 shadow-xs transition whitespace-nowrap"
                  title="Acesso de Administrador Ativo"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-100 shrink-0" />
                  <span className="hidden md:inline">Administrador</span>
                  <span className="md:hidden">Admin</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  className="flex items-center gap-1.5 bg-blue-900/70 hover:bg-blue-900 text-blue-100 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-blue-300/30 transition whitespace-nowrap"
                  title="Modo Visualizador: Apenas Leitura"
                >
                  <Eye className="w-4 h-4 text-[#FFD100] shrink-0" />
                  <span className="hidden md:inline">Visualizador</span>
                  <span className="md:hidden">Leitura</span>
                </button>
              )}

              {/* Admin Menu Dropdown */}
              {showAdminMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Nível de Acesso
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {isAdmin ? 'Administrador (Acesso Total)' : 'Visualizador (Somente Leitura)'}
                    </div>
                    {isAdmin && userEmail && (
                      <div className="text-xs text-slate-500 truncate mt-0.5">{userEmail}</div>
                    )}
                  </div>

                  <div className="p-2 space-y-1">
                    {!isAdmin ? (
                      <>
                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition text-left"
                        >
                          <LogIn className="w-4 h-4 text-[#0057B8] shrink-0" />
                          <span className="truncate">Entrar com Google ({ADMIN_EMAIL})</span>
                        </button>
                        {!showPinInput ? (
                          <button
                            type="button"
                            onClick={() => {
                              setShowPinInput(true);
                              setPinError(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition text-left"
                          >
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Acessar como Administrador (PIN)</span>
                          </button>
                        ) : (
                          <form onSubmit={handlePinSubmit} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">
                              Digite o PIN de Administrador:
                            </label>
                            <input
                              type="password"
                              value={adminPin}
                              onChange={(e) => {
                                setAdminPin(e.target.value);
                                if (pinError) setPinError(false);
                              }}
                              placeholder="Código admin..."
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md mb-1.5 focus:outline-none focus:ring-2 focus:ring-[#0057B8] bg-white"
                              autoFocus
                            />
                            {pinError && (
                              <p className="text-[11px] text-red-600 font-medium mb-1.5">
                                PIN incorreto. Verifique o código ou faça login com Google.
                              </p>
                            )}
                            <div className="flex gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowPinInput(false);
                                  setPinError(false);
                                  setAdminPin('');
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700"
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                className="px-2.5 py-1 text-[11px] bg-[#0057B8] text-white rounded-md font-bold hover:bg-blue-700"
                              >
                                Confirmar
                              </button>
                            </div>
                          </form>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onToggleAdminMode(false);
                          logoutUser();
                          setShowAdminMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>Mudar para Modo Visualizador</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* PWA Install Button */}
            <PWAInstallButton />

            {/* AI Assistant Button */}
            {onOpenAIAssistant && (
              <button
                type="button"
                onClick={onOpenAIAssistant}
                className="flex items-center gap-1.5 bg-[#002B5C] hover:bg-blue-950 text-[#FFD100] font-bold text-xs px-2.5 sm:px-3 py-1.5 rounded-lg border border-blue-300/30 shadow-xs transition active:scale-95 whitespace-nowrap"
                title="Abrir Assistente GLS IA"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Assistente IA</span>
              </button>
            )}

            {/* Share Link Button */}
            <button
              type="button"
              onClick={onOpenShareModal}
              className="flex items-center gap-1.5 bg-[#FFD100] hover:bg-yellow-400 text-[#002B5C] font-bold text-xs px-2.5 sm:px-3 py-1.5 rounded-lg shadow-xs transition active:scale-95 whitespace-nowrap"
              title="Gerar link de visualização em tempo real"
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>

            {/* PDF Report Button */}
            <button
              type="button"
              onClick={onOpenReportModal}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-2.5 sm:px-3 py-1.5 rounded-lg border border-white/20 transition active:scale-95 whitespace-nowrap"
              title="Gerar Relatórios em PDF"
            >
              <FileText className="w-4 h-4 text-[#FFD100] shrink-0" />
              <span className="hidden sm:inline">Relatório PDF</span>
            </button>

            {/* Admin Action: Add Route */}
            {isAdmin && (
              <button
                type="button"
                onClick={onOpenRouteModal}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs px-2.5 sm:px-3 py-1.5 rounded-lg shadow-xs transition active:scale-95 whitespace-nowrap"
                title="Cadastrar Nova Rota"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Nova Rota</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
