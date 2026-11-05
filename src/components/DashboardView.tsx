import React, { useState } from 'react';
import {
  TrendingUp,
  Package,
  Boxes,
  AlertCircle,
  Truck,
  Award,
  Users,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  RouteRecord,
  Driver,
  QualityMetrics,
  CONTRACTUAL_GOAL,
  WARNING_THRESHOLD,
  getQualityClassification,
} from '../types.ts';
import {
  computeAggregateMetrics,
  computeDriverRankings,
  computeTimelineComparison,
  DayComparison,
} from '../utils/analytics.ts';

interface DashboardViewProps {
  routes: RouteRecord[];
  drivers: Driver[];
  onNavigateToTab: (tab: any) => void;
  onOpenRouteModal: () => void;
  isAdmin: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  routes,
  drivers,
  onNavigateToTab,
  onOpenRouteModal,
  isAdmin,
}) => {
  const [periodPreset, setPeriodPreset] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Filter routes based on selected dashboard period
  const filteredRoutes = React.useMemo(() => {
    if (periodPreset === 'all') return routes;

    const todayStr = new Date().toISOString().split('T')[0];
    if (periodPreset === 'today') {
      return routes.filter((r) => r.date === todayStr);
    }

    if (periodPreset === 'week') {
      const now = new Date();
      const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7))
        .toISOString()
        .split('T')[0];
      return routes.filter((r) => r.date >= sevenDaysAgo);
    }

    if (periodPreset === 'month') {
      const currentMonth = todayStr.substring(0, 7); // YYYY-MM
      return routes.filter((r) => r.date.startsWith(currentMonth));
    }

    return routes;
  }, [routes, periodPreset]);

  // Aggregate metrics
  const globalMetrics = React.useMemo(
    () => computeAggregateMetrics(filteredRoutes),
    [filteredRoutes]
  );

  const oscarRoutes = React.useMemo(
    () => filteredRoutes.filter((r) => r.provider === 'Oscar'),
    [filteredRoutes]
  );
  const oscarMetrics = React.useMemo(
    () => computeAggregateMetrics(oscarRoutes),
    [oscarRoutes]
  );

  const tiagoRoutes = React.useMemo(
    () => filteredRoutes.filter((r) => r.provider === 'Tiago'),
    [filteredRoutes]
  );
  const tiagoMetrics = React.useMemo(
    () => computeAggregateMetrics(tiagoRoutes),
    [tiagoRoutes]
  );

  const driverRankings = React.useMemo(
    () => computeDriverRankings(filteredRoutes),
    [filteredRoutes]
  );
  const timelineData = React.useMemo(
    () => computeTimelineComparison(filteredRoutes),
    [filteredRoutes]
  );

  const bestDriver = driverRankings[0];
  const worstDriver =
    driverRankings.length > 1
      ? driverRankings[driverRankings.length - 1]
      : undefined;

  // Active drivers count
  const oscarDriversCount = drivers.filter(
    (d) => d.provider === 'Oscar' && d.status === 'active'
  ).length;
  const tiagoDriversCount = drivers.filter(
    (d) => d.provider === 'Tiago' && d.status === 'active'
  ).length;

  const getStatusBadge = (classification: string, percentage: number) => {
    if (classification === 'VERDE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          VERDE ({percentage.toFixed(1)}%) - Acima da Meta
        </span>
      );
    }
    if (classification === 'AMARELO') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          AMARELO ({percentage.toFixed(1)}%) - Atenção
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
        <XCircle className="w-3.5 h-3.5 text-red-600" />
        VERMELHO ({percentage.toFixed(1)}%) - Abaixo da Meta
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Filter Controls */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#002B5C] flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#0057B8]" />
            Painel Executivo de Qualidade Operacional
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Meta Contratual Fixa: <strong className="text-slate-800">94.00%</strong> |
            Cálculo oficial ponderado pela soma de pacotes e incidências
          </p>
        </div>

        {/* Period Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg self-start md:self-auto">
          {[
            { id: 'all', label: 'Todo Período' },
            { id: 'month', label: 'Este Mês' },
            { id: 'week', label: 'Últimos 7 dias' },
            { id: 'today', label: 'Hoje' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriodPreset(item.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                periodPreset === item.id
                  ? 'bg-[#0057B8] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Section: Qualidade Geral + Oscar + Tiago */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Qualidade Geral */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#0057B8]" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Qualidade Geral da Operação
              </span>
              <Target className="w-5 h-5 text-[#0057B8]" />
            </div>

            <div className="flex items-baseline gap-3 my-2">
              <span
                className={`text-4xl font-extrabold tracking-tight ${
                  globalMetrics.classification === 'VERDE'
                    ? 'text-emerald-600'
                    : globalMetrics.classification === 'AMARELO'
                    ? 'text-amber-500'
                    : 'text-red-600'
                }`}
              >
                {globalMetrics.qualityPercentage.toFixed(2)}%
              </span>
              <div className="flex items-center text-xs font-semibold">
                {globalMetrics.deltaToGoal >= 0 ? (
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center">
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                    +{globalMetrics.deltaToGoal}% vs meta
                  </span>
                ) : (
                  <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded flex items-center">
                    <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                    {globalMetrics.deltaToGoal}% vs meta
                  </span>
                )}
              </div>
            </div>

            <div className="mb-4">
              {getStatusBadge(
                globalMetrics.classification,
                globalMetrics.qualityPercentage
              )}
            </div>

            {/* Target 94% progress visual */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Progresso para meta de 94%</span>
                <span className="font-semibold text-slate-700">
                  {globalMetrics.qualityPercentage.toFixed(1)}% / 100%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 relative overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    globalMetrics.classification === 'VERDE'
                      ? 'bg-emerald-500'
                      : globalMetrics.classification === 'AMARELO'
                      ? 'bg-amber-400'
                      : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.min(100, globalMetrics.qualityPercentage)}%`,
                  }}
                />
                {/* 94% Goal Marker line */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-red-600 z-10"
                  style={{ left: '94%' }}
                  title="Meta Contratual Fixa: 94%"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div>
              <span className="block text-[10px] text-slate-400">Total Pacotes</span>
              <span className="font-bold text-slate-800">
                {globalMetrics.totalPackages.toLocaleString('pt-BR')}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400">Incidências</span>
              <span className="font-bold text-red-600">
                {globalMetrics.totalIncidences.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Provedor Oscar */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#FFD100]" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#0057B8]" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Provedor Oscar
                </span>
              </div>
              <button
                onClick={() => onNavigateToTab('oscar')}
                className="text-xs text-[#0057B8] hover:underline font-semibold"
              >
                Ver Painel &rarr;
              </button>
            </div>

            <div className="flex items-baseline gap-3 my-2">
              <span
                className={`text-4xl font-extrabold tracking-tight ${
                  oscarMetrics.classification === 'VERDE'
                    ? 'text-emerald-600'
                    : oscarMetrics.classification === 'AMARELO'
                    ? 'text-amber-500'
                    : 'text-red-600'
                }`}
              >
                {oscarMetrics.qualityPercentage.toFixed(2)}%
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {oscarRoutes.length} rotas
              </span>
            </div>

            <div className="mb-4">
              {getStatusBadge(
                oscarMetrics.classification,
                oscarMetrics.qualityPercentage
              )}
            </div>

            {/* Target 94% progress visual */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Meta Contratual (94%)</span>
                <span className="font-semibold text-slate-700">
                  {oscarMetrics.deltaToGoal >= 0 ? '+' : ''}
                  {oscarMetrics.deltaToGoal}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 relative overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    oscarMetrics.classification === 'VERDE'
                      ? 'bg-emerald-500'
                      : oscarMetrics.classification === 'AMARELO'
                      ? 'bg-amber-400'
                      : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.min(100, oscarMetrics.qualityPercentage)}%`,
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 w-1 bg-red-600 z-10"
                  style={{ left: '94%' }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs text-slate-600">
            <div>
              <span className="block text-[10px] text-slate-400">Volumes</span>
              <span className="font-bold text-slate-800">
                {oscarMetrics.totalVolumes.toLocaleString('pt-BR')}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400">Pacotes</span>
              <span className="font-bold text-slate-800">
                {oscarMetrics.totalPackages.toLocaleString('pt-BR')}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400">Incidências</span>
              <span className="font-bold text-red-600">
                {oscarMetrics.totalIncidences}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Provedor Tiago */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#002B5C]" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FFD100]" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Provedor Tiago
                </span>
              </div>
              <button
                onClick={() => onNavigateToTab('tiago')}
                className="text-xs text-[#0057B8] hover:underline font-semibold"
              >
                Ver Painel &rarr;
              </button>
            </div>

            <div className="flex items-baseline gap-3 my-2">
              <span
                className={`text-4xl font-extrabold tracking-tight ${
                  tiagoMetrics.classification === 'VERDE'
                    ? 'text-emerald-600'
                    : tiagoMetrics.classification === 'AMARELO'
                    ? 'text-amber-500'
                    : 'text-red-600'
                }`}
              >
                {tiagoMetrics.qualityPercentage.toFixed(2)}%
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {tiagoRoutes.length} rotas
              </span>
            </div>

            <div className="mb-4">
              {getStatusBadge(
                tiagoMetrics.classification,
                tiagoMetrics.qualityPercentage
              )}
            </div>

            {/* Target 94% progress visual */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Meta Contratual (94%)</span>
                <span className="font-semibold text-slate-700">
                  {tiagoMetrics.deltaToGoal >= 0 ? '+' : ''}
                  {tiagoMetrics.deltaToGoal}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 relative overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    tiagoMetrics.classification === 'VERDE'
                      ? 'bg-emerald-500'
                      : tiagoMetrics.classification === 'AMARELO'
                      ? 'bg-amber-400'
                      : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.min(100, tiagoMetrics.qualityPercentage)}%`,
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 w-1 bg-red-600 z-10"
                  style={{ left: '94%' }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs text-slate-600">
            <div>
              <span className="block text-[10px] text-slate-400">Volumes</span>
              <span className="font-bold text-slate-800">
                {tiagoMetrics.totalVolumes.toLocaleString('pt-BR')}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400">Pacotes</span>
              <span className="font-bold text-slate-800">
                {tiagoMetrics.totalPackages.toLocaleString('pt-BR')}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400">Incidências</span>
              <span className="font-bold text-red-600">
                {tiagoMetrics.totalIncidences}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics: Rotas, Motoristas, Volumes, Incidências */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#0057B8] flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total de Rotas
            </div>
            <div className="text-xl font-extrabold text-slate-900">
              {globalMetrics.totalRoutes}
            </div>
            <div className="text-[10px] text-slate-500">
              Oscar: {oscarRoutes.length} | Tiago: {tiagoRoutes.length}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Motoristas Ativos
            </div>
            <div className="text-xl font-extrabold text-slate-900">
              {drivers.filter((d) => d.status === 'active').length}
            </div>
            <div className="text-[10px] text-slate-500">
              Oscar: {oscarDriversCount} | Tiago: {tiagoDriversCount}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Volumes Totais
            </div>
            <div className="text-xl font-extrabold text-slate-900">
              {globalMetrics.totalVolumes.toLocaleString('pt-BR')}
            </div>
            <div className="text-[10px] text-slate-500">
              {globalMetrics.totalPackages.toLocaleString('pt-BR')} pacotes
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Incidências
            </div>
            <div className="text-xl font-extrabold text-red-600">
              {globalMetrics.totalIncidences}
            </div>
            <div className="text-[10px] text-slate-500">
              Taxa:{' '}
              {globalMetrics.totalPackages > 0
                ? (
                    (globalMetrics.totalIncidences /
                      globalMetrics.totalPackages) *
                    100
                  ).toFixed(2)
                : 0}
              %
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos Comparativos: Oscar vs Tiago */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Evolução da Qualidade Diária Oscar vs Tiago */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0057B8]" />
                Comparativo Diário de Qualidade: Oscar vs Tiago
              </h3>
              <p className="text-xs text-slate-500">
                Linha pontilhada vermelha representa a meta contratual fixa de 94.0%
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0057B8]" />
                Oscar
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFD100] border border-slate-300" />
                Tiago
              </span>
            </div>
          </div>

          {timelineData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              Nenhuma rota cadastrada para o período selecionado.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Daily bars chart */}
              <div className="space-y-3 pt-2">
                {timelineData.slice(-6).map((day) => (
                  <div key={day.date} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span>{day.formattedDate}</span>
                      <div className="flex gap-4 text-[11px]">
                        <span className="text-[#0057B8] font-bold">
                          Oscar: {day.oscarQuality !== null ? `${day.oscarQuality.toFixed(1)}%` : 'Sem rotas'}
                        </span>
                        <span className="text-[#B39200] font-bold">
                          Tiago: {day.tiagoQuality !== null ? `${day.tiagoQuality.toFixed(1)}%` : 'Sem rotas'}
                        </span>
                      </div>
                    </div>

                    {/* Dual comparison bar with 94% marker */}
                    <div className="h-6 bg-slate-100 rounded-md relative flex flex-col justify-center p-1 overflow-hidden">
                      {/* 94% reference line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                        style={{ left: '94%' }}
                        title="Meta 94%"
                      />

                      {/* Oscar Bar */}
                      {day.oscarQuality !== null && (
                        <div
                          className="h-2 rounded bg-[#0057B8] mb-0.5 transition-all"
                          style={{ width: `${Math.min(100, day.oscarQuality)}%` }}
                        />
                      )}
                      {/* Tiago Bar */}
                      {day.tiagoQuality !== null && (
                        <div
                          className="h-2 rounded bg-[#FFD100] border border-amber-400 transition-all"
                          style={{ width: `${Math.min(100, day.tiagoQuality)}%` }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Escala: 0% a 100%</span>
                <span className="text-red-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-0.5 bg-red-600 inline-block" />
                  Meta Contratual: 94%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Gráfico 2: Comparativo de Volumes, Pacotes e Incidências */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Boxes className="w-4 h-4 text-[#0057B8]" />
                Comparativo de Produtividade & Incidências
              </h3>
              <p className="text-xs text-slate-500">
                Divisão de volumes, pacotes movimentados e falhas operacionais
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 my-2">
            {/* Oscar Side */}
            <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-100">
              <div className="flex items-center gap-2 font-bold text-[#0057B8] text-sm mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0057B8]" />
                PROVEDOR OSCAR
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Pacotes Entregues:</span>
                  <span className="font-bold text-slate-800">
                    {oscarMetrics.totalPackages.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Volumes Totais:</span>
                  <span className="font-bold text-slate-800">
                    {oscarMetrics.totalVolumes.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between text-red-600 font-semibold">
                  <span>Incidências:</span>
                  <span>{oscarMetrics.totalIncidences}</span>
                </div>
                <div className="pt-2 border-t border-blue-200/60 flex justify-between font-bold">
                  <span>Qualidade Final:</span>
                  <span
                    className={
                      oscarMetrics.qualityPercentage >= CONTRACTUAL_GOAL
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    }
                  >
                    {oscarMetrics.qualityPercentage.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Tiago Side */}
            <div className="p-4 rounded-lg bg-amber-50/40 border border-amber-100">
              <div className="flex items-center gap-2 font-bold text-[#002B5C] text-sm mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFD100] border border-amber-400" />
                PROVEDOR TIAGO
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Pacotes Entregues:</span>
                  <span className="font-bold text-slate-800">
                    {tiagoMetrics.totalPackages.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Volumes Totais:</span>
                  <span className="font-bold text-slate-800">
                    {tiagoMetrics.totalVolumes.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between text-red-600 font-semibold">
                  <span>Incidências:</span>
                  <span>{tiagoMetrics.totalIncidences}</span>
                </div>
                <div className="pt-2 border-t border-amber-200/60 flex justify-between font-bold">
                  <span>Qualidade Final:</span>
                  <span
                    className={
                      tiagoMetrics.qualityPercentage >= CONTRACTUAL_GOAL
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    }
                  >
                    {tiagoMetrics.qualityPercentage.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Driver Highlights in Dashboard */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                Melhor Motorista do Período
              </span>
              {bestDriver ? (
                <div className="mt-1">
                  <div className="font-bold text-slate-900">{bestDriver.label}</div>
                  <div className="text-[11px] text-slate-500">
                    {bestDriver.subLabel} &bull;{' '}
                    <strong className="text-emerald-600">{bestDriver.quality.toFixed(1)}%</strong> ({bestDriver.totalPackages} pct)
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 mt-1">Sem dados</div>
              )}
            </div>

            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Maior Atenção / Mais Incidências
              </span>
              {worstDriver ? (
                <div className="mt-1">
                  <div className="font-bold text-slate-900">{worstDriver.label}</div>
                  <div className="text-[11px] text-slate-500">
                    {worstDriver.subLabel} &bull;{' '}
                    <strong className="text-red-600">{worstDriver.quality.toFixed(1)}%</strong> ({worstDriver.totalIncidences} inc.)
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 mt-1">Sem dados</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
