import React, { useState } from 'react';
import {
  ShieldCheck,
  Eye,
  Share2,
  FileText,
  PlusCircle,
  LogIn,
  LogOut,
  UserCheck,
  Truck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { ADMIN_EMAIL, loginWithGoogle, logoutUser } from '../lib/firebase.ts';

interface HeaderProps {
  isAdmin: boolean;
  userEmail: string | null;
  onOpenRouteModal: () => void;
  onOpenDriverModal: () => void;
  onOpenShareModal: () => void;
  onOpenReportModal: () => void;
  onToggleAdminMode: (enable: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isAdmin,
  userEmail,
  onOpenRouteModal,
  onOpenDriverModal,
  onOpenShareModal,
  onOpenReportModal,
  onToggleAdminMode,
}) => {
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);

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
    // Default admin pin or password verification for quick management
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
        <div className="flex items-center justify-between h-18 sm:h-20">
          {/* Brand Logo & System Name */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="flex items-center">
              {/* GLS Brand Badge */}
              <div className="bg-[#FFD100] text-[#002B5C] font-black text-2xl sm:text-3xl px-3 py-1 rounded shadow-inner tracking-tighter flex items-center font-['Outfit',sans-serif]">
                GLS
              </div>
            </div>
            <div className="border-l border-blue-400/40 pl-3 sm:pl-4">
              <h1 className="font-extrabold text-base sm:text-xl tracking-tight text-white flex items-center gap-2">
                GESTÃO DE QUALIDADE
                <span className="hidden md:inline-block text-[11px] font-bold bg-[#FFD100] text-[#002B5C] px-2 py-0.5 rounded uppercase tracking-wider">
                  Meta 94%
                </span>
              </h1>
              <p className="text-xs text-blue-100 hidden sm:block">
                Auditoria de Rotas, Entregas & Provedores Oscar e Tiago
              </p>
            </div>
          </div>

          {/* Right Action Items */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Access Mode Badge */}
            <div className="relative">
              {isAdmin ? (
                <div
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  className="cursor-pointer flex items-center gap-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md border border-emerald-400 shadow-sm transition"
                  title="Acesso de Administrador Ativo"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-200" />
                  <span className="hidden md:inline">Administrador</span>
                  <span className="md:hidden">Admin</span>
                </div>
              ) : (
                <div
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  className="cursor-pointer flex items-center gap-1.5 bg-blue-800/80 hover:bg-blue-800 text-blue-100 text-xs font-medium px-2.5 py-1.5 rounded-md border border-blue-400/30 transition"
                  title="Modo Visualizador: Apenas Leitura"
                >
                  <Eye className="w-4 h-4 text-[#FFD100]" />
                  <span className="hidden md:inline">Modo Visualizador</span>
                  <span className="md:hidden">Leitura</span>
                </div>
              )}

              {/* Admin Menu Dropdown */}
              {showAdminMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Nível de Acesso</div>
                    <div className="text-sm font-semibold text-slate-900 mt-0.5">
                      {isAdmin ? 'Administrador (Acesso Total)' : 'Visualizador (Somente Leitura)'}
                    </div>
                    {userEmail && (
                      <div className="text-xs text-slate-500 truncate mt-0.5">{userEmail}</div>
                    )}
                  </div>

                  <div className="p-2 space-y-1">
                    {!isAdmin ? (
                      <>
                        <button
                          onClick={handleGoogleLogin}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition"
                        >
                          <LogIn className="w-4 h-4 text-[#0057B8]" />
                          Entrar com Google ({ADMIN_EMAIL})
                        </button>
                        {!showPinInput ? (
                          <button
                            onClick={() => setShowPinInput(true)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition"
                          >
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            Acessar como Administrador (PIN)
                          </button>
                        ) : (
                          <form onSubmit={handlePinSubmit} className="p-2 bg-slate-50 rounded border border-slate-200">
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                              Digite o PIN ou código Admin:
                            </label>
                            <input
                              type="password"
                              value={adminPin}
                              onChange={(e) => setAdminPin(e.target.value)}
                              placeholder="Código admin..."
                              className="w-full px-2 py-1 text-xs border rounded mb-1 focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
                              autoFocus
                            />
                            {pinError && (
                              <p className="text-[10px] text-red-600 mb-1">PIN incorreto. (Dica: gls2026 ou faça login)</p>
                            )}
                            <div className="flex gap-1 justify-end">
                              <button
                                type="button"
                                onClick={() => setShowPinInput(false)}
                                className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-700"
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                className="px-2 py-1 text-[11px] bg-[#0057B8] text-white rounded font-medium hover:bg-blue-700"
                              >
                                Confirmar
                              </button>
                            </div>
                          </form>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            onToggleAdminMode(false);
                            logoutUser();
                            setShowAdminMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition"
                        >
                          <LogOut className="w-4 h-4" />
                          Mudar para Modo Visualizador
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Share Link Button */}
            <button
              onClick={onOpenShareModal}
              className="flex items-center gap-1.5 bg-[#FFD100] hover:bg-yellow-400 text-[#002B5C] font-bold text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded-md shadow-sm transition active:scale-95"
              title="Gerar link de visualização em tempo real"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>

            {/* PDF Report Button */}
            <button
              onClick={onOpenReportModal}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-medium text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded-md border border-white/20 transition active:scale-95"
              title="Gerar Relatórios em PDF"
            >
              <FileText className="w-4 h-4 text-[#FFD100]" />
              <span className="hidden sm:inline">Relatório PDF</span>
            </button>

            {/* Admin Action: Add Route */}
            {isAdmin && (
              <button
                onClick={onOpenRouteModal}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded-md shadow-sm transition active:scale-95"
                title="Cadastrar Nova Rota"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden md:inline">Nova Rota</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
