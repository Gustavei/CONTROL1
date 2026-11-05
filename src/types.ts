export type ProviderName = 'Oscar' | 'Tiago';

export interface RouteRecord {
  id: string;
  date: string; // YYYY-MM-DD
  provider: ProviderName;
  driverId: string;
  driverName: string;
  routeName: string;
  routeNumber: string;
  locality: string;
  volumes: number;
  packages: number;
  incidences: number;
  quality: number; // percentage: ((packages - incidences) / packages) * 100
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Driver {
  id: string;
  provider: ProviderName;
  name: string;
  phone?: string;
  status: 'active' | 'inactive';
  vehicleType?: string;
  licensePlate?: string;
  createdAt: string;
}

export type FuelType = 'Diesel S10' | 'Gasolina Comum' | 'Gasolina Aditivada' | 'Etanol' | 'GNV' | 'Arla 32';

export interface Vehicle {
  id: string;
  name: string; // Ex: "Furgoneta 01", "Van Master Oscar"
  plate: string; // Ex: "ABC-1234"
  model: string; // Ex: "Renault Master L3H2", "Fiat Fiorino 1.4"
  provider: ProviderName; // "Oscar" | "Tiago"
  defaultDriverName?: string;
  initialOdometer: number; // KM no momento do cadastro
  currentOdometer: number; // Odômetro atualizado
  fuelType: FuelType;
  tankCapacity?: number; // Capacidade do tanque em Litros
  status: 'active' | 'maintenance' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FuelLog {
  id: string;
  date: string; // YYYY-MM-DD
  provider: ProviderName;
  vehicleId?: string; // ID da furgoneta
  driverName: string;
  vehiclePlate: string;
  vehicleModel?: string;
  odometerKm: number; // KM no momento do abastecimento
  previousOdometerKm?: number | null; // Odômetro do último abastecimento
  distanceSinceLastFuel?: number | null; // KM rodados desde o último abastecimento
  fuelEfficiencyKmL?: number | null; // Média de consumo (KM / Litros)
  costPerKm?: number | null; // Custo por KM rodado (R$ / KM)
  fuelType: FuelType;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  stationName?: string;
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type MaintenanceType = 'Preventiva' | 'Corretiva';
export type MaintenanceStatus = 'Concluída' | 'Agendada' | 'Em Andamento';

export interface MaintenanceLog {
  id: string;
  date: string; // YYYY-MM-DD
  provider: ProviderName;
  vehicleId?: string;
  driverName?: string;
  vehiclePlate: string;
  vehicleModel?: string;
  odometerKm: number;
  type: MaintenanceType;
  category: string; // ex: Óleo e Filtros, Freios, Pneus, Suspensão, Motor, Elétrica, etc.
  description: string;
  cost: number;
  workshop: string;
  invoiceNumber?: string;
  nextMaintenanceKm?: number | null;
  nextMaintenanceDate?: string | null;
  status: MaintenanceStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MileageLog {
  id: string;
  date: string; // YYYY-MM-DD
  provider: ProviderName;
  vehicleId?: string; // ID da furgoneta
  driverName: string;
  vehiclePlate: string;
  vehicleModel?: string;
  routeNumber?: string;
  startKm: number; // KM Inicial da furgoneta
  endKm: number; // KM Final da furgoneta
  totalKm: number; // endKm - startKm
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type QualityClassification = 'VERDE' | 'AMARELO' | 'VERMELHO';

export interface QualityMetrics {
  totalRoutes: number;
  totalVolumes: number;
  totalPackages: number;
  totalIncidences: number;
  qualityPercentage: number;
  classification: QualityClassification;
  goalMet: boolean;
  deltaToGoal: number; // difference to 94%
}

export interface RankingItem {
  id: string;
  label: string;
  subLabel?: string;
  provider?: ProviderName;
  quality: number;
  totalRoutes: number;
  totalPackages: number;
  totalIncidences: number;
  classification: QualityClassification;
}

export interface FilterState {
  periodPreset: 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'year' | 'all' | 'custom';
  startDate: string;
  endDate: string;
  provider: 'all' | ProviderName;
  driverName: string;
  search: string;
}

export const CONTRACTUAL_GOAL = 94.0;
export const WARNING_THRESHOLD = 90.0;

export function getQualityClassification(percentage: number): QualityClassification {
  if (percentage > CONTRACTUAL_GOAL) return 'VERDE';
  if (percentage >= WARNING_THRESHOLD) return 'AMARELO';
  return 'VERMELHO';
}

export function calculateQuality(packages: number, incidences: number): number {
  if (!packages || packages <= 0) return 100;
  const qual = ((packages - incidences) / packages) * 100;
  return Math.max(0, Math.min(100, Number(qual.toFixed(2))));
}
