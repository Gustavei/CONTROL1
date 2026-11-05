import React from 'react';
import { LayoutDashboard, Users, Trophy, History, FileText, UserCheck, Gauge } from 'lucide-react';

export type TabId = 'dashboard' | 'oscar' | 'tiago' | 'rankings' | 'history' | 'fleet' | 'reports';

interface NavigationProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  oscarCount: number;
  tiagoCount: number;
  fleetCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  oscarCount,
  tiagoCount,
  fleetCount,
}) => {
  const tabs = [
    { id: 'dashboard' as TabId, label: 'Visão Geral', icon: LayoutDashboard },
    {
      id: 'oscar' as TabId,
      label: 'Provedor: Oscar',
      icon: Users,
      badge: `${oscarCount} rotas`,
    },
    {
      id: 'tiago' as TabId,
      label: 'Provedor: Tiago',
      icon: Users,
      badge: `${tiagoCount} rotas`,
    },
    { id: 'rankings' as TabId, label: 'Rankings', icon: Trophy },
    { id: 'history' as TabId, label: 'Histórico de Rotas', icon: History },
    {
      id: 'fleet' as TabId,
      label: 'Frota & Custos',
      icon: Gauge,
      badge: fleetCount ? `${fleetCount} reg.` : 'KM / Combustível',
    },
    { id: 'reports' as TabId, label: 'Relatórios PDF', icon: FileText },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 shadow-xs sticky top-18 sm:top-20 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#0057B8] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#FFD100]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-[#FFD100] text-[#002B5C]'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
