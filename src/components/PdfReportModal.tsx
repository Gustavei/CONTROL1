import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  X,
  Calendar,
  Users,
  TrendingUp,
  Download,
  AlertCircle,
  Truck,
  Gauge,
  Fuel,
  Wrench,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import {
  RouteRecord,
  Driver,
  CONTRACTUAL_GOAL,
  Vehicle,
  MileageLog,
  FuelLog,
  MaintenanceLog,
} from '../types.ts';
import {
  computeAggregateMetrics,
  computeDriverRankings,
  computeRouteRankings,
  computeDayRankings,
} from '../utils/analytics.ts';
import {
  generatePdfReport,
  generateFleetPdfReport,
  ReportType,
} from '../services/pdfReportService.ts';

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: RouteRecord[];
  drivers: Driver[];
  vehicles?: Vehicle[];
  mileageLogs?: MileageLog[];
  fuelLogs?: FuelLog[];
  maintenanceLogs?: MaintenanceLog[];
  initialCategory?: 'fleet' | 'routes';
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  onClose,
  routes,
  drivers,
  vehicles = [],
  mileageLogs = [],
  fuelLogs = [],
  maintenanceLogs = [],
  initialCategory = 'fleet',
}) => {
  const [category, setCategory] = useState<'fleet' | 'routes'>(initialCategory);
  
  // Routes report states
  const [routeReportType, setRouteReportType] = useState<ReportType>('comparative');
  const [selectedDate, setSelectedDate] = useState<string>(
    routes.length > 0 ? routes[0].date : new Date().toISOString().split('T')[0]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );

  // Fleet report states
  const [fleetReportType, setFleetReportType] = useState<ReportType>('fleet_complete');
  const [fleetProvider, setFleetProvider] = useState<'all' | 'Oscar' | 'Tiago'>('all');
  const [minEfficiencyThreshold, setMinEfficiencyThreshold] = useState<number>(9.5);
  const [fleetPeriodLabel, setFleetPeriodLabel] = useState<string>('Histórico Consolidado 2026');

  const [isGenerating, setIsGenerating] = useState(false);

  // Sync initial category when modal opens or initialCategory changes
  useEffect(() => {
    if (isOpen && initialCategory) {
      setCategory(initialCategory);
    }
  }, [isOpen, initialCategory]);

  if (!isOpen) return null;

  // Filter routes based on chosen route report type
  const targetRoutes = (() => {
    if (routeReportType === 'daily') {
      return routes.filter((r) => r.date === selectedDate);
    }
    if (routeReportType === 'weekly') {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 7);
      const startStr = d.toISOString().split('T')[0];
      return routes.filter((r) => r.date >= startStr && r.date <= selectedDate);
    }
    if (routeReportType === 'monthly') {
      return routes.filter((r) => r.date.startsWith(selectedMonth));
    }
    if (routeReportType === 'provider_oscar') {
      return routes.filter((r) => r.provider === 'Oscar');
    }
    if (routeReportType === 'provider_tiago') {
      return routes.filter((r) => r.provider === 'Tiago');
    }
    return routes; // comparative
  })();

  const globalMetrics = computeAggregateMetrics(targetRoutes);
  const oscarRoutes = targetRoutes.filter((r) => r.provider === 'Oscar');
  const oscarMetrics = computeAggregateMetrics(oscarRoutes);
  const tiagoRoutes = targetRoutes.filter((r) => r.provider === 'Tiago');
  const tiagoMetrics = computeAggregateMetrics(tiagoRoutes);

  const driverRanks = computeDriverRankings(targetRoutes);
  const routeRanks = computeRouteRankings(targetRoutes);
  const dayRanks = computeDayRankings(targetRoutes);

  // Filter fleet data for preview based on fleet provider
  const filteredVehicles = fleetProvider === 'all'
    ? vehicles
    : vehicles.filter((v) => v.provider === fleetProvider);

  const filteredMileage = fleetProvider === 'all'
    ? mileageLogs
    : mileageLogs.filter((m) => m.provider === fleetProvider);

  const filteredFuel = fleetProvider === 'all'
    ? fuelLogs
    : fuelLogs.filter((f) => f.provider === fleetProvider);

  const totalFleetKm = filteredMileage.reduce((acc, m) => acc + (m.totalKm || 0), 0);
  const totalFuelValue = filteredFuel.reduce((acc, f) => acc + (f.totalCost || 0), 0);
  const totalLiters = filteredFuel.reduce((acc, f) => acc + (f.liters || 0), 0);
  const fuelWithKmL = filteredFuel.filter((f) => f.fuelEfficiencyKmL && f.fuelEfficiencyKmL > 0);
  const avgFleetKmL = fuelWithKmL.length > 0
    ? (fuelWithKmL.reduce((acc, f) => acc + (f.fuelEfficiencyKmL || 0), 0) / fuelWithKmL.length).toFixed(1)
    : (totalLiters > 0 && totalFleetKm > 0 ? (totalFleetKm / totalLiters).toFixed(1) : '-');

  // Identify vehicles with low efficiency below threshold
  const vehiclesBelowThreshold = filteredVehicles.filter((v) => {
    const vFuels = filteredFuel.filter((f) => f.vehiclePlate.toUpperCase() === v.plate.toUpperCase() && f.fuelEfficiencyKmL && f.fuelEfficiencyKmL > 0);
    if (vFuels.length === 0) return false;
    const avg = vFuels.reduce((sum, f) => sum + (f.fuelEfficiencyKmL || 0), 0) / vFuels.length;
    return avg < minEfficiencyThreshold;
  });

  const handleDownloadRoutesReport = () => {
    let title = 'Relatório Geral Comparativo de Qualidade';
    let periodLabel = 'Todo o Período';

    if (routeReportType === 'daily') {
      title = `Relatório Diário de Qualidade - ${selectedDate.split('-').reverse().join('/')}`;
      periodLabel = selectedDate.split('-').reverse().join('/');
    } else if (routeReportType === 'weekly') {
      title = 'Relatório Semanal de Qualidade Operacional';
      periodLabel = `Semana encerrada em ${selectedDate.split('-').reverse().join('/')}`;
    } else if (routeReportType === 'monthly') {
      const [year, month] = selectedMonth.split('-');
      title = `Relatório Mensal de Qualidade - ${month}/${year}`;
      periodLabel = `Mês ${month}/${year}`;
    } else if (routeReportType === 'provider_oscar') {
      title = 'Relatório de Qualidade & Performance: Provedor Oscar';
      periodLabel = 'Operação Completa Provedor Oscar';
    } else if (routeReportType === 'provider_tiago') {
      title = 'Relatório de Qualidade & Performance: Provedor Tiago';
      periodLabel = 'Operação Completa Provedor Tiago';
    }

    generatePdfReport({
      type: routeReportType,
      title,
      periodLabel,
      routes: targetRoutes,
      globalMetrics,
      oscarMetrics,
      tiagoMetrics,
      bestDriver: driverRanks[0]
        ? {
            name: driverRanks[0].label,
            provider: driverRanks[0].subLabel || '',
            quality: driverRanks[0].quality,
            packages: driverRanks[0].totalPackages,
          }
        : undefined,
      worstDriver:
        driverRanks.length > 1
          ? {
              name: driverRanks[driverRanks.length - 1].label,
              provider: driverRanks[driverRanks.length - 1].subLabel || '',
              quality: driverRanks[driverRanks.length - 1].quality,
              packages: driverRanks[driverRanks.length - 1].totalPackages,
            }
          : undefined,
      bestRoute: routeRanks[0]
        ? {
            name: routeRanks[0].label,
            number: routeRanks[0].label.split(' - ')[0] || '',
            quality: routeRanks[0].quality,
          }
        : undefined,
      worstRoute:
        routeRanks.length > 1
          ? {
              name: routeRanks[routeRanks.length - 1].label,
              number: routeRanks[routeRanks.length - 1].label.split(' - ')[0] || '',
              quality: routeRanks[routeRanks.length - 1].quality,
            }
          : undefined,
      bestDay: dayRanks[0]
        ? { date: dayRanks[0].label, quality: dayRanks[0].quality }
        : undefined,
      worstDay:
        dayRanks.length > 1
          ? {
              date: dayRanks[dayRanks.length - 1].label,
              quality: dayRanks[dayRanks.length - 1].quality,
            }
          : undefined,
    });
  };

  const handleDownloadFleetReport = () => {
    let title = 'Relatório Completo de Gestão de Frota';
    if (fleetReportType === 'fleet_efficiency') {
      title = `Auditoria de Eficiência & Consumo de Furgonetas (Meta: ${minEfficiencyThreshold} KM/L)`;
    } else if (fleetReportType === 'fleet_mileage') {
      title = 'Controle Diário de Quilometragem & Rotas de Furgonetas';
    } else if (fleetReportType === 'fleet_fuel') {
      title = 'Relatório Analítico de Abastecimentos & Custos de Combustível';
    }

    generateFleetPdfReport({
      type: fleetReportType,
      title,
      periodLabel: fleetPeriodLabel || 'Histórico Consolidado',
      provider: fleetProvider,
      vehicles: filteredVehicles,
      mileageLogs: filteredMileage,
      fuelLogs: filteredFuel,
      maintenanceLogs: fleetProvider === 'all' ? maintenanceLogs : maintenanceLogs.filter((m) => m.provider === fleetProvider),
      minEfficiencyThreshold,
    });
  };

  const handleDownload = () => {
    setIsGenerating(true);
    try {
      if (category === 'fleet') {
        handleDownloadFleetReport();
      } else {
        handleDownloadRoutesReport();
      }
    } catch (e) {
      console.error('Error generating PDF:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const fleetReportOptions = [
    {
      id: 'fleet_complete' as ReportType,
      title: 'Relatório Completo da Frota',
      desc: 'Visão executiva total: furgonetas, odômetros atuais, médias diárias, abastecimentos e manutenções',
      icon: Truck,
      tag: 'Geral & Diretoria',
    },
    {
      id: 'fleet_efficiency' as ReportType,
      title: 'Auditoria de Eficiência & Consumo',
      desc: 'Médias em KM/L, alertas visuais color-coded de furgonetas abaixo do limite aceitável e ranking de consumo',
      icon: TrendingUp,
      tag: 'Alertas & Economia',
    },
    {
      id: 'fleet_mileage' as ReportType,
      title: 'Controle de Quilometragem Diária',
      desc: 'Registro completo de KM inicial, KM final, rotas associadas, condutores e médias de rodagem diária',
      icon: Gauge,
      tag: 'Operacional Diário',
    },
    {
      id: 'fleet_fuel' as ReportType,
      title: 'Abastecimentos & Custos (R$)',
      desc: 'Histórico de abastecimentos com preços/L, valores totais, postos, odômetro do tanque e KM rodados',
      icon: Fuel,
      tag: 'Financeiro',
    },
  ];

  const routeReportOptions = [
    {
      id: 'comparative' as ReportType,
      title: 'Comparativo Geral',
      desc: 'Visão executiva integrada com Oscar vs Tiago e auditoria de metas contratuais',
      icon: TrendingUp,
    },
    {
      id: 'daily' as ReportType,
      title: 'Relatório Diário',
      desc: 'Fechamento do dia operacional por rotas e motoristas',
      icon: Calendar,
    },
    {
      id: 'weekly' as ReportType,
      title: 'Relatório Semanal',
      desc: 'Consolidado dos últimos 7 dias com evolução da qualidade',
      icon: Calendar,
    },
    {
      id: 'monthly' as ReportType,
      title: 'Relatório Mensal',
      desc: 'Auditoria mensal completa com metas e indicadores contratuais',
      icon: Calendar,
    },
    {
      id: 'provider_oscar' as ReportType,
      title: 'Por Provedor: Oscar',
      desc: 'Dossiê exclusivo das rotas e motoristas da equipe Oscar',
      icon: Users,
    },
    {
      id: 'provider_tiago' as ReportType,
      title: 'Por Provedor: Tiago',
      desc: 'Dossiê exclusivo das rotas e motoristas da equipe Tiago',
      icon: Users,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-[#0057B8] text-white p-5 flex items-center justify-between border-b-4 border-[#FFD100]">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFD100] text-[#002B5C] font-black p-2 rounded-lg shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-white">
                  Gerador de Relatórios Oficiais PDF
                </h3>
                <span className="bg-blue-800 text-[#FFD100] text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-600 uppercase">
                  GLS Padrão
                </span>
              </div>
              <p className="text-xs text-blue-100">
                Emissão instantânea com dados consolidados, KPIs e gráficos prontos para auditoria
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white p-1 rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Switcher Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 pt-3 flex gap-2">
          <button
            onClick={() => setCategory('fleet')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-t border-x ${
              category === 'fleet'
                ? 'bg-white text-[#0057B8] border-slate-200 border-b-white -mb-px shadow-xs'
                : 'bg-transparent text-slate-500 hover:text-slate-800 border-transparent'
            }`}
          >
            <Truck className="w-4 h-4 text-[#0057B8]" />
            <span>Controle de Frota & Furgonetas</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-[#0057B8] font-black">
              {vehicles.length}
            </span>
          </button>

          <button
            onClick={() => setCategory('routes')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-t border-x ${
              category === 'routes'
                ? 'bg-white text-[#0057B8] border-slate-200 border-b-white -mb-px shadow-xs'
                : 'bg-transparent text-slate-500 hover:text-slate-800 border-transparent'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Auditoria de Rotas & Qualidade</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-black">
              {routes.length}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {category === 'fleet' ? (
            /* FLEET REPORT CONTROLS */
            <>
              {/* Fleet Report Types */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2 flex items-center justify-between">
                  <span>1. Selecione o Tipo de Relatório da Frota:</span>
                  <span className="text-[10px] font-medium text-slate-400">4 formatos disponíveis</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {fleetReportOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = fleetReportType === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setFleetReportType(opt.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#0057B8] bg-blue-50/60 shadow-xs ring-1 ring-[#0057B8]'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                              isSelected
                                ? 'bg-[#0057B8] text-[#FFD100]'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900">
                                {opt.title}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                              {opt.desc}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            {opt.tag}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-[#0057B8] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Selecionado
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fleet Parameters: Provider & Efficiency Threshold */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-[#0057B8]" />
                  <span>2. Parâmetros e Filtros do Relatório:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Provider filter */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Filtrar Provedor:
                    </label>
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300">
                      {(['all', 'Oscar', 'Tiago'] as const).map((prov) => (
                        <button
                          key={prov}
                          type="button"
                          onClick={() => setFleetProvider(prov)}
                          className={`flex-1 py-1 text-[11px] font-bold rounded transition ${
                            fleetProvider === prov
                              ? 'bg-[#0057B8] text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {prov === 'all' ? 'Ambos' : prov}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Efficiency Threshold */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Limite de Eficiência (Alerta):
                    </label>
                    <select
                      value={minEfficiencyThreshold}
                      onChange={(e) => setMinEfficiencyThreshold(parseFloat(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
                    >
                      <option value={8.0}>8.0 KM/L (Tolerância Alta)</option>
                      <option value={8.5}>8.5 KM/L</option>
                      <option value={9.0}>9.0 KM/L</option>
                      <option value={9.5}>9.5 KM/L (Padrão Recomendado)</option>
                      <option value={10.0}>10.0 KM/L</option>
                      <option value={10.5}>10.5 KM/L</option>
                      <option value={11.0}>11.0 KM/L</option>
                      <option value={11.5}>11.5 KM/L (Meta Rigorosa)</option>
                    </select>
                  </div>

                  {/* Period label */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Identificador de Período:
                    </label>
                    <input
                      type="text"
                      value={fleetPeriodLabel}
                      onChange={(e) => setFleetPeriodLabel(e.target.value)}
                      placeholder="Ex: Mês Atual / 1º Semestre"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
                    />
                  </div>
                </div>
              </div>

              {/* Fleet Preview Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Pré-visualização dos Dados da Frota:</span>
                  <span className="text-[11px] font-semibold text-[#0057B8] bg-blue-100 px-2 py-0.5 rounded-full">
                    {filteredVehicles.length} furgoneta(s) selecionada(s)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
                    <span className="text-[10px] text-slate-400 block font-bold">KM TOTAL RODADO</span>
                    <span className="text-sm font-black text-slate-800">
                      {totalFleetKm.toLocaleString('pt-BR')} KM
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
                    <span className="text-[10px] text-slate-400 block font-bold">COMBUSTÍVEL TOTAL</span>
                    <span className="text-sm font-bold text-amber-700">
                      R$ {totalFuelValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
                    <span className="text-[10px] text-slate-400 block font-bold">MÉDIA CONSUMO</span>
                    <span className="text-sm font-black text-emerald-600">
                      {avgFleetKmL} {avgFleetKmL !== '-' ? 'KM/L' : ''}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
                    <span className="text-[10px] text-slate-400 block font-bold">MANUTENÇÕES</span>
                    <span className="text-sm font-bold text-indigo-700">
                      {maintenanceLogs.length} ordens
                    </span>
                  </div>
                </div>

                {/* Efficiency Alert Status */}
                {vehiclesBelowThreshold.length > 0 ? (
                  <div className="text-xs bg-red-50 text-red-800 border border-red-200 p-2.5 rounded-lg font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>
                      <strong>Alerta de Eficiência:</strong> {vehiclesBelowThreshold.length} furgoneta(s) (
                      {vehiclesBelowThreshold.map((v) => v.plate).join(', ')}) com média abaixo de {minEfficiencyThreshold} KM/L. O relatório incluirá destaque visual em vermelho.
                    </span>
                  </div>
                ) : (
                  <div className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 p-2 rounded-lg font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Todas as furgonetas com dados registrados estão operando dentro do limite de {minEfficiencyThreshold} KM/L.
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ROUTES & QUALITY REPORT CONTROLS */
            <>
              {/* Select Route Report Type Grid */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                  1. Selecione o Tipo de Relatório de Qualidade:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {routeReportOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = routeReportType === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setRouteReportType(opt.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                          isSelected
                            ? 'border-[#0057B8] bg-blue-50/60 shadow-xs ring-1 ring-[#0057B8]'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg mt-0.5 ${
                            isSelected
                              ? 'bg-[#0057B8] text-[#FFD100]'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">
                            {opt.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            {opt.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Date Parameter if applicable */}
              {(routeReportType === 'daily' || routeReportType === 'weekly') && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Data de Referência:
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8] bg-white"
                  />
                </div>
              )}

              {routeReportType === 'monthly' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Mês de Referência (YYYY-MM):
                  </label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8] bg-white"
                  />
                </div>
              )}

              {/* Report Data Preview Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Pré-visualização do Relatório:</span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {targetRoutes.length} rotas selecionadas
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold">QUALIDADE</span>
                    <span
                      className={`text-base font-black ${
                        globalMetrics.qualityPercentage >= CONTRACTUAL_GOAL
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {globalMetrics.qualityPercentage.toFixed(2)}%
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold">SAIU (TOTAL)</span>
                    <span className="text-base font-bold text-slate-800">
                      {globalMetrics.totalPackages.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-emerald-600 block font-bold">ENTREGOU</span>
                    <span className="text-base font-bold text-emerald-700">
                      {(globalMetrics.totalPackages - globalMetrics.totalIncidences).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold">INCIDÊNCIAS</span>
                    <span className="text-base font-bold text-red-600">
                      {globalMetrics.totalIncidences}
                    </span>
                  </div>
                </div>

                {targetRoutes.length === 0 && (
                  <div className="text-xs text-amber-600 font-medium flex items-center gap-1.5 pt-1">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Aviso: Não há rotas no período selecionado. O relatório sairá sem dados operacionais.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <div className="text-xs text-slate-500 hidden sm:block">
            Formato: <strong>PDF Oficial Vetorial (jsPDF + autoTable)</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold bg-[#0057B8] hover:bg-blue-700 text-white rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-[#FFD100]" />
              {isGenerating ? 'Gerando Documento...' : category === 'fleet' ? 'Baixar Relatório da Frota (PDF)' : 'Baixar Relatório de Qualidade (PDF)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
