import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Truck,
  Users,
  Download,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RotateCcw,
  ArrowUpDown,
  FileSpreadsheet,
} from 'lucide-react';
import {
  RouteRecord,
  Driver,
  ProviderName,
  CONTRACTUAL_GOAL,
  getQualityClassification,
} from '../types.ts';
import { computeAggregateMetrics } from '../utils/analytics.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';

interface HistoryViewProps {
  routes: RouteRecord[];
  drivers: Driver[];
  isAdmin: boolean;
  onOpenRouteModal: (route?: RouteRecord) => void;
  onDeleteRoute: (routeId: string) => void;
  onDeleteAllRoutes?: () => Promise<void>;
}

type PeriodPreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'year' | 'custom';
type SortField = 'date' | 'provider' | 'driverName' | 'routeNumber' | 'locality' | 'volumes' | 'packages' | 'incidences' | 'quality';
type SortOrder = 'asc' | 'desc';

export const HistoryView: React.FC<HistoryViewProps> = ({
  routes,
  drivers,
  isAdmin,
  onOpenRouteModal,
  onDeleteRoute,
  onDeleteAllRoutes,
}) => {
  const [routeToDelete, setRouteToDelete] = useState<RouteRecord | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<'all' | ProviderName>('all');
  const [selectedDriver, setSelectedDriver] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'VERDE' | 'AMARELO' | 'VERMELHO'>('all');

  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Handle Preset Change
  const handlePresetChange = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const startOfMonth = `${todayStr.substring(0, 7)}-01`;
      setStartDate(startOfMonth);
      setEndDate(todayStr);
    } else if (preset === 'last_month') {
      const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(prev.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'year') {
      setStartDate(`${today.getFullYear()}-01-01`);
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Filter routes
  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      // Date filter
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;

      // Provider filter
      if (selectedProvider !== 'all' && r.provider !== selectedProvider) return false;

      // Driver filter
      if (selectedDriver !== 'all' && r.driverName.toLowerCase() !== selectedDriver.toLowerCase()) return false;

      // Status filter
      if (statusFilter !== 'all') {
        const classif = getQualityClassification(r.quality);
        if (classif !== statusFilter) return false;
      }

      // Search term (route number, name, locality, notes, driver)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const match =
          r.routeNumber.toLowerCase().includes(term) ||
          r.routeName.toLowerCase().includes(term) ||
          r.locality.toLowerCase().includes(term) ||
          r.driverName.toLowerCase().includes(term) ||
          (r.notes && r.notes.toLowerCase().includes(term));
        if (!match) return false;
      }

      return true;
    });
  }, [routes, startDate, endDate, selectedProvider, selectedDriver, statusFilter, searchTerm]);

  // Sort routes
  const sortedRoutes = useMemo(() => {
    return [...filteredRoutes].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRoutes, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Metrics for filtered results
  const filteredMetrics = useMemo(
    () => computeAggregateMetrics(filteredRoutes),
    [filteredRoutes]
  );

  // Export to CSV
  const exportToCsv = () => {
    if (filteredRoutes.length === 0) return;

    const headers = [
      'Data',
      'Provedor',
      'Motorista',
      'Número da Rota',
      'Nome da Rota',
      'Localidade',
      'Volumes',
      'Pacotes',
      'Incidências',
      'Qualidade (%)',
      'Classificação',
      'Observações',
    ];

    const rows = filteredRoutes.map((r) => [
      r.date,
      r.provider,
      `"${r.driverName.replace(/"/g, '""')}"`,
      `"${r.routeNumber}"`,
      `"${r.routeName.replace(/"/g, '""')}"`,
      `"${r.locality.replace(/"/g, '""')}"`,
      r.volumes,
      r.packages,
      r.incidences,
      r.quality.toFixed(2),
      getQualityClassification(r.quality),
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `GLS_Rotas_Historico_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setPeriodPreset('all');
    setStartDate('');
    setEndDate('');
    setSelectedProvider('all');
    setSelectedDriver('all');
    setSearchTerm('');
    setStatusFilter('all');
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls Card */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#002B5C] flex items-center gap-2">
              <Filter className="w-5 h-5 text-[#0057B8]" />
              Histórico & Pesquisa Avançada de Rotas
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Consulte períodos anteriores, filtre por provedor, motorista e números de rota
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && routes.length > 0 && (
              <button
                onClick={() => setShowDeleteAllModal(true)}
                className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs px-3 py-1.5 rounded-lg border border-red-200 transition"
                title="Excluir todas as rotas de uma vez"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar Todas as Rotas
              </button>
            )}
            <button
              onClick={exportToCsv}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-lg border border-slate-300 transition"
              title="Exportar planilha CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Exportar CSV
            </button>
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2 py-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Período:
          </span>
          {[
            { id: 'all', label: 'Todo Período' },
            { id: 'today', label: 'Hoje' },
            { id: 'yesterday', label: 'Ontem' },
            { id: 'week', label: 'Últimos 7 dias' },
            { id: 'month', label: 'Este Mês' },
            { id: 'last_month', label: 'Mês Anterior' },
            { id: 'year', label: 'Este Ano' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handlePresetChange(item.id as PeriodPreset)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                periodPreset === item.id
                  ? 'bg-[#0057B8] text-white shadow-xs font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {/* Search Term */}
          <div className="lg:col-span-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Busca (Rota, Localidade, Notas)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ex: RT-101, Centro, Carlos..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              />
            </div>
          </div>

          {/* Provider Select */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Provedor
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8] bg-white"
            >
              <option value="all">Todos os Provedores</option>
              <option value="Oscar">Oscar</option>
              <option value="Tiago">Tiago</option>
            </select>
          </div>

          {/* Driver Select */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Motorista
            </label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8] bg-white"
            >
              <option value="all">Todos os Motoristas</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name} ({d.provider})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Classificação
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8] bg-white"
            >
              <option value="all">Todas as Faixas</option>
              <option value="VERDE">VERDE (&gt; 94%)</option>
              <option value="AMARELO">AMARELO (90% a 94%)</option>
              <option value="VERMELHO">VERMELHO (&lt; 90%)</option>
            </select>
          </div>
        </div>

        {/* Date Inputs if Custom or Fine Tune */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold">De:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">Até:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
            />
          </div>
        </div>
      </div>

      {/* Filtered Result Metrics Summary Banner */}
      <div className="bg-[#002B5C] text-white rounded-xl p-4 shadow-sm grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div>
          <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider block">
            Rotas Encontradas
          </span>
          <span className="text-xl font-black">{filteredRoutes.length}</span>
        </div>
        <div>
          <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider block">
            Total Volumes
          </span>
          <span className="text-xl font-black">
            {filteredMetrics.totalVolumes.toLocaleString('pt-BR')}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider block">
            Total Pacotes
          </span>
          <span className="text-xl font-black">
            {filteredMetrics.totalPackages.toLocaleString('pt-BR')}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider block">
            Total Incidências
          </span>
          <span className="text-xl font-black text-red-400">
            {filteredMetrics.totalIncidences}
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider block">
            Qualidade Ponderada
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-xl font-black ${
                filteredMetrics.classification === 'VERDE'
                  ? 'text-emerald-400'
                  : filteredMetrics.classification === 'AMARELO'
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}
            >
              {filteredMetrics.qualityPercentage.toFixed(2)}%
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                filteredMetrics.classification === 'VERDE'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : filteredMetrics.classification === 'AMARELO'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-red-500/20 text-red-300'
              }`}
            >
              {filteredMetrics.classification}
            </span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {sortedRoutes.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <p className="font-semibold text-slate-700">Nenhuma rota encontrada para os filtros selecionados.</p>
            <p className="text-xs text-slate-400 mt-1">Tente ajustar as datas ou limpar os critérios de busca.</p>
            <button
              onClick={resetFilters}
              className="mt-3 text-xs font-bold text-[#0057B8] hover:underline"
            >
              Redefinir Filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th
                    onClick={() => toggleSort('date')}
                    className="px-4 py-3 cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      Data <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('provider')}
                    className="px-4 py-3 cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      Provedor <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('driverName')}
                    className="px-4 py-3 cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      Motorista <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('routeNumber')}
                    className="px-4 py-3 cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      Rota / Nº <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('locality')}
                    className="px-4 py-3 cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      Localidade <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('volumes')}
                    className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Vol. <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('packages')}
                    className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Pacotes <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('incidences')}
                    className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Incidências <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('quality')}
                    className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Qualidade <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">Status</th>
                  {isAdmin && <th className="px-4 py-3 text-center whitespace-nowrap">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRoutes.map((route) => {
                  const classif = getQualityClassification(route.quality);
                  return (
                    <tr key={route.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                        {route.date.split('-').reverse().join('/')}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            route.provider === 'Oscar'
                              ? 'bg-blue-100 text-[#0057B8]'
                              : 'bg-amber-100 text-[#002B5C]'
                          }`}
                        >
                          {route.provider}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                        {route.driverName}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="font-bold text-[#0057B8]">{route.routeNumber}</span>
                        <span className="text-slate-500 text-[11px] block">{route.routeName}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                        {route.locality}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium">{route.volumes}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{route.packages}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-red-600">
                        {route.incidences}
                      </td>
                      <td className="px-4 py-2.5 text-right font-black text-sm whitespace-nowrap">
                        <span
                          className={
                            classif === 'VERDE'
                              ? 'text-emerald-600'
                              : classif === 'AMARELO'
                              ? 'text-amber-500'
                              : 'text-red-600'
                          }
                        >
                          {route.quality.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            classif === 'VERDE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : classif === 'AMARELO'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {classif}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-2.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onOpenRouteModal(route)}
                              className="p-1 text-slate-400 hover:text-[#0057B8] rounded"
                              title="Editar rota"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setRouteToDelete(route)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded"
                              title="Excluir rota"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Single Route Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={routeToDelete !== null}
        title="Excluir Rota"
        message="Tem certeza que deseja excluir esta rota? Os dados serão removidos permanentemente e todas as métricas de qualidade serão recalculadas em tempo real."
        itemName={
          routeToDelete
            ? `${routeToDelete.routeNumber} - ${routeToDelete.routeName} (${routeToDelete.date.split('-').reverse().join('/')})`
            : undefined
        }
        onConfirm={async () => {
          if (routeToDelete) {
            await onDeleteRoute(routeToDelete.id);
            setRouteToDelete(null);
          }
        }}
        onCancel={() => setRouteToDelete(null)}
      />

      {/* Delete ALL Routes Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteAllModal}
        title="Excluir TODAS as Rotas"
        message="Atenção: Esta ação removerá definitivamente TODAS as rotas do banco de dados na nuvem. A base ficará zerada e NUNCA mais será recarregada automaticamente."
        itemName={`${routes.length} rotas serão excluídas permanentemente`}
        onConfirm={async () => {
          if (onDeleteAllRoutes) {
            await onDeleteAllRoutes();
            setShowDeleteAllModal(false);
          }
        }}
        onCancel={() => setShowDeleteAllModal(false)}
      />
    </div>
  );
};
