import React, { useState } from 'react';
import {
  Users,
  Truck,
  PlusCircle,
  Phone,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Edit2,
  Trash2,
  Award,
  Layers,
  Search,
} from 'lucide-react';
import {
  ProviderName,
  RouteRecord,
  Driver,
  CONTRACTUAL_GOAL,
  getQualityClassification,
} from '../types.ts';
import {
  computeAggregateMetrics,
  computeDriverRankings,
} from '../utils/analytics.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';

interface ProviderViewProps {
  providerName: ProviderName;
  routes: RouteRecord[];
  drivers: Driver[];
  isAdmin: boolean;
  onOpenDriverModal: (driver?: Driver) => void;
  onDeleteDriver: (driverId: string) => void;
  onOpenRouteModal: (route?: RouteRecord) => void;
  onDeleteRoute: (routeId: string) => void;
}

export const ProviderView: React.FC<ProviderViewProps> = ({
  providerName,
  routes,
  drivers,
  isAdmin,
  onOpenDriverModal,
  onDeleteDriver,
  onOpenRouteModal,
  onDeleteRoute,
}) => {
  const [driverSearch, setDriverSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'drivers' | 'routes'>('drivers');
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [routeToDelete, setRouteToDelete] = useState<RouteRecord | null>(null);

  // Filter routes for this provider
  const providerRoutes = React.useMemo(
    () => routes.filter((r) => r.provider === providerName),
    [routes, providerName]
  );

  // Filter drivers for this provider
  const providerDrivers = React.useMemo(
    () => drivers.filter((d) => d.provider === providerName),
    [drivers, providerName]
  );

  // Aggregate metrics
  const metrics = React.useMemo(
    () => computeAggregateMetrics(providerRoutes),
    [providerRoutes]
  );

  // Driver rankings for this provider
  const driverRankings = React.useMemo(
    () => computeDriverRankings(providerRoutes),
    [providerRoutes]
  );

  // Calculate individual stats per driver
  const driverStatsMap = React.useMemo(() => {
    const map = new Map<string, { quality: number; routes: number; packages: number; incidences: number }>();
    driverRankings.forEach((dr) => {
      map.set(dr.label.toLowerCase().trim(), {
        quality: dr.quality,
        routes: dr.totalRoutes,
        packages: dr.totalPackages,
        incidences: dr.totalIncidences,
      });
    });
    return map;
  }, [driverRankings]);

  const filteredDrivers = providerDrivers.filter(
    (d) =>
      d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
      (d.phone && d.phone.includes(driverSearch)) ||
      (d.licensePlate && d.licensePlate.toLowerCase().includes(driverSearch.toLowerCase()))
  );

  const isOscar = providerName === 'Oscar';

  return (
    <div className="space-y-6">
      {/* Provider Hero Card */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div
          className={`h-3 w-full ${isOscar ? 'bg-[#0057B8]' : 'bg-[#FFD100]'}`}
        />
        <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-2xl shadow-inner ${
                isOscar
                  ? 'bg-[#0057B8] text-white'
                  : 'bg-[#FFD100] text-[#002B5C] border border-amber-300'
              }`}
            >
              {providerName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-[#002B5C] tracking-tight">
                  Painel do Provedor: {providerName}
                </h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {providerDrivers.length} Motoristas Cadastrados
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Acompanhamento individual de qualidade, motoristas alocados e rotas operadas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {isAdmin && (
              <button
                onClick={() => onOpenDriverModal()}
                className="flex items-center gap-1.5 bg-[#0057B8] hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-3 py-2 rounded-lg shadow-xs transition"
              >
                <PlusCircle className="w-4 h-4 text-[#FFD100]" />
                Cadastrar Motorista
              </button>
            )}
          </div>
        </div>

        {/* Provider KPI Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-5 border-t border-slate-100 bg-slate-50/70 p-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 gap-3 sm:gap-0">
          <div className="sm:px-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Qualidade Geral
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-2xl font-extrabold ${
                  metrics.classification === 'VERDE'
                    ? 'text-emerald-600'
                    : metrics.classification === 'AMARELO'
                    ? 'text-amber-500'
                    : 'text-red-600'
                }`}
              >
                {metrics.qualityPercentage.toFixed(2)}%
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  metrics.classification === 'VERDE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : metrics.classification === 'AMARELO'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {metrics.classification}
              </span>
            </div>
            <span className="text-[10px] text-slate-500">
              Meta: {CONTRACTUAL_GOAL}% ({metrics.deltaToGoal >= 0 ? '+' : ''}
              {metrics.deltaToGoal}%)
            </span>
          </div>

          <div className="sm:px-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total de Rotas
            </span>
            <div className="text-2xl font-extrabold text-slate-800 mt-1">
              {metrics.totalRoutes}
            </div>
            <span className="text-[10px] text-slate-500">rotas registradas</span>
          </div>

          <div className="sm:px-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Pacotes Entregues
            </span>
            <div className="text-2xl font-extrabold text-slate-800 mt-1">
              {metrics.totalPackages.toLocaleString('pt-BR')}
            </div>
            <span className="text-[10px] text-slate-500">
              {metrics.totalVolumes.toLocaleString('pt-BR')} volumes
            </span>
          </div>

          <div className="sm:px-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Incidências
            </span>
            <div className="text-2xl font-extrabold text-red-600 mt-1">
              {metrics.totalIncidences}
            </div>
            <span className="text-[10px] text-slate-500">
              Taxa:{' '}
              {metrics.totalPackages > 0
                ? ((metrics.totalIncidences / metrics.totalPackages) * 100).toFixed(2)
                : 0}
              %
            </span>
          </div>

          <div className="sm:px-4 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Motoristas Ativos
            </span>
            <div className="text-2xl font-extrabold text-[#0057B8] mt-1">
              {providerDrivers.filter((d) => d.status === 'active').length} / {providerDrivers.length}
            </div>
            <span className="text-[10px] text-slate-500">em operação</span>
          </div>
        </div>
      </div>

      {/* Sub Tabs: Motoristas vs Rotas do Provedor */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('drivers')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition ${
            activeTab === 'drivers'
              ? 'border-[#0057B8] text-[#0057B8]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Quadro de Motoristas ({providerDrivers.length})
        </button>

        <button
          onClick={() => setActiveTab('routes')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition ${
            activeTab === 'routes'
              ? 'border-[#0057B8] text-[#0057B8]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          Rotas Operadas ({providerRoutes.length})
        </button>
      </div>

      {/* Tab 1: Motoristas */}
      {activeTab === 'drivers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
                placeholder="Buscar motorista, telefone ou placa..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              />
            </div>

            <div className="text-xs text-slate-500">
              Exibindo <strong>{filteredDrivers.length}</strong> motorista(s) de {providerName}
            </div>
          </div>

          {filteredDrivers.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
              Nenhum motorista encontrado.
              {isAdmin && (
                <div className="mt-3">
                  <button
                    onClick={() => onOpenDriverModal()}
                    className="text-xs font-bold text-[#0057B8] hover:underline"
                  >
                    + Cadastrar o primeiro motorista para {providerName}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDrivers.map((driver) => {
                const stats = driverStatsMap.get(driver.name.toLowerCase().trim());
                const quality = stats?.quality ?? 100;
                const classif = getQualityClassification(quality);
                const hasRoutes = !!stats && stats.routes > 0;

                return (
                  <div
                    key={driver.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between hover:border-slate-300 transition"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            {driver.name}
                            <span
                              className={`w-2 h-2 rounded-full ${
                                driver.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                              title={driver.status === 'active' ? 'Ativo' : 'Inativo'}
                            />
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {driver.vehicleType || 'Veículo Padrão'} &bull;{' '}
                            {driver.licensePlate || 'Sem placa'}
                          </div>
                        </div>

                        {/* Individual Quality Badge */}
                        <div className="text-right">
                          <span
                            className={`text-sm font-extrabold px-2 py-0.5 rounded ${
                              !hasRoutes
                                ? 'bg-slate-100 text-slate-600'
                                : classif === 'VERDE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : classif === 'AMARELO'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {hasRoutes ? `${quality.toFixed(1)}%` : 'Novo'}
                          </span>
                        </div>
                      </div>

                      {driver.phone && (
                        <div className="mt-2 text-xs text-slate-600 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{driver.phone}</span>
                        </div>
                      )}

                      {/* Performance metrics */}
                      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-[11px]">
                        <div className="bg-slate-50 p-1.5 rounded">
                          <span className="text-slate-400 block text-[9px]">Rotas</span>
                          <span className="font-bold text-slate-800">
                            {stats?.routes ?? 0}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded">
                          <span className="text-slate-400 block text-[9px]">Pacotes</span>
                          <span className="font-bold text-slate-800">
                            {stats?.packages ?? 0}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded">
                          <span className="text-slate-400 block text-[9px]">Incidências</span>
                          <span className="font-bold text-red-600">
                            {stats?.incidences ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions for Admin */}
                    {isAdmin && (
                      <div className="mt-4 pt-2 border-t border-slate-100 flex justify-end gap-2 text-xs">
                        <button
                          onClick={() => onOpenDriverModal(driver)}
                          className="px-2 py-1 text-slate-600 hover:text-[#0057B8] hover:bg-slate-50 rounded flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => setDriverToDelete(driver)}
                          className="px-2 py-1 text-red-600 hover:bg-red-50 rounded flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Rotas do Provedor */}
      {activeTab === 'routes' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">
              Histórico de Rotas - Provedor {providerName}
            </h3>
            {isAdmin && (
              <button
                onClick={() => onOpenRouteModal()}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded shadow-xs"
              >
                + Nova Rota para {providerName}
              </button>
            )}
          </div>

          {providerRoutes.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Nenhuma rota registrada para {providerName}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Motorista</th>
                    <th className="px-4 py-3">Rota / Nº</th>
                    <th className="px-4 py-3">Localidade</th>
                    <th className="px-4 py-3 text-right">Volumes</th>
                    <th className="px-4 py-3 text-right">Pacotes</th>
                    <th className="px-4 py-3 text-right">Incidências</th>
                    <th className="px-4 py-3 text-right">Qualidade</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    {isAdmin && <th className="px-4 py-3 text-center">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {providerRoutes.map((route) => {
                    const classif = getQualityClassification(route.quality);
                    return (
                      <tr key={route.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                          {route.date.split('-').reverse().join('/')}
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
                        <td className="px-4 py-2.5 text-right font-semibold">
                          {route.volumes}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold">
                          {route.packages}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-red-600">
                          {route.incidences}
                        </td>
                        <td className="px-4 py-2.5 text-right font-extrabold text-sm">
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
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => onOpenRouteModal(route)}
                                className="p-1 text-slate-500 hover:text-[#0057B8] rounded"
                                title="Editar"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setRouteToDelete(route)}
                                className="p-1 text-slate-500 hover:text-red-600 rounded"
                                title="Excluir"
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
      )}

      {/* Driver Deletion Confirmation */}
      <ConfirmDeleteModal
        isOpen={driverToDelete !== null}
        title="Excluir Motorista"
        message={`Tem certeza que deseja excluir o cadastro deste motorista de ${providerName}?`}
        itemName={driverToDelete ? `${driverToDelete.name} (${driverToDelete.vehicleType || 'Sem veículo'} - ${driverToDelete.licensePlate || 'Sem placa'})` : undefined}
        onConfirm={async () => {
          if (driverToDelete) {
            await onDeleteDriver(driverToDelete.id);
            setDriverToDelete(null);
          }
        }}
        onCancel={() => setDriverToDelete(null)}
      />

      {/* Route Deletion Confirmation */}
      <ConfirmDeleteModal
        isOpen={routeToDelete !== null}
        title="Excluir Rota"
        message="Tem certeza que deseja excluir esta rota? Os dados serão removidos permanentemente da nuvem."
        itemName={routeToDelete ? `${routeToDelete.routeNumber} - ${routeToDelete.routeName} (${routeToDelete.date.split('-').reverse().join('/')})` : undefined}
        onConfirm={async () => {
          if (routeToDelete) {
            await onDeleteRoute(routeToDelete.id);
            setRouteToDelete(null);
          }
        }}
        onCancel={() => setRouteToDelete(null)}
      />
    </div>
  );
};
