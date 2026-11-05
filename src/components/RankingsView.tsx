import React, { useState } from 'react';
import {
  Trophy,
  Award,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Truck,
  Users,
  CheckCircle,
  XCircle,
  Medal,
} from 'lucide-react';
import {
  RouteRecord,
  CONTRACTUAL_GOAL,
  getQualityClassification,
  ProviderName,
} from '../types.ts';
import {
  computeAggregateMetrics,
  computeDriverRankings,
  computeRouteRankings,
  computeDayRankings,
} from '../utils/analytics.ts';

interface RankingsViewProps {
  routes: RouteRecord[];
}

export const RankingsView: React.FC<RankingsViewProps> = ({ routes }) => {
  const [providerFilter, setProviderFilter] = useState<'all' | ProviderName>('all');
  const [rankingTab, setRankingTab] = useState<'drivers' | 'routes' | 'days'>('drivers');

  const filteredRoutes = React.useMemo(() => {
    if (providerFilter === 'all') return routes;
    return routes.filter((r) => r.provider === providerFilter);
  }, [routes, providerFilter]);

  // Compute metrics for Oscar and Tiago
  const oscarRoutes = React.useMemo(() => routes.filter((r) => r.provider === 'Oscar'), [routes]);
  const tiagoRoutes = React.useMemo(() => routes.filter((r) => r.provider === 'Tiago'), [routes]);

  const oscarMetrics = React.useMemo(() => computeAggregateMetrics(oscarRoutes), [oscarRoutes]);
  const tiagoMetrics = React.useMemo(() => computeAggregateMetrics(tiagoRoutes), [tiagoRoutes]);

  const bestProvider = oscarMetrics.qualityPercentage >= tiagoMetrics.qualityPercentage ? 'Oscar' : 'Tiago';
  const worstProvider = oscarMetrics.qualityPercentage < tiagoMetrics.qualityPercentage ? 'Oscar' : 'Tiago';
  const bestProviderMetrics = bestProvider === 'Oscar' ? oscarMetrics : tiagoMetrics;
  const worstProviderMetrics = worstProvider === 'Oscar' ? oscarMetrics : tiagoMetrics;

  // Compute all rankings
  const driverRankings = React.useMemo(() => computeDriverRankings(filteredRoutes), [filteredRoutes]);
  const routeRankings = React.useMemo(() => computeRouteRankings(filteredRoutes), [filteredRoutes]);
  const dayRankings = React.useMemo(() => computeDayRankings(filteredRoutes), [filteredRoutes]);

  const bestDriver = driverRankings[0];
  const worstDriver = driverRankings.length > 1 ? driverRankings[driverRankings.length - 1] : undefined;

  const bestRoute = routeRankings[0];
  const worstRoute = routeRankings.length > 1 ? routeRankings[routeRankings.length - 1] : undefined;

  const bestDay = dayRankings[0];
  const worstDay = dayRankings.length > 1 ? dayRankings[dayRankings.length - 1] : undefined;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#002B5C] flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#FFD100]" />
            Rankings & Auditoria de Performance
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Classificação rigorosa baseada na qualidade de entregas ((Pacotes - Incidências) / Pacotes)
          </p>
        </div>

        {/* Provider Filter */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
          {(['all', 'Oscar', 'Tiago'] as const).map((prov) => (
            <button
              key={prov}
              onClick={() => setProviderFilter(prov)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                providerFilter === prov
                  ? 'bg-[#0057B8] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {prov === 'all' ? 'Ambos Provedores' : `Provedor ${prov}`}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Quadrants: Melhor & Pior Provedor, Motorista, Rota, Dia */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Provedores */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Rank Provedores
            </span>
            <div className="text-sm font-bold text-slate-900">Oscar vs Tiago</div>
          </div>

          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-800 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  Melhor: {bestProvider}
                </span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  {bestProviderMetrics.qualityPercentage.toFixed(2)}%
                </span>
              </div>
              <div className="text-[10px] text-emerald-600 mt-1">
                {bestProviderMetrics.totalPackages} pct entregues | {bestProviderMetrics.totalIncidences} inc.
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  2º Lugar: {worstProvider}
                </span>
                <span className="font-extrabold text-slate-800 text-sm">
                  {worstProviderMetrics.qualityPercentage.toFixed(2)}%
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {worstProviderMetrics.totalPackages} pct entregues | {worstProviderMetrics.totalIncidences} inc.
              </div>
            </div>
          </div>
        </div>

        {/* 2. Motoristas */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Destaques Motoristas
            </span>
            <div className="text-sm font-bold text-slate-900">Melhor & Menor Índice</div>
          </div>

          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-800 flex items-center gap-1 truncate">
                  <Trophy className="w-3.5 h-3.5 text-[#FFD100]" />
                  {bestDriver?.label || 'Sem dados'}
                </span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  {bestDriver ? `${bestDriver.quality.toFixed(1)}%` : '-'}
                </span>
              </div>
              <div className="text-[10px] text-emerald-600 mt-1">
                {bestDriver ? `${bestDriver.subLabel} • ${bestDriver.totalPackages} pct` : '-'}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-red-50 border border-red-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-red-800 flex items-center gap-1 truncate">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  {worstDriver?.label || 'Sem dados'}
                </span>
                <span className="font-extrabold text-red-700 text-sm">
                  {worstDriver ? `${worstDriver.quality.toFixed(1)}%` : '-'}
                </span>
              </div>
              <div className="text-[10px] text-red-600 mt-1">
                {worstDriver ? `${worstDriver.subLabel} • ${worstDriver.totalIncidences} incidências` : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Rotas */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Rotas Extrema
            </span>
            <div className="text-sm font-bold text-slate-900">Mais Eficiente vs Crítica</div>
          </div>

          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-800 flex items-center gap-1 truncate">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  {bestRoute?.label || 'Sem dados'}
                </span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  {bestRoute ? `${bestRoute.quality.toFixed(1)}%` : '-'}
                </span>
              </div>
              <div className="text-[10px] text-emerald-600 mt-1 truncate">
                {bestRoute?.subLabel || '-'}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-800 flex items-center gap-1 truncate">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  {worstRoute?.label || 'Sem dados'}
                </span>
                <span className="font-extrabold text-amber-700 text-sm">
                  {worstRoute ? `${worstRoute.quality.toFixed(1)}%` : '-'}
                </span>
              </div>
              <div className="text-[10px] text-amber-600 mt-1 truncate">
                {worstRoute?.subLabel || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Dias */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Análise Temporal
            </span>
            <div className="text-sm font-bold text-slate-900">Melhor & Pior Dia</div>
          </div>

          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-800 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  {bestDay?.label || 'Sem dados'}
                </span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  {bestDay ? `${bestDay.quality.toFixed(1)}%` : '-'}
                </span>
              </div>
              <div className="text-[10px] text-emerald-600 mt-1">
                {bestDay ? `${bestDay.subLabel} • ${bestDay.totalPackages} pct` : '-'}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-red-50 border border-red-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-red-800 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  {worstDay?.label || 'Sem dados'}
                </span>
                <span className="font-extrabold text-red-700 text-sm">
                  {worstDay ? `${worstDay.quality.toFixed(1)}%` : '-'}
                </span>
              </div>
              <div className="text-[10px] text-red-600 mt-1">
                {worstDay ? `${worstDay.subLabel} • ${worstDay.totalIncidences} incidências` : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Driver Podium (Top 3) */}
      {driverRankings.length >= 3 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <Medal className="w-4 h-4 text-[#FFD100]" />
            Pódio de Eficiência Operacional (Top 3 Motoristas)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* 2nd Place */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center flex flex-col justify-between order-2 md:order-1">
              <div>
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-200 text-slate-700 font-black text-lg flex items-center justify-center mb-2 shadow-xs">
                  2º
                </div>
                <div className="font-bold text-slate-900 text-sm">{driverRankings[1].label}</div>
                <div className="text-xs text-slate-500">{driverRankings[1].subLabel}</div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200">
                <div className="text-xl font-black text-slate-700">
                  {driverRankings[1].quality.toFixed(2)}%
                </div>
                <div className="text-[10px] text-slate-500">
                  {driverRankings[1].totalPackages} pacotes / {driverRankings[1].totalIncidences} inc.
                </div>
              </div>
            </div>

            {/* 1st Place (Gold) */}
            <div className="bg-amber-50/70 rounded-xl p-5 border-2 border-[#FFD100] text-center flex flex-col justify-between order-1 md:order-2 shadow-md relative -translate-y-1">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FFD100] text-[#002B5C] font-black text-[10px] uppercase px-3 py-0.5 rounded-full shadow-sm tracking-wider">
                Campeão de Qualidade
              </div>
              <div>
                <div className="w-12 h-12 mx-auto rounded-full bg-[#FFD100] text-[#002B5C] font-black text-xl flex items-center justify-center mb-2 shadow-sm">
                  1º
                </div>
                <div className="font-extrabold text-slate-900 text-base">{driverRankings[0].label}</div>
                <div className="text-xs text-slate-600 font-semibold">{driverRankings[0].subLabel}</div>
              </div>
              <div className="mt-3 pt-2 border-t border-amber-200">
                <div className="text-2xl font-black text-emerald-600">
                  {driverRankings[0].quality.toFixed(2)}%
                </div>
                <div className="text-[11px] text-slate-600 font-medium">
                  {driverRankings[0].totalPackages} pacotes entregues / {driverRankings[0].totalIncidences} inc.
                </div>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="bg-amber-100/30 rounded-xl p-4 border border-amber-200/80 text-center flex flex-col justify-between order-3">
              <div>
                <div className="w-10 h-10 mx-auto rounded-full bg-amber-200 text-amber-900 font-black text-lg flex items-center justify-center mb-2 shadow-xs">
                  3º
                </div>
                <div className="font-bold text-slate-900 text-sm">{driverRankings[2].label}</div>
                <div className="text-xs text-slate-500">{driverRankings[2].subLabel}</div>
              </div>
              <div className="mt-3 pt-2 border-t border-amber-200/60">
                <div className="text-xl font-black text-slate-700">
                  {driverRankings[2].quality.toFixed(2)}%
                </div>
                <div className="text-[10px] text-slate-500">
                  {driverRankings[2].totalPackages} pacotes / {driverRankings[2].totalIncidences} inc.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Rankings Tables */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/60">
          <button
            onClick={() => setRankingTab('drivers')}
            className={`px-4 py-3 font-bold text-xs sm:text-sm border-b-2 transition flex items-center gap-1.5 ${
              rankingTab === 'drivers'
                ? 'border-[#0057B8] text-[#0057B8] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Classificação Completa dos Motoristas ({driverRankings.length})
          </button>
          <button
            onClick={() => setRankingTab('routes')}
            className={`px-4 py-3 font-bold text-xs sm:text-sm border-b-2 transition flex items-center gap-1.5 ${
              rankingTab === 'routes'
                ? 'border-[#0057B8] text-[#0057B8] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            Classificação das Rotas ({routeRankings.length})
          </button>
          <button
            onClick={() => setRankingTab('days')}
            className={`px-4 py-3 font-bold text-xs sm:text-sm border-b-2 transition flex items-center gap-1.5 ${
              rankingTab === 'days'
                ? 'border-[#0057B8] text-[#0057B8] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Classificação por Dia ({dayRankings.length})
          </button>
        </div>

        {/* Content Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3 text-center w-12">Posição</th>
                <th className="px-4 py-3">Identificação</th>
                <th className="px-4 py-3">Provedor / Detalhe</th>
                <th className="px-4 py-3 text-right">Rotas</th>
                <th className="px-4 py-3 text-right">Pacotes</th>
                <th className="px-4 py-3 text-right">Incidências</th>
                <th className="px-4 py-3 text-right">Qualidade</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(rankingTab === 'drivers'
                ? driverRankings
                : rankingTab === 'routes'
                ? routeRankings
                : dayRankings
              ).map((item, idx) => {
                const isTop3 = idx < 3;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 text-center font-bold">
                      {isTop3 ? (
                        <span
                          className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs font-black ${
                            idx === 0
                              ? 'bg-[#FFD100] text-[#002B5C]'
                              : idx === 1
                              ? 'bg-slate-200 text-slate-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {idx + 1}º
                        </span>
                      ) : (
                        <span className="text-slate-400">{idx + 1}º</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">{item.label}</td>
                    <td className="px-4 py-3 text-slate-500">{item.subLabel || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">{item.totalRoutes}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {item.totalPackages.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">
                      {item.totalIncidences}
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-sm">
                      <span
                        className={
                          item.classification === 'VERDE'
                            ? 'text-emerald-600'
                            : item.classification === 'AMARELO'
                            ? 'text-amber-500'
                            : 'text-red-600'
                        }
                      >
                        {item.quality.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.classification === 'VERDE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.classification === 'AMARELO'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.classification}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
