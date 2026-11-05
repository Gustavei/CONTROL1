import React, { useState, useMemo } from 'react';
import {
  Gauge,
  Fuel,
  Wrench,
  DollarSign,
  TrendingUp,
  PlusCircle,
  Truck,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  FileSpreadsheet,
  Edit2,
  Trash2,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Activity,
  ArrowRight,
  Zap,
} from 'lucide-react';
import {
  FuelLog,
  MaintenanceLog,
  MileageLog,
  Driver,
  Vehicle,
  ProviderName,
} from '../types.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';

interface FleetViewProps {
  fuelLogs: FuelLog[];
  maintenanceLogs: MaintenanceLog[];
  mileageLogs: MileageLog[];
  drivers: Driver[];
  vehicles: Vehicle[];
  isAdmin: boolean;
  onOpenFuelModal: (log?: FuelLog, preselectedVehicleId?: string) => void;
  onDeleteFuelLog: (id: string) => void;
  onOpenMaintenanceModal: (log?: MaintenanceLog) => void;
  onDeleteMaintenanceLog: (id: string) => void;
  onOpenMileageModal: (log?: MileageLog, preselectedVehicleId?: string) => void;
  onDeleteMileageLog: (id: string) => void;
  onOpenVehicleModal: (vehicle?: Vehicle) => void;
  onDeleteVehicle: (id: string) => void;
}

type FleetSubTab = 'overview' | 'vehicles' | 'mileage' | 'fuel' | 'maintenance';

export const FleetView: React.FC<FleetViewProps> = ({
  fuelLogs,
  maintenanceLogs,
  mileageLogs,
  drivers,
  vehicles,
  isAdmin,
  onOpenFuelModal,
  onDeleteFuelLog,
  onOpenMaintenanceModal,
  onDeleteMaintenanceLog,
  onOpenMileageModal,
  onDeleteMileageLog,
  onOpenVehicleModal,
  onDeleteVehicle,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<FleetSubTab>('overview');
  const [providerFilter, setProviderFilter] = useState<'all' | ProviderName>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals for delete confirmation
  const [fuelToDelete, setFuelToDelete] = useState<FuelLog | null>(null);
  const [maintenanceToDelete, setMaintenanceToDelete] = useState<MaintenanceLog | null>(null);
  const [mileageToDelete, setMileageToDelete] = useState<MileageLog | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  // Efficiency threshold configuration (KM/L) & filter
  const [minEfficiencyThreshold, setMinEfficiencyThreshold] = useState<number>(10.0);
  const [filterOnlyInefficient, setFilterOnlyInefficient] = useState<boolean>(false);

  // Filtered datasets
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (providerFilter !== 'all' && v.provider !== providerFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          v.name.toLowerCase().includes(term) ||
          v.plate.toLowerCase().includes(term) ||
          v.model.toLowerCase().includes(term) ||
          (v.defaultDriverName && v.defaultDriverName.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [vehicles, providerFilter, searchTerm]);

  const filteredFuel = useMemo(() => {
    return fuelLogs.filter((f) => {
      if (providerFilter !== 'all' && f.provider !== providerFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          f.vehiclePlate.toLowerCase().includes(term) ||
          f.driverName.toLowerCase().includes(term) ||
          (f.stationName && f.stationName.toLowerCase().includes(term)) ||
          f.fuelType.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [fuelLogs, providerFilter, searchTerm]);

  const filteredMaintenance = useMemo(() => {
    return maintenanceLogs.filter((m) => {
      if (providerFilter !== 'all' && m.provider !== providerFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          m.vehiclePlate.toLowerCase().includes(term) ||
          m.description.toLowerCase().includes(term) ||
          m.category.toLowerCase().includes(term) ||
          m.workshop.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [maintenanceLogs, providerFilter, searchTerm]);

  // Per-Vehicle stats helper
  const getVehicleMetrics = (plate: string) => {
    const pUpper = plate.trim().toUpperCase();
    const vKmLogs = mileageLogs.filter((m) => m.vehiclePlate.trim().toUpperCase() === pUpper);
    const vFuelLogs = fuelLogs.filter((f) => f.vehiclePlate.trim().toUpperCase() === pUpper);
    const vMaintLogs = maintenanceLogs.filter((m) => m.vehiclePlate.trim().toUpperCase() === pUpper);

    const vTotalKm = vKmLogs.reduce((acc, curr) => acc + (Number(curr.totalKm) || 0), 0);
    const daysCount = vKmLogs.length;
    const avgDailyKm = daysCount > 0 ? Number((vTotalKm / daysCount).toFixed(1)) : 0;

    // Consumption average (KM/L) from fuel entries with distanceSinceLastFuel or total distance / liters
    let totalDistanceFuel = 0;
    let totalLitersFuel = 0;
    vFuelLogs.forEach((f) => {
      if (f.distanceSinceLastFuel && f.distanceSinceLastFuel > 0 && Number(f.liters) > 0) {
        totalDistanceFuel += f.distanceSinceLastFuel;
        totalLitersFuel += Number(f.liters);
      }
    });

    let avgConsumptionKmL: number | null = null;
    if (totalDistanceFuel > 0 && totalLitersFuel > 0) {
      avgConsumptionKmL = Number((totalDistanceFuel / totalLitersFuel).toFixed(2));
    } else if (vTotalKm > 0 && vFuelLogs.reduce((acc, c) => acc + Number(c.liters), 0) > 0) {
      avgConsumptionKmL = Number((vTotalKm / vFuelLogs.reduce((acc, c) => acc + Number(c.liters), 0)).toFixed(2));
    }

    const totalVehicleFuelCost = vFuelLogs.reduce((acc, c) => acc + (Number(c.totalCost) || 0), 0);
    const totalVehicleMaintCost = vMaintLogs.reduce((acc, c) => acc + (Number(c.cost) || 0), 0);
    const totalVehicleCost = totalVehicleFuelCost + totalVehicleMaintCost;
    const vehicleCostPerKm = vTotalKm > 0 ? Number((totalVehicleCost / vTotalKm).toFixed(2)) : 0;

    return {
      vTotalKm,
      daysCount,
      avgDailyKm,
      avgConsumptionKmL,
      totalVehicleCost,
      vehicleCostPerKm,
      fuelLogsCount: vFuelLogs.length,
      maintLogsCount: vMaintLogs.length,
    };
  };

  // Visual color coding and alert status helper
  type EfficiencyAlertStatus = 'critical' | 'warning' | 'optimal' | 'unknown';

  interface EfficiencyAlertInfo {
    efficiencyKmL: number | null;
    status: EfficiencyAlertStatus;
    label: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    rowClass: string;
    message: string;
  }

  const getEfficiencyAlertInfo = (plate: string): EfficiencyAlertInfo => {
    const metrics = getVehicleMetrics(plate);
    const eff = metrics.avgConsumptionKmL;

    if (eff === null || eff <= 0) {
      return {
        efficiencyKmL: null,
        status: 'unknown',
        label: 'Sem Dados',
        badgeBg: 'bg-slate-100',
        badgeText: 'text-slate-500',
        badgeBorder: 'border-slate-200',
        rowClass: 'border-l-4 border-l-slate-300 hover:bg-slate-50/70',
        message: 'Aguardando mais abastecimentos para cálculo de consumo.',
      };
    }

    // Critical: strictly below acceptable efficiency threshold
    if (eff < minEfficiencyThreshold) {
      return {
        efficiencyKmL: eff,
        status: 'critical',
        label: 'Abaixo do Limite',
        badgeBg: 'bg-red-50',
        badgeText: 'text-red-700',
        badgeBorder: 'border-red-300',
        rowClass: 'border-l-4 border-l-red-500 bg-red-50/30 hover:bg-red-50/70',
        message: `ALERTA CRÍTICO: Consumo de ${eff} KM/L está abaixo do limite aceitável de ${minEfficiencyThreshold} KM/L!`,
      };
    }

    // Warning: regular efficiency near limit
    if (eff < minEfficiencyThreshold + 1.2) {
      return {
        efficiencyKmL: eff,
        status: 'warning',
        label: 'Regular',
        badgeBg: 'bg-amber-50',
        badgeText: 'text-amber-800',
        badgeBorder: 'border-amber-300',
        rowClass: 'border-l-4 border-l-amber-400 bg-amber-50/20 hover:bg-amber-50/50',
        message: `Consumo regular (${eff} KM/L). Próximo da faixa limite aceitável (${minEfficiencyThreshold} KM/L).`,
      };
    }

    // Optimal: high efficiency
    return {
      efficiencyKmL: eff,
      status: 'optimal',
      label: 'Eficiente',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-700',
      badgeBorder: 'border-emerald-300',
      rowClass: 'border-l-4 border-l-emerald-500 hover:bg-emerald-50/30',
      message: `Consumo eficiente (${eff} KM/L). Acima do limite aceitável de ${minEfficiencyThreshold} KM/L.`,
    };
  };

  const filteredMileage = useMemo(() => {
    return mileageLogs.filter((k) => {
      if (providerFilter !== 'all' && k.provider !== providerFilter) return false;
      if (filterOnlyInefficient) {
        const alert = getEfficiencyAlertInfo(k.vehiclePlate);
        if (alert.status !== 'critical') return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          k.vehiclePlate.toLowerCase().includes(term) ||
          k.driverName.toLowerCase().includes(term) ||
          (k.routeNumber && k.routeNumber.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [mileageLogs, providerFilter, searchTerm, filterOnlyInefficient, minEfficiencyThreshold, fuelLogs]);

  // Critical alerts metrics
  const criticalMileageLogs = useMemo(() => {
    return mileageLogs.filter((k) => getEfficiencyAlertInfo(k.vehiclePlate).status === 'critical');
  }, [mileageLogs, minEfficiencyThreshold, fuelLogs]);

  const uniqueCriticalPlates = useMemo(() => {
    return Array.from(new Set(criticalMileageLogs.map((k) => k.vehiclePlate)));
  }, [criticalMileageLogs]);

  // Global calculations
  const totalKm = useMemo(() => {
    return filteredMileage.reduce((acc, curr) => acc + (Number(curr.totalKm) || 0), 0);
  }, [filteredMileage]);

  const totalFuelCost = useMemo(() => {
    return filteredFuel.reduce((acc, curr) => acc + (Number(curr.totalCost) || 0), 0);
  }, [filteredFuel]);

  const totalFuelLiters = useMemo(() => {
    return filteredFuel.reduce((acc, curr) => acc + (Number(curr.liters) || 0), 0);
  }, [filteredFuel]);

  const totalMaintenanceCost = useMemo(() => {
    return filteredMaintenance.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
  }, [filteredMaintenance]);

  const totalFleetCost = totalFuelCost + totalMaintenanceCost;

  // Efficiency metrics
  const avgKmLiter = totalFuelLiters > 0 && totalKm > 0 ? (totalKm / totalFuelLiters).toFixed(2) : '0.00';
  const costPerKm = totalKm > 0 ? (totalFleetCost / totalKm).toFixed(2) : '0.00';

  // Provider breakdowns
  const oscarFuel = fuelLogs.filter((f) => f.provider === 'Oscar').reduce((a, c) => a + (Number(c.totalCost) || 0), 0);
  const tiagoFuel = fuelLogs.filter((f) => f.provider === 'Tiago').reduce((a, c) => a + (Number(c.totalCost) || 0), 0);
  const oscarMaint = maintenanceLogs.filter((m) => m.provider === 'Oscar').reduce((a, c) => a + (Number(c.cost) || 0), 0);
  const tiagoMaint = maintenanceLogs.filter((m) => m.provider === 'Tiago').reduce((a, c) => a + (Number(c.cost) || 0), 0);
  const oscarKm = mileageLogs.filter((k) => k.provider === 'Oscar').reduce((a, c) => a + (Number(c.totalKm) || 0), 0);
  const tiagoKm = mileageLogs.filter((k) => k.provider === 'Tiago').reduce((a, c) => a + (Number(c.totalKm) || 0), 0);

  // Export Fleet Summary to CSV
  const exportFleetCsv = () => {
    const lines: string[] = [];
    lines.push('RELATÓRIO DE CONTROLE DE FROTA - GLS GESTÃO DE QUALIDADE');
    lines.push(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
    lines.push('');
    lines.push('--- CADASTRO DE FURGONETAS ---');
    lines.push('Nome;Placa;Modelo;Provedor;Motorista Titular;Odômetro Inicial;Odômetro Atual;Combustível;Status');
    vehicles.forEach((v) => {
      lines.push(`"${v.name}";"${v.plate}";"${v.model}";${v.provider};"${v.defaultDriverName || ''}";${v.initialOdometer};${v.currentOdometer};${v.fuelType};${v.status}`);
    });
    lines.push('');
    lines.push('--- ABASTECIMENTOS ---');
    lines.push('Data;Provedor;Motorista;Placa;Modelo;KM;KM Último;KM Tanque;Média KM/L;Custo R$/KM;Combustível;Litros;Preço/L;Total (R$);Posto;NF');
    filteredFuel.forEach((f) => {
      lines.push(`${f.date};${f.provider};"${f.driverName}";"${f.vehiclePlate}";"${f.vehicleModel || ''}";${f.odometerKm};${f.previousOdometerKm || ''};${f.distanceSinceLastFuel || ''};${f.fuelEfficiencyKmL || ''};${f.costPerKm || ''};${f.fuelType};${f.liters};${f.pricePerLiter};${f.totalCost};"${f.stationName || ''}";"${f.receiptNumber || ''}"`);
    });
    lines.push('');
    lines.push('--- MANUTENÇÃO & REPAROS ---');
    lines.push('Data;Provedor;Motorista;Placa;Odômetro;Tipo;Categoria;Descrição;Valor (R$);Oficina;Status');
    filteredMaintenance.forEach((m) => {
      lines.push(`${m.date};${m.provider};"${m.driverName || ''}";"${m.vehiclePlate}";${m.odometerKm};${m.type};"${m.category}";"${m.description.replace(/"/g, '""')}";${m.cost};"${m.workshop}";${m.status}`);
    });
    lines.push('');
    lines.push('--- QUILOMETRAGEM DIÁRIA ---');
    lines.push('Data;Provedor;Motorista;Placa;Rota;KM Inicial;KM Final;KM Total');
    filteredMileage.forEach((k) => {
      lines.push(`${k.date};${k.provider};"${k.driverName}";"${k.vehiclePlate}";"${k.routeNumber || ''}";${k.startKm};${k.endKm};${k.totalKm}`);
    });

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GLS_Controle_Frota_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Filter Banner */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#002B5C] flex items-center gap-2">
            <Gauge className="w-6 h-6 text-[#0057B8]" />
            Controle de Frota: Furgonetas, Quilometragem & Abastecimento
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre furgonetas, marque KM diário de saída/chegada e faça a média de consumo comparada ao último abastecimento
          </p>
        </div>

        {/* Action Buttons & Provider Filter */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Provider Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(['all', 'Oscar', 'Tiago'] as const).map((prov) => (
              <button
                key={prov}
                onClick={() => setProviderFilter(prov)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  providerFilter === prov
                    ? 'bg-[#0057B8] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {prov === 'all' ? 'Ambos' : prov}
              </button>
            ))}
          </div>

          <button
            onClick={exportFleetCsv}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-lg border border-slate-300 transition"
            title="Exportar dados da frota em CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onOpenVehicleModal()}
                className="flex items-center gap-1 bg-[#0057B8] hover:bg-blue-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-xs transition"
                title="Cadastrar Furgoneta"
              >
                <Truck className="w-3.5 h-3.5 text-[#FFD100]" />
                <span className="hidden sm:inline">+ Furgoneta</span>
              </button>
              <button
                onClick={() => onOpenMileageModal()}
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-xs transition"
                title="Marcar KM Diário"
              >
                <Gauge className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">+ Marcar KM</span>
              </button>
              <button
                onClick={() => onOpenFuelModal()}
                className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-xs transition"
                title="Novo Abastecimento"
              >
                <Fuel className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">+ Abastecer</span>
              </button>
              <button
                onClick={() => onOpenMaintenanceModal()}
                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-xs transition"
                title="Registrar Manutenção"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">+ Manutenção</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards: Frota Geral */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Furgonetas Ativas */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Furgonetas Cadastradas</span>
            <Truck className="w-4 h-4 text-[#0057B8]" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-black text-[#002B5C]">
              {filteredVehicles.length} <span className="text-xs font-bold text-slate-400">veículos</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {filteredVehicles.filter((v) => v.status === 'active').length} ativas em rota
            </div>
          </div>
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
            Oscar: {vehicles.filter((v) => v.provider === 'Oscar').length} | Tiago: {vehicles.filter((v) => v.provider === 'Tiago').length}
          </div>
        </div>

        {/* KM Total */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">KM Total Percorrido</span>
            <Gauge className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-black text-slate-900">
              {totalKm.toLocaleString('pt-BR')} <span className="text-xs font-bold text-slate-400">KM</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Oscar: {oscarKm.toLocaleString('pt-BR')} | Tiago: {tiagoKm.toLocaleString('pt-BR')}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
            {filteredMileage.length} dias de operação registrados
          </div>
        </div>

        {/* Combustível Total */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Gastos Combustível</span>
            <Fuel className="w-4 h-4 text-amber-500" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-black text-amber-600">
              R$ {totalFuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {totalFuelLiters.toFixed(1)} L abastecidos
            </div>
          </div>
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
            {filteredFuel.length} abastecimentos realizados
          </div>
        </div>

        {/* Média de Consumo KM/L */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Média Geral Consumo</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-black text-emerald-600">
              {avgKmLiter} <span className="text-xs font-bold text-slate-400">KM/L</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Eficiência média da frota
            </div>
          </div>
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
            Comparação com último abastecimento
          </div>
        </div>

        {/* Custo Total da Frota & R$/KM */}
        <div className="bg-[#002B5C] text-white p-4 rounded-xl shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-blue-200">
            <span className="text-[10px] font-bold uppercase tracking-wider">Custo Total Frota</span>
            <DollarSign className="w-4 h-4 text-[#FFD100]" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-black text-[#FFD100]">
              R$ {totalFleetCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-blue-200 font-semibold mt-0.5">
              R$ {costPerKm} / KM rodado
            </div>
          </div>
          <div className="text-[10px] text-blue-300 pt-1 border-t border-blue-900">
            Combustível + Manutenção
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 gap-2 shadow-xs overflow-x-auto">
        {[
          { id: 'overview' as FleetSubTab, label: 'Visão Geral & Indicadores', icon: BarChart3 },
          { id: 'vehicles' as FleetSubTab, label: `Furgonetas Cadastradas (${filteredVehicles.length})`, icon: Truck },
          { id: 'mileage' as FleetSubTab, label: `Quilometragem Diária (${filteredMileage.length})`, icon: Gauge },
          { id: 'fuel' as FleetSubTab, label: `Abastecimentos & Média (${filteredFuel.length})`, icon: Fuel },
          { id: 'maintenance' as FleetSubTab, label: `Manutenções (${filteredMaintenance.length})`, icon: Wrench },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition ${
                isActive
                  ? 'border-[#0057B8] text-[#0057B8]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search Bar for Records */}
      {activeSubTab !== 'overview' && (
        <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por furgoneta, placa, motorista ou rota..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
            />
          </div>
          <div className="text-xs text-slate-500 self-end sm:self-auto">
            Filtrando por: <strong>{providerFilter === 'all' ? 'Todos os Provedores' : `Provedor ${providerFilter}`}</strong>
          </div>
        </div>
      )}

      {/* SUB-TAB 1: Visão Geral & Indicadores */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Comparativo de Custos Oscar vs Tiago */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Oscar Side */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 font-bold text-base text-[#0057B8]">
                  <span className="w-3 h-3 rounded-full bg-[#0057B8]" />
                  PROVEDOR OSCAR - FROTA & CUSTOS
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#0057B8]">
                  {oscarKm.toLocaleString('pt-BR')} KM
                </span>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#0057B8]" />
                    Furgonetas Cadastradas:
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {vehicles.filter((v) => v.provider === 'Oscar').length} veículos
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Fuel className="w-4 h-4 text-amber-500" />
                    Combustível Total:
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    R$ {oscarFuel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-indigo-600" />
                    Manutenção & Peças:
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    R$ {oscarMaint.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center font-bold">
                  <span className="text-slate-700">Custo Total Oscar:</span>
                  <span className="text-base font-black text-[#0057B8]">
                    R$ {(oscarFuel + oscarMaint).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 text-slate-600 text-[11px] flex justify-between">
                  <span>Custo por KM Rodado:</span>
                  <span className="font-bold text-slate-900">
                    R$ {oscarKm > 0 ? ((oscarFuel + oscarMaint) / oscarKm).toFixed(2) : '0.00'} / KM
                  </span>
                </div>
              </div>
            </div>

            {/* Tiago Side */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 font-bold text-base text-[#002B5C]">
                  <span className="w-3 h-3 rounded-full bg-[#FFD100] border border-amber-400" />
                  PROVEDOR TIAGO - FROTA & CUSTOS
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800">
                  {tiagoKm.toLocaleString('pt-BR')} KM
                </span>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#002B5C]" />
                    Furgonetas Cadastradas:
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {vehicles.filter((v) => v.provider === 'Tiago').length} veículos
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Fuel className="w-4 h-4 text-amber-500" />
                    Combustível Total:
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    R$ {tiagoFuel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-indigo-600" />
                    Manutenção & Peças:
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    R$ {tiagoMaint.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center font-bold">
                  <span className="text-slate-700">Custo Total Tiago:</span>
                  <span className="text-base font-black text-[#002B5C]">
                    R$ {(tiagoFuel + tiagoMaint).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 text-slate-600 text-[11px] flex justify-between">
                  <span>Custo por KM Rodado:</span>
                  <span className="font-bold text-slate-900">
                    R$ {tiagoKm > 0 ? ((tiagoFuel + tiagoMaint) / tiagoKm).toFixed(2) : '0.00'} / KM
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Alertas de Manutenção Preventiva Próxima */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Controle de Manutenção Preventiva & Alertas de Revisão
            </h3>

            {maintenanceLogs.filter((m) => m.nextMaintenanceKm || m.nextMaintenanceDate).length === 0 ? (
              <div className="text-xs text-slate-500 py-3 text-center">
                Nenhum agendamento ou alerta de próxima manutenção registrado.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {maintenanceLogs
                  .filter((m) => m.nextMaintenanceKm || m.nextMaintenanceDate)
                  .slice(0, 6)
                  .map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 text-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-slate-900">{m.vehiclePlate}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {m.provider}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1">{m.description}</div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] space-y-0.5">
                        {m.nextMaintenanceKm && (
                          <div className="flex justify-between text-slate-600">
                            <span>Próxima Troca (KM):</span>
                            <span className="font-bold text-[#0057B8]">{m.nextMaintenanceKm.toLocaleString('pt-BR')} KM</span>
                          </div>
                        )}
                        {m.nextMaintenanceDate && (
                          <div className="flex justify-between text-slate-600">
                            <span>Data Limite:</span>
                            <span className="font-bold text-slate-800">
                              {m.nextMaintenanceDate.split('-').reverse().join('/')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Furgonetas Cadastradas */}
      {activeSubTab === 'vehicles' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Furgonetas Cadastradas ({filteredVehicles.length})
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhe o odômetro atual, a média diária de KM e a média de consumo (KM/L) de cada veículo
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => onOpenVehicleModal()}
                className="flex items-center gap-1.5 bg-[#0057B8] hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-xs transition"
              >
                <PlusCircle className="w-4 h-4 text-[#FFD100]" />
                Cadastrar Furgoneta
              </button>
            )}
          </div>

          {filteredVehicles.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
              <Truck className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">Nenhuma furgoneta cadastrada</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Cadastre suas furgonetas para controlar a quilometragem diária com KM Inicial/Final e calcular médias automáticas de abastecimento.
              </p>
              {isAdmin && (
                <button
                  onClick={() => onOpenVehicleModal()}
                  className="bg-[#0057B8] hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-xs inline-flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4 text-[#FFD100]" />
                  Cadastrar Primeira Furgoneta
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVehicles.map((vehicle) => {
                const metrics = getVehicleMetrics(vehicle.plate);
                return (
                  <div
                    key={vehicle.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-base">
                              {vehicle.name}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                vehicle.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : vehicle.status === 'maintenance'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {vehicle.status === 'active'
                                ? 'Ativa'
                                : vehicle.status === 'maintenance'
                                ? 'Manutenção'
                                : 'Inativa'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 mt-0.5 block">{vehicle.model}</span>
                        </div>

                        {/* License Plate Badge */}
                        <div className="border-2 border-slate-800 rounded bg-white text-slate-900 text-xs font-black tracking-widest px-2.5 py-1 shadow-2xs text-center uppercase">
                          <div className="text-[7px] text-blue-800 font-extrabold -mb-0.5 tracking-normal">
                            BRASIL
                          </div>
                          {vehicle.plate}
                        </div>
                      </div>

                      {/* Provider & Driver info */}
                      <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600">
                        <span className="flex items-center gap-1 font-bold">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              vehicle.provider === 'Oscar' ? 'bg-[#0057B8]' : 'bg-[#FFD100]'
                            }`}
                          />
                          Provedor {vehicle.provider}
                        </span>
                        <span className="text-slate-500 truncate max-w-[150px]">
                          Motorista: <strong>{vehicle.defaultDriverName || 'Rotativo'}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Card Body: Indicators & Averages */}
                    <div className="p-4 space-y-3 flex-1">
                      {/* Odômetro Atual */}
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/60 border border-blue-100">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Gauge className="w-4 h-4 text-[#0057B8]" />
                          Odômetro Atual:
                        </span>
                        <span className="text-base font-black text-[#0057B8]">
                          {vehicle.currentOdometer.toLocaleString('pt-BR')} KM
                        </span>
                      </div>

                      {/* Médias: Diária & Consumo */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Média Diária (KM)
                          </span>
                          <span className="text-sm font-black text-slate-900">
                            {metrics.avgDailyKm > 0 ? `${metrics.avgDailyKm} KM/dia` : 'Sem registros'}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {metrics.daysCount} dias auditados
                          </span>
                        </div>

                        <div
                          className={`p-2.5 rounded-lg border ${
                            metrics.avgConsumptionKmL !== null && metrics.avgConsumptionKmL < minEfficiencyThreshold
                              ? 'bg-red-50 border-red-200'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">
                              Média de Consumo
                            </span>
                            {metrics.avgConsumptionKmL !== null && metrics.avgConsumptionKmL < minEfficiencyThreshold && (
                              <span className="text-[9px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5 text-red-600" />
                                Alerta
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-sm font-black ${
                              metrics.avgConsumptionKmL !== null && metrics.avgConsumptionKmL < minEfficiencyThreshold
                                ? 'text-red-700'
                                : 'text-emerald-600'
                            }`}
                          >
                            {metrics.avgConsumptionKmL !== null ? `${metrics.avgConsumptionKmL} KM/L` : 'Aguardando'}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {vehicle.fuelType}
                          </span>
                        </div>
                      </div>

                      {/* Custo Total & R$/KM */}
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                        <span className="text-slate-500">Custo Total (Comb.+Manut.):</span>
                        <span className="font-bold text-slate-900">
                          R$ {metrics.totalVehicleCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer: Quick Actions */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => onOpenMileageModal(undefined, vehicle.id)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition"
                              title="Marcar KM Inicial/Final de hoje"
                            >
                              <Gauge className="w-3.5 h-3.5" />
                              <span>Marcar KM</span>
                            </button>
                            <button
                              onClick={() => onOpenFuelModal(undefined, vehicle.id)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md border border-amber-200 transition"
                              title="Abastecer esta furgoneta"
                            >
                              <Fuel className="w-3.5 h-3.5" />
                              <span>Abastecer</span>
                            </button>
                          </>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onOpenVehicleModal(vehicle)}
                            className="p-1.5 text-slate-400 hover:text-[#0057B8] rounded hover:bg-white"
                            title="Editar Furgoneta"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setVehicleToDelete(vehicle)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-white"
                            title="Excluir Furgoneta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: Quilometragem Diária (KM Inicial, Final e Alertas de Eficiência) */}
      {activeSubTab === 'mileage' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Header com Controles de Limite Aceitável & Filtros */}
          <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-600" />
                Controle Diário de Quilometragem por Furgoneta ({filteredMileage.length})
              </h3>
              <p className="text-xs text-slate-500">
                Auditoria de KM Inicial e Final com sistema de alertas visuais (color coding) para monitoramento de consumo
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto">
              {/* Seletor de Limite Aceitável de Consumo (KM/L) */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2.5 py-1.5 rounded-lg text-xs shadow-2xs">
                <span className="font-bold text-slate-600 uppercase text-[10px] whitespace-nowrap flex items-center gap-1">
                  <Fuel className="w-3 h-3 text-amber-500" />
                  Limite Aceitável:
                </span>
                <select
                  value={minEfficiencyThreshold}
                  onChange={(e) => setMinEfficiencyThreshold(Number(e.target.value))}
                  className="font-black text-[#0057B8] bg-transparent focus:outline-none cursor-pointer text-xs"
                  title="Definir limite mínimo aceitável de consumo (KM/L) para disparar alertas visuais"
                >
                  <option value={8.0}>8.0 KM/L</option>
                  <option value={8.5}>8.5 KM/L</option>
                  <option value={9.0}>9.0 KM/L</option>
                  <option value={9.5}>9.5 KM/L</option>
                  <option value={10.0}>10.0 KM/L (Padrão)</option>
                  <option value={10.5}>10.5 KM/L</option>
                  <option value={11.0}>11.0 KM/L</option>
                  <option value={11.5}>11.5 KM/L</option>
                </select>
              </div>

              {/* Botão de Filtro de Alertas de Eficiência */}
              <button
                onClick={() => setFilterOnlyInefficient(!filterOnlyInefficient)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterOnlyInefficient
                    ? 'bg-red-600 text-white shadow-xs'
                    : criticalMileageLogs.length > 0
                    ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-300 animate-pulse'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="Filtrar furgonetas com consumo abaixo do limite aceitável"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Apenas Alertas ({criticalMileageLogs.length})</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => onOpenMileageModal()}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 whitespace-nowrap"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Marcar KM Diário
                </button>
              )}
            </div>
          </div>

          {/* Banner de Alerta Visual Destacado quando houver furgonetas abaixo do limite */}
          {criticalMileageLogs.length > 0 && (
            <div className="m-4 p-3.5 rounded-xl border border-red-200 bg-red-50/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 text-red-700 rounded-lg shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-red-900 flex items-center gap-2">
                    ALERTA DE CONSUMO: {criticalMileageLogs.length} registro(s) de furgoneta abaixo de {minEfficiencyThreshold} KM/L
                  </h4>
                  <p className="text-xs text-red-800 mt-0.5">
                    Furgonetas em alerta: <strong>{uniqueCriticalPlates.join(', ')}</strong>. Consumo excessivo detectado em relação ao limite mínimo aceitável. Recomenda-se checagem de pneus, injeção e revisão mecânica.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFilterOnlyInefficient(!filterOnlyInefficient)}
                className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold whitespace-nowrap shadow-xs transition shrink-0"
              >
                {filterOnlyInefficient ? 'Mostrar Todas as Furgonetas' : 'Filtrar Apenas Furgonetas em Alerta'}
              </button>
            </div>
          )}

          {/* Legenda Visual (Color Coding) */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
              Legenda de Eficiência (Color Coding):
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span>Eficiente (&ge; {(minEfficiencyThreshold + 1.2).toFixed(1)} KM/L)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                <span>Regular ({minEfficiencyThreshold.toFixed(1)} a {(minEfficiencyThreshold + 1.1).toFixed(1)} KM/L)</span>
              </span>
              <span className="flex items-center gap-1.5 font-bold text-red-700">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                <span>Alerta: Abaixo do Limite (&lt; {minEfficiencyThreshold.toFixed(1)} KM/L)</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-3 rounded-full bg-slate-300 inline-block" />
                <span>Sem Abastecimento</span>
              </span>
            </div>
          </div>

          {filteredMileage.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              {filterOnlyInefficient
                ? 'Nenhum registro de furgoneta abaixo do limite aceitável encontrado no momento.'
                : 'Nenhum registro de quilometragem encontrado para os filtros selecionados.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Provedor</th>
                    <th className="px-4 py-3">Furgoneta / Placa</th>
                    <th className="px-4 py-3">Motorista</th>
                    <th className="px-4 py-3">Rota</th>
                    <th className="px-4 py-3 text-right">KM Inicial</th>
                    <th className="px-4 py-3 text-right">KM Final</th>
                    <th className="px-4 py-3 text-right">KM Rodados</th>
                    <th className="px-4 py-3">Consumo / Eficiência</th>
                    <th className="px-4 py-3">Observações</th>
                    {isAdmin && <th className="px-4 py-3 text-center">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMileage.map((km) => {
                    const alert = getEfficiencyAlertInfo(km.vehiclePlate);
                    return (
                      <tr key={km.id} className={`${alert.rowClass} transition`}>
                        <td className="px-4 py-2.5 whitespace-nowrap font-medium">
                          {km.date.split('-').reverse().join('/')}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              km.provider === 'Oscar'
                                ? 'bg-blue-100 text-[#0057B8]'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {km.provider}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap font-bold text-slate-900">
                          {km.vehiclePlate}
                          {km.vehicleModel && (
                            <span className="text-[10px] text-slate-400 block font-normal">{km.vehicleModel}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-slate-800 whitespace-nowrap">
                          {km.driverName}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-[#0057B8] font-bold">
                          {km.routeNumber || '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-slate-600 whitespace-nowrap">
                          {km.startKm.toLocaleString('pt-BR')} KM
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-slate-600 whitespace-nowrap">
                          {km.endKm.toLocaleString('pt-BR')} KM
                        </td>
                        <td className="px-4 py-2.5 text-right font-black text-emerald-600 text-sm whitespace-nowrap">
                          {km.totalKm.toLocaleString('pt-BR')} KM
                        </td>
                        {/* Nova Coluna: Consumo / Alerta de Eficiência */}
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {alert.efficiencyKmL !== null ? (
                            <div className="flex flex-col gap-0.5" title={alert.message}>
                              <span className="font-black text-xs text-slate-900">
                                {alert.efficiencyKmL} KM/L
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${alert.badgeBg} ${alert.badgeText} ${alert.badgeBorder}`}
                              >
                                {alert.status === 'critical' && <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />}
                                {alert.status === 'warning' && <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />}
                                {alert.status === 'optimal' && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
                                {alert.label}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              Sem abastecimento
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap text-[11px]">
                          {km.notes || '-'}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-2.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => onOpenMileageModal(km)}
                                className="p-1 text-slate-400 hover:text-[#0057B8] rounded"
                                title="Editar"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setMileageToDelete(km)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded"
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

      {/* SUB-TAB 4: Abastecimentos com Média e Valores */}
      {activeSubTab === 'fuel' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Histórico de Abastecimentos & Média de Consumo ({filteredFuel.length})
              </h3>
              <p className="text-xs text-slate-500">
                Média de consumo (KM/L) calculada automaticamente em relação ao último abastecimento de cada furgoneta
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => onOpenFuelModal()}
                className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 self-end sm:self-auto"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Novo Abastecimento
              </button>
            )}
          </div>

          {filteredFuel.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Nenhum abastecimento encontrado para os critérios selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Provedor</th>
                    <th className="px-4 py-3">Furgoneta / Placa</th>
                    <th className="px-4 py-3">Motorista</th>
                    <th className="px-4 py-3 text-right">KM Atual</th>
                    <th className="px-4 py-3 text-right">KM Rodados (Tanque)</th>
                    <th className="px-4 py-3 text-right">Média (KM/L)</th>
                    <th className="px-4 py-3 text-right">Custo / KM</th>
                    <th className="px-4 py-3">Combustível</th>
                    <th className="px-4 py-3 text-right">Litros</th>
                    <th className="px-4 py-3 text-right">Preço/L</th>
                    <th className="px-4 py-3 text-right">Total Pago (R$)</th>
                    <th className="px-4 py-3">Posto / NF</th>
                    {isAdmin && <th className="px-4 py-3 text-center">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFuel.map((fuel) => (
                    <tr key={fuel.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-2.5 whitespace-nowrap font-medium">
                        {fuel.date.split('-').reverse().join('/')}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            fuel.provider === 'Oscar'
                              ? 'bg-blue-100 text-[#0057B8]'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {fuel.provider}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap font-bold text-slate-900">
                        {fuel.vehiclePlate}
                        {fuel.vehicleModel && (
                          <span className="text-[10px] text-slate-400 block font-normal">{fuel.vehicleModel}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-slate-800 whitespace-nowrap">
                        {fuel.driverName}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap">
                        {fuel.odometerKm.toLocaleString('pt-BR')} KM
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        {fuel.distanceSinceLastFuel ? (
                          <span className="font-bold text-slate-800">
                            +{fuel.distanceSinceLastFuel.toLocaleString('pt-BR')} KM
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">1º abastecimento</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        {fuel.fuelEfficiencyKmL ? (
                          <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {fuel.fuelEfficiencyKmL} KM/L
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        {fuel.costPerKm ? (
                          <span className="font-semibold text-blue-700">
                            R$ {fuel.costPerKm}/KM
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {fuel.fuelType}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">
                        {fuel.liters.toFixed(1)} L
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        R$ {fuel.pricePerLiter.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-black text-amber-600 text-sm whitespace-nowrap">
                        R$ {fuel.totalCost.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap text-[11px]">
                        {fuel.stationName || '-'} {fuel.receiptNumber ? `(${fuel.receiptNumber})` : ''}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-2.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onOpenFuelModal(fuel)}
                              className="p-1 text-slate-400 hover:text-[#0057B8] rounded"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setFuelToDelete(fuel)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 5: Manutenção & Reparos */}
      {activeSubTab === 'maintenance' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Histórico de Manutenções & Reparos ({filteredMaintenance.length})
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhamento de revisões preventivas, corretivas e despesas de oficina
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => onOpenMaintenanceModal()}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 self-end sm:self-auto"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Registrar Manutenção
              </button>
            )}
          </div>

          {filteredMaintenance.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Nenhum registro de manutenção encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Provedor</th>
                    <th className="px-4 py-3">Furgoneta / Placa</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Descrição do Serviço</th>
                    <th className="px-4 py-3 text-right">KM</th>
                    <th className="px-4 py-3 text-right">Valor (R$)</th>
                    <th className="px-4 py-3">Oficina</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    {isAdmin && <th className="px-4 py-3 text-center">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMaintenance.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-2.5 whitespace-nowrap font-medium">
                        {m.date.split('-').reverse().join('/')}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            m.provider === 'Oscar'
                              ? 'bg-blue-100 text-[#0057B8]'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {m.provider}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap font-bold text-slate-900">
                        {m.vehiclePlate}
                        {m.vehicleModel && (
                          <span className="text-[10px] text-slate-400 block font-normal">{m.vehicleModel}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.type === 'Preventiva'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap font-medium text-slate-800">
                        {m.category}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate" title={m.description}>
                        {m.description}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap">
                        {m.odometerKm.toLocaleString('pt-BR')} KM
                      </td>
                      <td className="px-4 py-2.5 text-right font-black text-indigo-700 text-sm whitespace-nowrap">
                        R$ {m.cost.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap text-[11px]">
                        {m.workshop}
                      </td>
                      <td className="px-4 py-2.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.status === 'Concluída'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : m.status === 'Em Andamento'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-2.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onOpenMaintenanceModal(m)}
                              className="p-1 text-slate-400 hover:text-[#0057B8] rounded"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setMaintenanceToDelete(m)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Delete Modals */}
      <ConfirmDeleteModal
        isOpen={vehicleToDelete !== null}
        title="Excluir Furgoneta"
        message="Tem certeza que deseja excluir esta furgoneta da frota? Os históricos de abastecimento e quilometragem permanecerão arquivados."
        itemName={vehicleToDelete ? `${vehicleToDelete.name} - Placa ${vehicleToDelete.plate} (${vehicleToDelete.provider})` : undefined}
        onConfirm={async () => {
          if (vehicleToDelete) {
            await onDeleteVehicle(vehicleToDelete.id);
            setVehicleToDelete(null);
          }
        }}
        onCancel={() => setVehicleToDelete(null)}
      />

      <ConfirmDeleteModal
        isOpen={fuelToDelete !== null}
        title="Excluir Abastecimento"
        message="Tem certeza que deseja excluir este registro de abastecimento? O custo e as médias serão recalculados em tempo real."
        itemName={fuelToDelete ? `${fuelToDelete.vehiclePlate} - ${fuelToDelete.liters}L (${fuelToDelete.fuelType}) - R$ ${fuelToDelete.totalCost.toFixed(2)}` : undefined}
        onConfirm={async () => {
          if (fuelToDelete) {
            await onDeleteFuelLog(fuelToDelete.id);
            setFuelToDelete(null);
          }
        }}
        onCancel={() => setFuelToDelete(null)}
      />

      <ConfirmDeleteModal
        isOpen={maintenanceToDelete !== null}
        title="Excluir Manutenção"
        message="Tem certeza que deseja excluir este registro de manutenção? Os custos de frota serão atualizados."
        itemName={maintenanceToDelete ? `${maintenanceToDelete.vehiclePlate} - ${maintenanceToDelete.category} - R$ ${maintenanceToDelete.cost.toFixed(2)}` : undefined}
        onConfirm={async () => {
          if (maintenanceToDelete) {
            await onDeleteMaintenanceLog(maintenanceToDelete.id);
            setMaintenanceToDelete(null);
          }
        }}
        onCancel={() => setMaintenanceToDelete(null)}
      />

      <ConfirmDeleteModal
        isOpen={mileageToDelete !== null}
        title="Excluir Registro de Odômetro"
        message="Tem certeza que deseja excluir este registro de quilometragem diária?"
        itemName={mileageToDelete ? `${mileageToDelete.vehiclePlate} - ${mileageToDelete.totalKm} KM (${mileageToDelete.date.split('-').reverse().join('/')})` : undefined}
        onConfirm={async () => {
          if (mileageToDelete) {
            await onDeleteMileageLog(mileageToDelete.id);
            setMileageToDelete(null);
          }
        }}
        onCancel={() => setMileageToDelete(null)}
      />
    </div>
  );
};
