import {
  RouteRecord,
  Driver,
  Vehicle,
  FuelLog,
  MaintenanceLog,
  MileageLog,
  ProviderName,
  FuelType,
  MaintenanceType,
  MaintenanceStatus,
  getQualityClassification,
  calculateQuality,
  CONTRACTUAL_GOAL,
} from '../types.ts';
import {
  addRoute,
  addDriver,
  addVehicle,
  addMileageLog,
  addFuelLog,
  addMaintenanceLog,
} from './dataService.ts';
import { getLocalDateString, getDaysAgoDateString, getSavedEfficiencyThreshold } from '../utils/date.ts';
import type { TabId } from '../components/Navigation.tsx';

export interface AIContentPart {
  text?: string;
  functionCall?: {
    id?: string;
    name: string;
    args?: Record<string, unknown>;
  };
  functionResponse?: {
    id?: string;
    name: string;
    response: Record<string, unknown>;
  };
  [key: string]: unknown;
}

export interface AIContent {
  role: 'user' | 'model';
  parts: AIContentPart[];
}

export interface ExecutedAction {
  id: string;
  kind: 'route' | 'driver' | 'vehicle' | 'mileage' | 'fuel' | 'maintenance' | 'navigation' | 'report';
  title: string;
  subtitle: string;
  badge?: string;
  badgeTone?: 'green' | 'amber' | 'red' | 'blue';
  targetTab?: TabId;
}

export interface AppLiveState {
  routes: RouteRecord[];
  drivers: Driver[];
  vehicles: Vehicle[];
  mileageLogs: MileageLog[];
  fuelLogs: FuelLog[];
  maintenanceLogs: MaintenanceLog[];
  isAdmin: boolean;
}

export interface AppActionCallbacks {
  onNavigateTab: (tab: TabId) => void;
  onOpenReportModal: (category: 'routes' | 'fleet') => void;
  onNotify: (message: string) => void;
}

function normalizeProvider(val: unknown): ProviderName {
  const s = String(val || '').trim().toLowerCase();
  return s.includes('tiago') ? 'Tiago' : 'Oscar';
}

function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function findVehicleByPlateOrName(vehicles: Vehicle[], query: string): Vehicle | undefined {
  const qClean = normalizePlate(query);
  const qLower = query.trim().toLowerCase();
  return vehicles.find(
    (v) =>
      normalizePlate(v.plate) === qClean ||
      v.plate.trim().toUpperCase() === query.trim().toUpperCase() ||
      v.name.trim().toLowerCase() === qLower ||
      v.name.trim().toLowerCase().includes(qLower)
  );
}

function normalizeFuelType(val: unknown, fallback: FuelType = 'Diesel S10'): FuelType {
  const s = String(val || '').trim().toLowerCase();
  if (!s) return fallback;
  if (s.includes('aditiv')) return 'Gasolina Aditivada';
  if (s.includes('gasol')) return 'Gasolina Comum';
  if (s.includes('etanol') || s.includes('álcool') || s.includes('alcool')) return 'Etanol';
  if (s.includes('gnv') || s.includes('gás') || s.includes('gas')) return 'GNV';
  if (s.includes('arla')) return 'Arla 32';
  if (s.includes('diesel')) return 'Diesel S10';
  return fallback;
}

export function buildContextSummary(state: AppLiveState): string {
  const today = getLocalDateString();
  const weekAgo = getDaysAgoDateString(6);
  const threshold = getSavedEfficiencyThreshold(10.0);

  const calcStats = (list: RouteRecord[]) => {
    const totalPackages = list.reduce((a, r) => a + (Number(r.packages) || 0), 0);
    const totalIncidences = list.reduce((a, r) => a + (Number(r.incidences) || 0), 0);
    const quality = totalPackages > 0 ? calculateQuality(totalPackages, totalIncidences) : null;
    return { count: list.length, totalPackages, totalIncidences, quality };
  };

  const todayRoutes = state.routes.filter((r) => r.date === today);
  const weekRoutes = state.routes.filter((r) => r.date >= weekAgo && r.date <= today);
  const oscarRoutes = state.routes.filter((r) => r.provider === 'Oscar');
  const tiagoRoutes = state.routes.filter((r) => r.provider === 'Tiago');

  const todayStats = calcStats(todayRoutes);
  const weekStats = calcStats(weekRoutes);
  const allStats = calcStats(state.routes);
  const oscarStats = calcStats(oscarRoutes);
  const tiagoStats = calcStats(tiagoRoutes);

  const totalFuelCost = state.fuelLogs.reduce((a, f) => a + (Number(f.totalCost) || 0), 0);
  const totalMaintCost = state.maintenanceLogs.reduce((a, m) => a + (Number(m.cost) || 0), 0);
  const totalKm = state.mileageLogs.reduce((a, k) => a + (Number(k.totalKm) || 0), 0);

  const driverLines = state.drivers
    .slice(0, 40)
    .map((d) => `- ${d.name} (${d.provider}, ${d.status === 'active' ? 'Ativo' : 'Inativo'}${d.licensePlate ? `, Placa ${d.licensePlate}` : ''})`)
    .join('\n');

  const vehicleLines = state.vehicles
    .map((v) => {
      const pClean = normalizePlate(v.plate);
      const vFuels = state.fuelLogs.filter((f) => normalizePlate(f.vehiclePlate) === pClean);
      const dist = vFuels.reduce((a, f) => a + (Number(f.distanceSinceLastFuel) || 0), 0);
      const lit = vFuels.reduce((a, f) => a + (f.distanceSinceLastFuel ? Number(f.liters) || 0 : 0), 0);
      const eff = dist > 0 && lit > 0 ? (dist / lit).toFixed(2) : 'N/D';
      const alertTag = eff !== 'N/D' && Number(eff) < threshold ? ' [ALERTA CONSUMO BAIXO]' : '';
      return `- ${v.name} | Placa: ${v.plate} | Modelo: ${v.model} | Provedor: ${v.provider} | Odômetro: ${v.currentOdometer} KM | Motorista: ${v.defaultDriverName || 'Rotativo'} | Consumo médio: ${eff} KM/L${alertTag}`;
    })
    .join('\n');

  const recentRouteLines = state.routes
    .slice(0, 12)
    .map(
      (r) =>
        `- ${r.date} | ${r.provider} | Motorista: ${r.driverName} | Rota: ${r.routeNumber} (${r.locality}) | Saiu: ${r.packages}, Entregou: ${r.deliveredPackages ?? Math.max(0, r.packages - r.incidences)}, Incidências: ${r.incidences} | Qualidade: ${r.quality.toFixed(2)}%`
    )
    .join('\n');

  const maintAlertLines = state.maintenanceLogs
    .filter((m) => m.nextMaintenanceKm || m.nextMaintenanceDate)
    .slice(0, 10)
    .map(
      (m) =>
        `- ${m.vehiclePlate} (${m.provider}): ${m.description} | Próx KM: ${m.nextMaintenanceKm ?? '-'} | Próx Data: ${m.nextMaintenanceDate ?? '-'}`
    )
    .join('\n');

  return [
    `HOJE: ${today} | Meta contratual: ${CONTRACTUAL_GOAL}% | Limite mínimo eficiência frota: ${threshold} KM/L`,
    `RESUMO ROTAS HOJE (${todayStats.count} rotas): Qualidade ${todayStats.quality !== null ? todayStats.quality + '%' : 'sem rotas'}, Saiu ${todayStats.totalPackages}, Incidências ${todayStats.totalIncidences}`,
    `ÚLTIMOS 7 DIAS (${weekStats.count} rotas): Qualidade ${weekStats.quality !== null ? weekStats.quality + '%' : 'sem rotas'}, Saiu ${weekStats.totalPackages}, Incidências ${weekStats.totalIncidences}`,
    `TOTAL HISTÓRICO (${allStats.count} rotas): Qualidade ${allStats.quality !== null ? allStats.quality + '%' : 'sem rotas'} | Oscar: ${oscarStats.count} rotas (${oscarStats.quality ?? '--'}%) | Tiago: ${tiagoStats.count} rotas (${tiagoStats.quality ?? '--'}%)`,
    `RESUMO FROTA: ${state.vehicles.length} furgonetas | ${totalKm} KM rodados | Combustível: R$ ${totalFuelCost.toFixed(2)} (${state.fuelLogs.length} reg.) | Manutenção: R$ ${totalMaintCost.toFixed(2)} (${state.maintenanceLogs.length} reg.)`,
    `MOTORISTAS (${state.drivers.length}):\n${driverLines || 'Nenhum cadastrado.'}`,
    `FURGONETAS (${state.vehicles.length}):\n${vehicleLines || 'Nenhuma cadastrada.'}`,
    `ROTAS RECENTES:\n${recentRouteLines || 'Nenhuma rota registrada.'}`,
    `ALERTAS PREVENTIVOS DE REVISÃO:\n${maintAlertLines || 'Nenhum alerta registrado.'}`,
  ].join('\n\n');
}

export async function executeAIToolCall(
  call: { id?: string; name: string; args?: Record<string, unknown> },
  state: AppLiveState,
  callbacks: AppActionCallbacks
): Promise<{ result: Record<string, unknown>; action?: ExecutedAction }> {
  const args = call.args || {};
  const today = getLocalDateString();

  const requireAdmin = (): { result: Record<string, unknown> } | null => {
    if (!state.isAdmin) {
      return {
        result: {
          ok: false,
          error:
            'Usuário está no modo Visualizador (apenas leitura). Peça para ativar o modo Administrador no canto superior direito antes de fazer cadastros.',
        },
      };
    }
    return null;
  };

  try {
    switch (call.name) {
      case 'cadastrar_rota': {
        const denied = requireAdmin();
        if (denied) return denied;

        const provider = normalizeProvider(args.provider);
        const driverName = String(args.driverName || '').trim();
        const routeNumber = String(args.routeNumber || '').trim();
        const packages = Number(args.packages);
        const deliveredRaw = args.deliveredPackages !== undefined ? Number(args.deliveredPackages) : packages;
        const date = String(args.date || today).trim() || today;

        if (!driverName || !routeNumber || !Number.isFinite(packages) || packages <= 0) {
          return {
            result: {
              ok: false,
              error: 'Dados inválidos: informe motorista, número da rota e quantidade que saiu maior que zero.',
            },
          };
        }

        const deliveredPackages = Math.max(0, Math.min(packages, Math.round(deliveredRaw)));
        const incidences = Math.max(0, packages - deliveredPackages);
        const quality = calculateQuality(packages, incidences);
        const classification = getQualityClassification(quality);

        const matchedDriver = state.drivers.find(
          (d) =>
            d.name.trim().toLowerCase() === driverName.toLowerCase() &&
            d.provider === provider
        ) || state.drivers.find((d) => d.name.trim().toLowerCase() === driverName.toLowerCase());

        const locality = String(args.locality || 'Não informada').trim();
        const routeName = String(args.routeName || (locality !== 'Não informada' ? `${routeNumber} - ${locality}` : `Rota ${routeNumber}`)).trim();
        const notes = args.notes ? String(args.notes).trim() : undefined;

        const id = await addRoute({
          date,
          provider,
          driverId: matchedDriver?.id || `custom_${Date.now()}`,
          driverName: matchedDriver?.name || driverName,
          routeName,
          routeNumber,
          locality,
          volumes: packages,
          packages,
          deliveredPackages,
          incidences,
          quality,
          ...(notes ? { notes } : {}),
        });

        callbacks.onNotify(`Rota ${routeNumber} (${matchedDriver?.name || driverName}) cadastrada via IA!`);

        return {
          result: {
            ok: true,
            id,
            date,
            provider,
            driverName: matchedDriver?.name || driverName,
            routeNumber,
            packages,
            deliveredPackages,
            incidences,
            quality,
            classification,
          },
          action: {
            id,
            kind: 'route',
            title: `Rota ${routeNumber} • ${matchedDriver?.name || driverName}`,
            subtitle: `${provider} • Saiu ${packages} / Entregou ${deliveredPackages} • ${incidences} incid.`,
            badge: `${quality.toFixed(1)}% ${classification}`,
            badgeTone: classification === 'VERDE' ? 'green' : classification === 'AMARELO' ? 'amber' : 'red',
            targetTab: 'history',
          },
        };
      }

      case 'cadastrar_motorista': {
        const denied = requireAdmin();
        if (denied) return denied;

        const provider = normalizeProvider(args.provider);
        const name = String(args.name || '').trim();
        if (!name) {
          return { result: { ok: false, error: 'O nome do motorista é obrigatório.' } };
        }

        const statusRaw = String(args.status || 'active').toLowerCase();
        const status: 'active' | 'inactive' = statusRaw === 'inactive' ? 'inactive' : 'active';
        const phone = args.phone ? String(args.phone).trim() : undefined;
        const vehicleType = args.vehicleType ? String(args.vehicleType).trim() : undefined;
        const licensePlate = args.licensePlate ? String(args.licensePlate).trim().toUpperCase() : undefined;

        const id = await addDriver({
          provider,
          name,
          status,
          ...(phone ? { phone } : {}),
          ...(vehicleType ? { vehicleType } : {}),
          ...(licensePlate ? { licensePlate } : {}),
        });

        callbacks.onNotify(`Motorista ${name} (${provider}) cadastrado via IA!`);

        return {
          result: { ok: true, id, provider, name, status },
          action: {
            id,
            kind: 'driver',
            title: `Motorista ${name}`,
            subtitle: `Provedor ${provider}${licensePlate ? ` • Placa ${licensePlate}` : ''}`,
            badge: status === 'active' ? 'Ativo' : 'Inativo',
            badgeTone: 'blue',
            targetTab: provider === 'Oscar' ? 'oscar' : 'tiago',
          },
        };
      }

      case 'cadastrar_furgoneta': {
        const denied = requireAdmin();
        if (denied) return denied;

        const name = String(args.name || '').trim();
        const plate = String(args.plate || '').trim().toUpperCase();
        const model = String(args.model || '').trim();
        const provider = normalizeProvider(args.provider);
        const initialOdometer = Number(args.initialOdometer);

        if (!name || !plate || !model || !Number.isFinite(initialOdometer) || initialOdometer < 0) {
          return {
            result: {
              ok: false,
              error: 'Informe nome, placa, modelo e odômetro inicial válido para cadastrar a furgoneta.',
            },
          };
        }

        const fuelType = normalizeFuelType(args.fuelType, 'Diesel S10');
        const statusRaw = String(args.status || 'active').toLowerCase();
        const status: 'active' | 'maintenance' | 'inactive' =
          statusRaw === 'maintenance' ? 'maintenance' : statusRaw === 'inactive' ? 'inactive' : 'active';

        const id = await addVehicle({
          name,
          plate,
          model,
          provider,
          initialOdometer,
          currentOdometer: initialOdometer,
          fuelType,
          status,
          ...(args.defaultDriverName ? { defaultDriverName: String(args.defaultDriverName).trim() } : {}),
          ...(args.tankCapacity !== undefined ? { tankCapacity: Number(args.tankCapacity) } : {}),
          ...(args.notes ? { notes: String(args.notes).trim() } : {}),
        });

        callbacks.onNotify(`Furgoneta ${name} (${plate}) cadastrada via IA!`);

        return {
          result: { ok: true, id, name, plate, model, provider, initialOdometer, fuelType },
          action: {
            id,
            kind: 'vehicle',
            title: `${name} • ${plate}`,
            subtitle: `${model} • ${provider} • ${initialOdometer.toLocaleString('pt-BR')} KM`,
            badge: fuelType,
            badgeTone: 'blue',
            targetTab: 'fleet',
          },
        };
      }

      case 'registrar_km_manha': {
        const denied = requireAdmin();
        if (denied) return denied;

        const plateInput = String(args.vehiclePlate || '').trim();
        const vehicle = findVehicleByPlateOrName(state.vehicles, plateInput);
        const startKm = Number(args.startKm);

        if (!plateInput || !Number.isFinite(startKm) || startKm <= 0) {
          return {
            result: { ok: false, error: 'Informe uma furgoneta/placa válida e o KM lido pela manhã.' },
          };
        }

        const date = String(args.date || today).trim() || today;
        const provider = vehicle ? vehicle.provider : normalizeProvider(args.provider);
        const vehiclePlate = vehicle ? vehicle.plate : plateInput.toUpperCase();
        const driverName =
          String(args.driverName || vehicle?.defaultDriverName || 'Motorista').trim();

        const id = await addMileageLog({
          date,
          provider,
          ...(vehicle?.id ? { vehicleId: vehicle.id } : {}),
          driverName,
          vehiclePlate,
          ...(vehicle?.model ? { vehicleModel: vehicle.model } : {}),
          ...(args.routeNumber ? { routeNumber: String(args.routeNumber).trim() } : {}),
          startKm,
          endKm: startKm,
          totalKm: 0,
          readingType: 'morning',
          ...(args.notes ? { notes: String(args.notes).trim() } : {}),
        });

        callbacks.onNotify(`KM da manhã registrado para ${vehiclePlate} (${startKm.toLocaleString('pt-BR')} KM)!`);

        return {
          result: { ok: true, id, date, vehiclePlate, provider, driverName, startKm },
          action: {
            id,
            kind: 'mileage',
            title: `KM Manhã • ${vehiclePlate}`,
            subtitle: `${driverName} (${provider}) • Leitura: ${startKm.toLocaleString('pt-BR')} KM`,
            badge: date,
            badgeTone: 'green',
            targetTab: 'fleet',
          },
        };
      }

      case 'registrar_abastecimento': {
        const denied = requireAdmin();
        if (denied) return denied;

        const plateInput = String(args.vehiclePlate || '').trim();
        const vehicle = findVehicleByPlateOrName(state.vehicles, plateInput);
        const odometerKm = Number(args.odometerKm);
        const liters = Number(args.liters);

        if (!plateInput || !Number.isFinite(odometerKm) || odometerKm <= 0 || !Number.isFinite(liters) || liters <= 0) {
          return {
            result: {
              ok: false,
              error: 'Informe placa da furgoneta, odômetro (KM) e quantidade de litros válidos.',
            },
          };
        }

        let pricePerLiter = args.pricePerLiter !== undefined ? Number(args.pricePerLiter) : 0;
        let totalCost = args.totalCost !== undefined ? Number(args.totalCost) : 0;

        if (totalCost > 0 && (!pricePerLiter || pricePerLiter <= 0)) {
          pricePerLiter = Number((totalCost / liters).toFixed(2));
        } else if (pricePerLiter > 0 && (!totalCost || totalCost <= 0)) {
          totalCost = Number((pricePerLiter * liters).toFixed(2));
        }

        if (totalCost <= 0 || pricePerLiter <= 0) {
          return {
            result: {
              ok: false,
              error: 'Informe o valor total pago (R$) ou o preço por litro para registrar o abastecimento.',
            },
          };
        }

        const date = String(args.date || today).trim() || today;
        const provider = vehicle ? vehicle.provider : normalizeProvider(args.provider);
        const vehiclePlate = vehicle ? vehicle.plate : plateInput.toUpperCase();
        const driverName =
          String(args.driverName || vehicle?.defaultDriverName || 'Motorista').trim();
        const fuelType = normalizeFuelType(args.fuelType, vehicle?.fuelType || 'Diesel S10');

        const id = await addFuelLog({
          date,
          provider,
          ...(vehicle?.id ? { vehicleId: vehicle.id } : {}),
          driverName,
          vehiclePlate,
          ...(vehicle?.model ? { vehicleModel: vehicle.model } : {}),
          odometerKm,
          fuelType,
          liters,
          pricePerLiter,
          totalCost,
          ...(args.stationName ? { stationName: String(args.stationName).trim() } : {}),
          ...(args.receiptNumber ? { receiptNumber: String(args.receiptNumber).trim() } : {}),
          ...(args.notes ? { notes: String(args.notes).trim() } : {}),
        });

        callbacks.onNotify(`Abastecimento de ${vehiclePlate} (R$ ${totalCost.toFixed(2)}) registrado via IA!`);

        return {
          result: {
            ok: true,
            id,
            date,
            vehiclePlate,
            provider,
            odometerKm,
            liters,
            pricePerLiter,
            totalCost,
            fuelType,
          },
          action: {
            id,
            kind: 'fuel',
            title: `Abastecimento • ${vehiclePlate}`,
            subtitle: `${liters.toFixed(1)}L ${fuelType} • Odômetro ${odometerKm.toLocaleString('pt-BR')} KM`,
            badge: `R$ ${totalCost.toFixed(2)}`,
            badgeTone: 'amber',
            targetTab: 'fleet',
          },
        };
      }

      case 'registrar_manutencao': {
        const denied = requireAdmin();
        if (denied) return denied;

        const plateInput = String(args.vehiclePlate || '').trim();
        const vehicle = findVehicleByPlateOrName(state.vehicles, plateInput);
        const cost = Number(args.cost);
        const description = String(args.description || '').trim();
        const category = String(args.category || 'Revisão Geral').trim();

        if (!plateInput || !description || !Number.isFinite(cost) || cost < 0) {
          return {
            result: {
              ok: false,
              error: 'Informe placa, descrição do serviço e custo válido para registrar a manutenção.',
            },
          };
        }

        const typeRaw = String(args.type || '').toLowerCase();
        const type: MaintenanceType = typeRaw.includes('corr') ? 'Corretiva' : 'Preventiva';

        const statusRaw = String(args.status || '').toLowerCase();
        const status: MaintenanceStatus = statusRaw.includes('agend')
          ? 'Agendada'
          : statusRaw.includes('andam')
          ? 'Em Andamento'
          : 'Concluída';

        const date = String(args.date || today).trim() || today;
        const provider = vehicle ? vehicle.provider : normalizeProvider(args.provider);
        const vehiclePlate = vehicle ? vehicle.plate : plateInput.toUpperCase();
        const odometerKm =
          args.odometerKm !== undefined && Number(args.odometerKm) > 0
            ? Number(args.odometerKm)
            : vehicle?.currentOdometer || 0;
        const driverName = args.driverName
          ? String(args.driverName).trim()
          : vehicle?.defaultDriverName;
        const workshop = String(args.workshop || 'Oficina Parceira').trim();

        const id = await addMaintenanceLog({
          date,
          provider,
          ...(vehicle?.id ? { vehicleId: vehicle.id } : {}),
          ...(driverName ? { driverName } : {}),
          vehiclePlate,
          ...(vehicle?.model ? { vehicleModel: vehicle.model } : {}),
          odometerKm,
          type,
          category,
          description,
          cost,
          workshop,
          status,
          ...(args.nextMaintenanceKm !== undefined
            ? { nextMaintenanceKm: Number(args.nextMaintenanceKm) }
            : {}),
          ...(args.nextMaintenanceDate
            ? { nextMaintenanceDate: String(args.nextMaintenanceDate).trim() }
            : {}),
          ...(args.notes ? { notes: String(args.notes).trim() } : {}),
        });

        callbacks.onNotify(`Manutenção ${type} de ${vehiclePlate} registrada via IA!`);

        return {
          result: { ok: true, id, date, vehiclePlate, type, category, cost, status },
          action: {
            id,
            kind: 'maintenance',
            title: `${type} • ${vehiclePlate}`,
            subtitle: `${category}: ${description}`,
            badge: `R$ ${cost.toFixed(2)}`,
            badgeTone: type === 'Corretiva' ? 'red' : 'blue',
            targetTab: 'fleet',
          },
        };
      }

      case 'consultar_registros': {
        const target = String(args.target || 'routes');
        const provider = args.provider ? String(args.provider) : 'all';
        const search = String(args.search || '').trim().toLowerCase();
        const startDate = args.startDate ? String(args.startDate) : '';
        const endDate = args.endDate ? String(args.endDate) : '';
        const limit = Math.min(50, Math.max(1, Number(args.limit) || 20));

        const filterProv = <T extends { provider: ProviderName }>(arr: T[]) =>
          provider === 'Oscar' || provider === 'Tiago'
            ? arr.filter((x) => x.provider === provider)
            : arr;

        const filterDates = <T extends { date: string }>(arr: T[]) =>
          arr.filter((x) => (!startDate || x.date >= startDate) && (!endDate || x.date <= endDate));

        if (target === 'routes') {
          let list = filterDates(filterProv(state.routes));
          if (search) {
            list = list.filter(
              (r) =>
                r.driverName.toLowerCase().includes(search) ||
                r.routeNumber.toLowerCase().includes(search) ||
                r.locality.toLowerCase().includes(search)
            );
          }
          const pkgs = list.reduce((a, r) => a + r.packages, 0);
          const incs = list.reduce((a, r) => a + r.incidences, 0);
          return {
            result: {
              ok: true,
              totalMatched: list.length,
              summary: {
                packages: pkgs,
                incidences: incs,
                delivered: pkgs - incs,
                quality: pkgs > 0 ? calculateQuality(pkgs, incs) : null,
              },
              items: list.slice(0, limit),
            },
          };
        }

        if (target === 'drivers') {
          let list = filterProv(state.drivers);
          if (search) {
            list = list.filter(
              (d) =>
                d.name.toLowerCase().includes(search) ||
                (d.licensePlate && d.licensePlate.toLowerCase().includes(search))
            );
          }
          return { result: { ok: true, totalMatched: list.length, items: list.slice(0, limit) } };
        }

        if (target === 'vehicles') {
          let list = filterProv(state.vehicles);
          if (search) {
            list = list.filter(
              (v) =>
                v.name.toLowerCase().includes(search) ||
                v.plate.toLowerCase().includes(search) ||
                v.model.toLowerCase().includes(search)
            );
          }
          return { result: { ok: true, totalMatched: list.length, items: list.slice(0, limit) } };
        }

        if (target === 'mileage') {
          let list = filterDates(filterProv(state.mileageLogs));
          if (search) {
            list = list.filter(
              (m) =>
                m.vehiclePlate.toLowerCase().includes(search) ||
                m.driverName.toLowerCase().includes(search)
            );
          }
          return { result: { ok: true, totalMatched: list.length, items: list.slice(0, limit) } };
        }

        if (target === 'fuel') {
          let list = filterDates(filterProv(state.fuelLogs));
          if (search) {
            list = list.filter(
              (f) =>
                f.vehiclePlate.toLowerCase().includes(search) ||
                f.driverName.toLowerCase().includes(search)
            );
          }
          const totalCost = list.reduce((a, f) => a + f.totalCost, 0);
          const totalLiters = list.reduce((a, f) => a + f.liters, 0);
          return {
            result: {
              ok: true,
              totalMatched: list.length,
              summary: { totalCost, totalLiters },
              items: list.slice(0, limit),
            },
          };
        }

        if (target === 'maintenance') {
          let list = filterDates(filterProv(state.maintenanceLogs));
          if (search) {
            list = list.filter(
              (m) =>
                m.vehiclePlate.toLowerCase().includes(search) ||
                m.description.toLowerCase().includes(search) ||
                m.category.toLowerCase().includes(search)
            );
          }
          const totalCost = list.reduce((a, m) => a + m.cost, 0);
          return {
            result: {
              ok: true,
              totalMatched: list.length,
              summary: { totalCost },
              items: list.slice(0, limit),
            },
          };
        }

        return { result: { ok: false, error: `Alvo desconhecido: ${target}` } };
      }

      case 'navegar_para_aba': {
        const tab = String(args.tab || 'dashboard') as TabId;
        const validTabs: TabId[] = ['dashboard', 'oscar', 'tiago', 'rankings', 'history', 'fleet'];
        const chosen = validTabs.includes(tab) ? tab : 'dashboard';
        callbacks.onNavigateTab(chosen);
        return {
          result: { ok: true, tab: chosen },
          action: {
            id: `nav_${Date.now()}`,
            kind: 'navigation',
            title: `Tela aberta: ${chosen.toUpperCase()}`,
            subtitle: 'Navegação aplicada no painel',
            targetTab: chosen,
          },
        };
      }

      case 'abrir_relatorio_pdf': {
        const cat = args.category === 'fleet' ? 'fleet' : 'routes';
        callbacks.onOpenReportModal(cat);
        return {
          result: { ok: true, category: cat },
          action: {
            id: `rep_${Date.now()}`,
            kind: 'report',
            title: cat === 'fleet' ? 'Gerador PDF • Frota' : 'Gerador PDF • Qualidade de Rotas',
            subtitle: 'Janela de exportação aberta',
          },
        };
      }

      default:
        return { result: { ok: false, error: `Função ${call.name} não reconhecida.` } };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      result: { ok: false, error: `Erro ao executar ação: ${msg}` },
    };
  }
}

export async function runAIAssistantTurn(
  historyContents: AIContent[],
  state: AppLiveState,
  callbacks: AppActionCallbacks
): Promise<{
  replyText: string;
  updatedContents: AIContent[];
  executedActions: ExecutedAction[];
}> {
  const contextSummary = buildContextSummary(state);
  const todayDate = getLocalDateString();
  let workingContents = [...historyContents];
  const executedActions: ExecutedAction[] = [];

  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: workingContents,
        contextSummary,
        isAdmin: state.isAdmin,
        todayDate,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao comunicar com a Assistente IA.');
    }

    const modelContent: AIContent | null = data.modelContent || null;
    const functionCalls: Array<{ id?: string; name: string; args?: Record<string, unknown> }> =
      data.functionCalls || [];

    if (modelContent) {
      workingContents = [...workingContents, modelContent];
    }

    if (functionCalls.length === 0) {
      const replyText =
        (data.text as string) ||
        (executedActions.length > 0
          ? 'Pronto! Ação concluída com sucesso.'
          : 'Concluído.');
      return { replyText, updatedContents: workingContents, executedActions };
    }

    // Execute every tool call requested by Gemini and send responses back
    const responseParts: AIContentPart[] = [];
    for (const fc of functionCalls) {
      const { result, action } = await executeAIToolCall(fc, state, callbacks);
      if (action) executedActions.push(action);
      responseParts.push({
        functionResponse: {
          ...(fc.id ? { id: fc.id } : {}),
          name: fc.name,
          response: result,
        },
      });
    }

    workingContents = [
      ...workingContents,
      {
        role: 'user',
        parts: responseParts,
      },
    ];
  }

  return {
    replyText: 'Ações concluídas! Confira os cartões registrados abaixo.',
    updatedContents: workingContents,
    executedActions,
  };
}
