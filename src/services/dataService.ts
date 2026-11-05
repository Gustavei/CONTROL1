import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  getDoc,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import {
  RouteRecord,
  Driver,
  Vehicle,
  FuelLog,
  MaintenanceLog,
  MileageLog,
  calculateQuality,
} from '../types.ts';

const ROUTES_COLLECTION = 'routes';
const DRIVERS_COLLECTION = 'drivers';
const VEHICLES_COLLECTION = 'vehicles';
const FUEL_COLLECTION = 'fuel_logs';
const MAINTENANCE_COLLECTION = 'maintenance_logs';
const MILEAGE_COLLECTION = 'mileage_logs';

/**
 * Removes any undefined properties to prevent Firestore serialization errors
 */
function sanitizeData<T extends Record<string, any>>(obj: T): T {
  const clean: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean as T;
}

export function subscribeRoutes(
  onData: (routes: RouteRecord[]) => void,
  onError?: (err: unknown) => void
) {
  const q = query(collection(db, ROUTES_COLLECTION), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const routes: RouteRecord[] = [];
      snapshot.forEach((doc) => {
        routes.push({ id: doc.id, ...doc.data() } as RouteRecord);
      });
      onData(routes);
    },
    (error) => {
      console.error('Error fetching routes:', error);
      handleFirestoreError(error, OperationType.LIST, ROUTES_COLLECTION);
      if (onError) onError(error);
    }
  );
}

export function subscribeDrivers(
  onData: (drivers: Driver[]) => void,
  onError?: (err: unknown) => void
) {
  const q = query(collection(db, DRIVERS_COLLECTION), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const drivers: Driver[] = [];
      snapshot.forEach((doc) => {
        drivers.push({ id: doc.id, ...doc.data() } as Driver);
      });
      onData(drivers);
    },
    (error) => {
      console.error('Error fetching drivers:', error);
      handleFirestoreError(error, OperationType.LIST, DRIVERS_COLLECTION);
      if (onError) onError(error);
    }
  );
}

export function subscribeVehicles(
  onData: (vehicles: Vehicle[]) => void,
  onError?: (err: unknown) => void
) {
  const q = query(collection(db, VEHICLES_COLLECTION), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const vehicles: Vehicle[] = [];
      snapshot.forEach((doc) => {
        vehicles.push({ id: doc.id, ...doc.data() } as Vehicle);
      });
      onData(vehicles);
    },
    (error) => {
      console.error('Error fetching vehicles:', error);
      handleFirestoreError(error, OperationType.LIST, VEHICLES_COLLECTION);
      if (onError) onError(error);
    }
  );
}

export function subscribeFuelLogs(
  onData: (logs: FuelLog[]) => void,
  onError?: (err: unknown) => void
) {
  const q = query(collection(db, FUEL_COLLECTION), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs: FuelLog[] = [];
      snapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() } as FuelLog);
      });
      onData(logs);
    },
    (error) => {
      console.error('Error fetching fuel logs:', error);
      handleFirestoreError(error, OperationType.LIST, FUEL_COLLECTION);
      if (onError) onError(error);
    }
  );
}

export function subscribeMaintenanceLogs(
  onData: (logs: MaintenanceLog[]) => void,
  onError?: (err: unknown) => void
) {
  const q = query(collection(db, MAINTENANCE_COLLECTION), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs: MaintenanceLog[] = [];
      snapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() } as MaintenanceLog);
      });
      onData(logs);
    },
    (error) => {
      console.error('Error fetching maintenance logs:', error);
      handleFirestoreError(error, OperationType.LIST, MAINTENANCE_COLLECTION);
      if (onError) onError(error);
    }
  );
}

export function subscribeMileageLogs(
  onData: (logs: MileageLog[]) => void,
  onError?: (err: unknown) => void
) {
  const q = query(collection(db, MILEAGE_COLLECTION), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs: MileageLog[] = [];
      snapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() } as MileageLog);
      });
      onData(logs);
    },
    (error) => {
      console.error('Error fetching mileage logs:', error);
      handleFirestoreError(error, OperationType.LIST, MILEAGE_COLLECTION);
      if (onError) onError(error);
    }
  );
}

export async function addRoute(route: Omit<RouteRecord, 'id' | 'createdAt'>): Promise<string> {
  const id = `rt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const quality = calculateQuality(route.packages, route.incidences);
  const newRoute: RouteRecord = {
    ...route,
    id,
    quality,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, ROUTES_COLLECTION, id), sanitizeData(newRoute));
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${ROUTES_COLLECTION}/${id}`);
    throw error;
  }
}

export async function updateRoute(id: string, updates: Partial<RouteRecord>): Promise<void> {
  try {
    let finalUpdates = { ...updates, updatedAt: new Date().toISOString() };
    if (updates.packages !== undefined || updates.incidences !== undefined) {
      const pkgs = updates.packages ?? 1;
      const incs = updates.incidences ?? 0;
      finalUpdates.quality = calculateQuality(pkgs, incs);
    }
    await updateDoc(doc(db, ROUTES_COLLECTION, id), sanitizeData(finalUpdates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ROUTES_COLLECTION}/${id}`);
    throw error;
  }
}

export async function deleteRoute(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, ROUTES_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ROUTES_COLLECTION}/${id}`);
    throw error;
  }
}

export async function addDriver(driver: Omit<Driver, 'id' | 'createdAt'>): Promise<string> {
  const id = `drv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newDriver: Driver = {
    ...driver,
    id,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, DRIVERS_COLLECTION, id), sanitizeData(newDriver));
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${DRIVERS_COLLECTION}/${id}`);
    throw error;
  }
}

export async function updateDriver(id: string, updates: Partial<Driver>): Promise<void> {
  try {
    await updateDoc(doc(db, DRIVERS_COLLECTION, id), sanitizeData(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${DRIVERS_COLLECTION}/${id}`);
    throw error;
  }
}

export async function deleteDriver(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, DRIVERS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${DRIVERS_COLLECTION}/${id}`);
    throw error;
  }
}

// Vehicles (Furgonetas) CRUD
export async function addVehicle(vehicle: Omit<Vehicle, 'id' | 'createdAt'>): Promise<string> {
  const id = `veh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const initKm = Number(vehicle.initialOdometer) || 0;
  const currentKm = Number(vehicle.currentOdometer) || initKm;
  const newVehicle: Vehicle = {
    ...vehicle,
    id,
    plate: vehicle.plate.trim().toUpperCase(),
    initialOdometer: initKm,
    currentOdometer: currentKm,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, VEHICLES_COLLECTION, id), sanitizeData(newVehicle));
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${VEHICLES_COLLECTION}/${id}`);
    throw error;
  }
}

export async function updateVehicle(id: string, updates: Partial<Vehicle>): Promise<void> {
  try {
    const sanitized = {
      ...updates,
      ...(updates.plate ? { plate: updates.plate.trim().toUpperCase() } : {}),
      ...(updates.initialOdometer !== undefined ? { initialOdometer: Number(updates.initialOdometer) || 0 } : {}),
      ...(updates.currentOdometer !== undefined ? { currentOdometer: Number(updates.currentOdometer) || 0 } : {}),
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(doc(db, VEHICLES_COLLECTION, id), sanitizeData(sanitized));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${VEHICLES_COLLECTION}/${id}`);
    throw error;
  }
}

export async function deleteVehicle(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, VEHICLES_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${VEHICLES_COLLECTION}/${id}`);
    throw error;
  }
}

export async function getLastFuelLogForVehicle(plate: string, beforeOdometer?: number): Promise<FuelLog | null> {
  try {
    const snap = await getDocs(query(collection(db, FUEL_COLLECTION), orderBy('date', 'desc')));
    const logs = snap.docs.map((d) => d.data() as FuelLog);
    const filtered = logs.filter((f) => {
      const matchPlate = f.vehiclePlate && f.vehiclePlate.trim().toUpperCase() === plate.trim().toUpperCase();
      const matchKm = beforeOdometer ? Number(f.odometerKm) < beforeOdometer : true;
      return matchPlate && matchKm;
    });
    if (filtered.length === 0) return null;
    filtered.sort((a, b) => (Number(b.odometerKm) || 0) - (Number(a.odometerKm) || 0));
    return filtered[0];
  } catch (err) {
    console.error('Error fetching last fuel log:', err);
    return null;
  }
}

// Fuel Logs CRUD
export async function addFuelLog(log: Omit<FuelLog, 'id' | 'createdAt'>): Promise<string> {
  const id = `fuel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  let previousOdometerKm: number | null = log.previousOdometerKm !== undefined ? log.previousOdometerKm : null;
  let distanceSinceLastFuel: number | null = log.distanceSinceLastFuel !== undefined ? log.distanceSinceLastFuel : null;
  let fuelEfficiencyKmL: number | null = log.fuelEfficiencyKmL !== undefined ? log.fuelEfficiencyKmL : null;
  let costPerKm: number | null = log.costPerKm !== undefined ? log.costPerKm : null;

  // Auto calculate comparison if not pre-calculated
  if (previousOdometerKm === null && log.vehiclePlate) {
    try {
      const prev = await getLastFuelLogForVehicle(log.vehiclePlate, Number(log.odometerKm));
      if (prev && prev.odometerKm) {
        previousOdometerKm = Number(prev.odometerKm);
        const dist = Number(log.odometerKm) - Number(prev.odometerKm);
        if (dist > 0) {
          distanceSinceLastFuel = dist;
          if (Number(log.liters) > 0) {
            fuelEfficiencyKmL = Number((dist / Number(log.liters)).toFixed(2));
          }
          if (Number(log.totalCost) > 0) {
            costPerKm = Number((Number(log.totalCost) / dist).toFixed(2));
          }
        }
      }
    } catch (e) {
      console.warn('Could not auto-calculate fuel delta:', e);
    }
  }

  const newLog: FuelLog = {
    ...log,
    id,
    previousOdometerKm,
    distanceSinceLastFuel,
    fuelEfficiencyKmL,
    costPerKm,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, FUEL_COLLECTION, id), sanitizeData(newLog));

    // Update vehicle's currentOdometer if applicable
    if (log.vehicleId) {
      try {
        const vRef = doc(db, VEHICLES_COLLECTION, log.vehicleId);
        const vSnap = await getDoc(vRef);
        if (vSnap.exists()) {
          const vData = vSnap.data() as Vehicle;
          if (Number(log.odometerKm) > (Number(vData.currentOdometer) || 0)) {
            await updateDoc(vRef, { currentOdometer: Number(log.odometerKm), updatedAt: new Date().toISOString() });
          }
        }
      } catch (err) {
        console.warn('Error updating vehicle odometer:', err);
      }
    }

    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${FUEL_COLLECTION}/${id}`);
    throw error;
  }
}

export async function updateFuelLog(id: string, updates: Partial<FuelLog>): Promise<void> {
  try {
    await updateDoc(doc(db, FUEL_COLLECTION, id), sanitizeData({
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${FUEL_COLLECTION}/${id}`);
    throw error;
  }
}

export async function deleteFuelLog(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, FUEL_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${FUEL_COLLECTION}/${id}`);
    throw error;
  }
}

// Maintenance Logs CRUD
export async function addMaintenanceLog(log: Omit<MaintenanceLog, 'id' | 'createdAt'>): Promise<string> {
  const id = `maint_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newLog: MaintenanceLog = {
    ...log,
    id,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, MAINTENANCE_COLLECTION, id), sanitizeData(newLog));
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${MAINTENANCE_COLLECTION}/${id}`);
    throw error;
  }
}

export async function updateMaintenanceLog(id: string, updates: Partial<MaintenanceLog>): Promise<void> {
  try {
    await updateDoc(doc(db, MAINTENANCE_COLLECTION, id), sanitizeData({
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${MAINTENANCE_COLLECTION}/${id}`);
    throw error;
  }
}

export async function deleteMaintenanceLog(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, MAINTENANCE_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${MAINTENANCE_COLLECTION}/${id}`);
    throw error;
  }
}

// Mileage Logs CRUD
export async function addMileageLog(log: Omit<MileageLog, 'id' | 'createdAt'>): Promise<string> {
  const id = `km_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const totalKm = Math.max(0, (Number(log.endKm) || 0) - (Number(log.startKm) || 0));
  const newLog: MileageLog = {
    ...log,
    id,
    totalKm,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, MILEAGE_COLLECTION, id), sanitizeData(newLog));

    // Update vehicle's currentOdometer if applicable
    if (log.vehicleId) {
      try {
        const vRef = doc(db, VEHICLES_COLLECTION, log.vehicleId);
        const vSnap = await getDoc(vRef);
        if (vSnap.exists()) {
          const vData = vSnap.data() as Vehicle;
          const endNum = Number(log.endKm) || 0;
          if (endNum > (Number(vData.currentOdometer) || 0)) {
            await updateDoc(vRef, { currentOdometer: endNum, updatedAt: new Date().toISOString() });
          }
        }
      } catch (err) {
        console.warn('Error updating vehicle odometer on mileage entry:', err);
      }
    }

    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${MILEAGE_COLLECTION}/${id}`);
    throw error;
  }
}

export async function updateMileageLog(id: string, updates: Partial<MileageLog>): Promise<void> {
  try {
    let finalUpdates = { ...updates, updatedAt: new Date().toISOString() };
    if (updates.startKm !== undefined || updates.endKm !== undefined) {
      const s = Number(updates.startKm) || 0;
      const e = Number(updates.endKm) || 0;
      finalUpdates.totalKm = Math.max(0, e - s);
    }
    await updateDoc(doc(db, MILEAGE_COLLECTION, id), sanitizeData(finalUpdates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${MILEAGE_COLLECTION}/${id}`);
    throw error;
  }
}

export async function deleteMileageLog(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, MILEAGE_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${MILEAGE_COLLECTION}/${id}`);
    throw error;
  }
}

export async function deleteAllRoutes(): Promise<number> {
  try {
    const snap = await getDocs(collection(db, ROUTES_COLLECTION));
    const count = snap.size;
    if (count === 0) return 0;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, ROUTES_COLLECTION);
    throw error;
  }
}

// Initial realistic seed only once per system lifetime
export async function seedInitialDataIfEmpty(): Promise<boolean> {
  try {
    // 1. Check local browser storage marker
    if (typeof window !== 'undefined' && localStorage.getItem('gls_system_seeded') === 'true') {
      return false;
    }

    // 2. Check persistent flag in Firestore settings collection
    const initRef = doc(db, 'settings', 'system_init');
    const initSnap = await getDoc(initRef);
    if (initSnap.exists()) {
      if (typeof window !== 'undefined') localStorage.setItem('gls_system_seeded', 'true');
      return false; // Already initialized in Firestore! Never re-seed even if all routes were deleted.
    }

    // 3. Check if routes already exist in Firestore
    const existingRoutes = await getDocs(collection(db, ROUTES_COLLECTION));
    if (!existingRoutes.empty) {
      await setDoc(initRef, { seeded: true, initializedAt: new Date().toISOString() });
      if (typeof window !== 'undefined') localStorage.setItem('gls_system_seeded', 'true');
      return false;
    }

    // Mark as seeded BEFORE inserting documents
    await setDoc(initRef, { seeded: true, initializedAt: new Date().toISOString() });
    if (typeof window !== 'undefined') localStorage.setItem('gls_system_seeded', 'true');

    const defaultDrivers: Driver[] = [
      { id: 'drv_osc_1', provider: 'Oscar', name: 'Carlos Silva', phone: '(11) 98765-4321', status: 'active', vehicleType: 'Van Master', licensePlate: 'ABC-1234', createdAt: new Date().toISOString() },
      { id: 'drv_osc_2', provider: 'Oscar', name: 'Roberto Mendes', phone: '(11) 98765-4322', status: 'active', vehicleType: 'Fiorino 1.4', licensePlate: 'DEF-5678', createdAt: new Date().toISOString() },
      { id: 'drv_osc_3', provider: 'Oscar', name: 'Lucas Rocha', phone: '(11) 98765-4323', status: 'active', vehicleType: 'Sprinter 415', licensePlate: 'GHI-9012', createdAt: new Date().toISOString() },
      { id: 'drv_osc_4', provider: 'Oscar', name: 'Fernando Alves', phone: '(11) 98765-4324', status: 'active', vehicleType: 'Daily 35S14', licensePlate: 'JKL-3456', createdAt: new Date().toISOString() },
      { id: 'drv_osc_5', provider: 'Oscar', name: 'Marcelo Lima', phone: '(11) 98765-4325', status: 'active', vehicleType: 'Ducato Maxi', licensePlate: 'MNO-7890', createdAt: new Date().toISOString() },

      { id: 'drv_tia_1', provider: 'Tiago', name: 'Anderson Souza', phone: '(11) 97654-3211', status: 'active', vehicleType: 'Sprinter 516', licensePlate: 'PQR-1122', createdAt: new Date().toISOString() },
      { id: 'drv_tia_2', provider: 'Tiago', name: 'Diego Pereira', phone: '(11) 97654-3212', status: 'active', vehicleType: 'Master L3H2', licensePlate: 'STU-3344', createdAt: new Date().toISOString() },
      { id: 'drv_tia_3', provider: 'Tiago', name: 'Rafael Costa', phone: '(11) 97654-3213', status: 'active', vehicleType: 'Fiorino Endurance', licensePlate: 'VWX-5566', createdAt: new Date().toISOString() },
      { id: 'drv_tia_4', provider: 'Tiago', name: 'Bruno Martins', phone: '(11) 97654-3214', status: 'active', vehicleType: 'Jumpy Cargo', licensePlate: 'YZA-7788', createdAt: new Date().toISOString() },
      { id: 'drv_tia_5', provider: 'Tiago', name: 'Eduardo Santos', phone: '(11) 97654-3215', status: 'active', vehicleType: 'Expert Business', licensePlate: 'BCD-9900', createdAt: new Date().toISOString() },
    ];

    for (const drv of defaultDrivers) {
      await setDoc(doc(db, DRIVERS_COLLECTION, drv.id), drv);
    }

    // Seed recent delivery days
    const today = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const initialRoutes: Omit<RouteRecord, 'id' | 'createdAt'>[] = [
      // Today / recent Oscar
      { date: dates[0], provider: 'Oscar', driverId: 'drv_osc_1', driverName: 'Carlos Silva', routeName: 'Rota Centro Comercial', routeNumber: 'RT-101', locality: 'Centro Expandido', volumes: 320, packages: 290, incidences: 6, quality: calculateQuality(290, 6), notes: 'Alta densidade de entregas' },
      { date: dates[0], provider: 'Oscar', driverId: 'drv_osc_2', driverName: 'Roberto Mendes', routeName: 'Rota Zona Sul A', routeNumber: 'RT-102', locality: 'Vila Mariana / Moema', volumes: 250, packages: 220, incidences: 14, quality: calculateQuality(220, 14), notes: 'Chuva no final da tarde gerou retenções' },
      { date: dates[0], provider: 'Oscar', driverId: 'drv_osc_3', driverName: 'Lucas Rocha', routeName: 'Rota Industrial Norte', routeNumber: 'RT-103', locality: 'Distrito Industrial', volumes: 380, packages: 350, incidences: 8, quality: calculateQuality(350, 8), notes: 'Empresas e galpões comerciais' },
      
      // Today / recent Tiago
      { date: dates[0], provider: 'Tiago', driverId: 'drv_tia_1', driverName: 'Anderson Souza', routeName: 'Rota Metropolitana Leste', routeNumber: 'RT-201', locality: 'Tatuapé / Penha', volumes: 290, packages: 260, incidences: 11, quality: calculateQuality(260, 11), notes: 'Excelente ritmo' },
      { date: dates[0], provider: 'Tiago', driverId: 'drv_tia_2', driverName: 'Diego Pereira', routeName: 'Rota Oeste Nobre', routeNumber: 'RT-202', locality: 'Pinheiros / Perdizes', volumes: 270, packages: 240, incidences: 5, quality: calculateQuality(240, 5), notes: 'Meta atingida com folga' },
      { date: dates[0], provider: 'Tiago', driverId: 'drv_tia_3', driverName: 'Rafael Costa', routeName: 'Rota Anel Viário', routeNumber: 'RT-203', locality: 'Marginal Pinheiros', volumes: 310, packages: 280, incidences: 28, quality: calculateQuality(280, 28), notes: 'Acidente de trânsito interditou acesso à ponte' },

      // Yesterday Oscar
      { date: dates[1], provider: 'Oscar', driverId: 'drv_osc_4', driverName: 'Fernando Alves', routeName: 'Rota Sudeste', routeNumber: 'RT-104', locality: 'Ipiranga / Sacomã', volumes: 260, packages: 230, incidences: 7, quality: calculateQuality(230, 7) },
      { date: dates[1], provider: 'Oscar', driverId: 'drv_osc_5', driverName: 'Marcelo Lima', routeName: 'Rota Noroeste', routeNumber: 'RT-105', locality: 'Freguesia do Ó / Limão', volumes: 240, packages: 210, incidences: 4, quality: calculateQuality(210, 4) },
      { date: dates[1], provider: 'Oscar', driverId: 'drv_osc_1', driverName: 'Carlos Silva', routeName: 'Rota Centro Histórico', routeNumber: 'RT-106', locality: 'Sé / República', volumes: 295, packages: 265, incidences: 10, quality: calculateQuality(265, 10) },

      // Yesterday Tiago
      { date: dates[1], provider: 'Tiago', driverId: 'drv_tia_4', driverName: 'Bruno Martins', routeName: 'Rota Litoral Sul', routeNumber: 'RT-204', locality: 'Santos / Baixada', volumes: 340, packages: 300, incidences: 12, quality: calculateQuality(300, 12) },
      { date: dates[1], provider: 'Tiago', driverId: 'drv_tia_5', driverName: 'Eduardo Santos', routeName: 'Rota ABC Paulista', routeNumber: 'RT-205', locality: 'Santo André / SBC', volumes: 330, packages: 290, incidences: 9, quality: calculateQuality(290, 9) },
      { date: dates[1], provider: 'Tiago', driverId: 'drv_tia_1', driverName: 'Anderson Souza', routeName: 'Rota Aeroporto', routeNumber: 'RT-206', locality: 'Cumbica / Guarulhos', volumes: 350, packages: 310, incidences: 8, quality: calculateQuality(310, 8) },

      // Previous days
      { date: dates[2], provider: 'Oscar', driverId: 'drv_osc_2', driverName: 'Roberto Mendes', routeName: 'Rota Vila Velha Sul', routeNumber: 'RT-107', locality: 'Jardim Paulista', volumes: 280, packages: 250, incidences: 6, quality: calculateQuality(250, 6) },
      { date: dates[2], provider: 'Tiago', driverId: 'drv_tia_2', driverName: 'Diego Pereira', routeName: 'Rota Granja Viana', routeNumber: 'RT-207', locality: 'Cotia / Granja', volumes: 210, packages: 190, incidences: 5, quality: calculateQuality(190, 5) },
      { date: dates[3], provider: 'Oscar', driverId: 'drv_osc_3', driverName: 'Lucas Rocha', routeName: 'Rota Alpha Empresarial', routeNumber: 'RT-108', locality: 'Barueri / Alphaville', volumes: 360, packages: 330, incidences: 15, quality: calculateQuality(330, 15) },
      { date: dates[3], provider: 'Tiago', driverId: 'drv_tia_3', driverName: 'Rafael Costa', routeName: 'Rota Morumbi / Panamby', routeNumber: 'RT-208', locality: 'Morumbi', volumes: 275, packages: 245, incidences: 11, quality: calculateQuality(245, 11) },
      { date: dates[4], provider: 'Oscar', driverId: 'drv_osc_4', driverName: 'Fernando Alves', routeName: 'Rota Santana', routeNumber: 'RT-109', locality: 'Zona Norte', volumes: 290, packages: 260, incidences: 5, quality: calculateQuality(260, 5) },
      { date: dates[4], provider: 'Tiago', driverId: 'drv_tia_5', driverName: 'Eduardo Santos', routeName: 'Rota Osasco Centro', routeNumber: 'RT-209', locality: 'Osasco', volumes: 310, packages: 280, incidences: 13, quality: calculateQuality(280, 13) },
    ];

    for (let i = 0; i < initialRoutes.length; i++) {
      const r = initialRoutes[i];
      const id = `seed_rt_${i + 1}`;
      await setDoc(doc(db, ROUTES_COLLECTION, id), {
        ...r,
        id,
        createdAt: new Date().toISOString(),
      });
    }

    return true;
  } catch (err) {
    console.error('Error during data initialization:', err);
    return false;
  }
}

// Fleet initial seed if fleet records are empty
// Seed initial vehicles if empty
export async function seedVehiclesIfEmpty(): Promise<boolean> {
  try {
    const existingVehicles = await getDocs(collection(db, VEHICLES_COLLECTION));
    if (!existingVehicles.empty) {
      return false;
    }

    const defaultVehicles: Vehicle[] = [
      {
        id: 'veh_osc_1',
        name: 'Furgoneta 01 - Master',
        plate: 'ABC-1234',
        model: 'Renault Master L3H2',
        provider: 'Oscar',
        defaultDriverName: 'Carlos Silva',
        initialOdometer: 110000,
        currentOdometer: 112500,
        fuelType: 'Diesel S10',
        tankCapacity: 80,
        status: 'active',
        notes: 'Furgoneta principal para entregas em rota comercial',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'veh_osc_2',
        name: 'Furgoneta 02 - Fiorino',
        plate: 'DEF-5678',
        model: 'Fiat Fiorino 1.4 EVO',
        provider: 'Oscar',
        defaultDriverName: 'Roberto Mendes',
        initialOdometer: 76000,
        currentOdometer: 78400,
        fuelType: 'Gasolina Comum',
        tankCapacity: 55,
        status: 'active',
        notes: 'Furgoneta ágil para entregas urbanas na Zona Sul',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'veh_osc_3',
        name: 'Furgoneta 03 - Sprinter',
        plate: 'GHI-9012',
        model: 'Mercedes-Benz Sprinter 415',
        provider: 'Oscar',
        defaultDriverName: 'Lucas Rocha',
        initialOdometer: 128000,
        currentOdometer: 130100,
        fuelType: 'Diesel S10',
        tankCapacity: 75,
        status: 'active',
        notes: 'Furgoneta de grande porte para rotas industriais',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'veh_tia_1',
        name: 'Furgoneta 04 - Sprinter',
        plate: 'PQR-1122',
        model: 'Mercedes-Benz Sprinter 516',
        provider: 'Tiago',
        defaultDriverName: 'Anderson Souza',
        initialOdometer: 142000,
        currentOdometer: 145200,
        fuelType: 'Diesel S10',
        tankCapacity: 75,
        status: 'active',
        notes: 'Furgoneta pesada com alta capacidade volumétrica',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'veh_tia_2',
        name: 'Furgoneta 05 - Master',
        plate: 'STU-3344',
        model: 'Renault Master L3H2',
        provider: 'Tiago',
        defaultDriverName: 'Diego Pereira',
        initialOdometer: 87000,
        currentOdometer: 89600,
        fuelType: 'Diesel S10',
        tankCapacity: 80,
        status: 'active',
        notes: 'Furgoneta revisada com excelente consumo',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'veh_tia_3',
        name: 'Furgoneta 06 - Fiorino',
        plate: 'VWX-5566',
        model: 'Fiat Fiorino Endurance',
        provider: 'Tiago',
        defaultDriverName: 'Rafael Costa',
        initialOdometer: 50000,
        currentOdometer: 52300,
        fuelType: 'Gasolina Comum',
        tankCapacity: 55,
        status: 'active',
        notes: 'Furgoneta compacta com revisão recente',
        createdAt: new Date().toISOString(),
      },
    ];

    for (const v of defaultVehicles) {
      await setDoc(doc(db, VEHICLES_COLLECTION, v.id), sanitizeData(v));
    }

    return true;
  } catch (err) {
    console.error('Error seeding vehicles:', err);
    return false;
  }
}

// Fleet initial seed if fleet records are empty
export async function seedInitialFleetDataIfEmpty(): Promise<boolean> {
  try {
    // Also ensure vehicles are seeded
    await seedVehiclesIfEmpty();

    if (typeof window !== 'undefined' && localStorage.getItem('gls_fleet_seeded') === 'true') {
      return false;
    }

    const initRef = doc(db, 'settings', 'fleet_init');
    const initSnap = await getDoc(initRef);
    if (initSnap.exists()) {
      if (typeof window !== 'undefined') localStorage.setItem('gls_fleet_seeded', 'true');
      return false;
    }

    const existingFuel = await getDocs(collection(db, FUEL_COLLECTION));
    if (!existingFuel.empty) {
      await setDoc(initRef, { seeded: true, initializedAt: new Date().toISOString() });
      if (typeof window !== 'undefined') localStorage.setItem('gls_fleet_seeded', 'true');
      return false;
    }

    await setDoc(initRef, { seeded: true, initializedAt: new Date().toISOString() });
    if (typeof window !== 'undefined') localStorage.setItem('gls_fleet_seeded', 'true');

    const todayStr = new Date().toISOString().split('T')[0];
    const y1 = new Date(); y1.setDate(y1.getDate() - 1); const y1Str = y1.toISOString().split('T')[0];
    const y2 = new Date(); y2.setDate(y2.getDate() - 2); const y2Str = y2.toISOString().split('T')[0];
    const y3 = new Date(); y3.setDate(y3.getDate() - 3); const y3Str = y3.toISOString().split('T')[0];

    const sampleFuel: Omit<FuelLog, 'id' | 'createdAt'>[] = [
      {
        date: todayStr,
        provider: 'Oscar',
        vehicleId: 'veh_osc_1',
        driverName: 'Carlos Silva',
        vehiclePlate: 'ABC-1234',
        vehicleModel: 'Renault Master L3H2',
        odometerKm: 112500,
        previousOdometerKm: 111850,
        distanceSinceLastFuel: 650,
        fuelEfficiencyKmL: 10.0,
        costPerKm: 0.61,
        fuelType: 'Diesel S10',
        liters: 65,
        pricePerLiter: 6.05,
        totalCost: 393.25,
        stationName: 'Posto Ipiranga Rodoanel',
        receiptNumber: 'NF-8821',
      },
      {
        date: todayStr,
        provider: 'Tiago',
        vehicleId: 'veh_tia_1',
        driverName: 'Anderson Souza',
        vehiclePlate: 'PQR-1122',
        vehicleModel: 'Mercedes-Benz Sprinter 516',
        odometerKm: 145200,
        previousOdometerKm: 144480,
        distanceSinceLastFuel: 720,
        fuelEfficiencyKmL: 9.6,
        costPerKm: 0.64,
        fuelType: 'Diesel S10',
        liters: 75,
        pricePerLiter: 6.10,
        totalCost: 457.50,
        stationName: 'Posto Petrobras Dutra',
        receiptNumber: 'NF-9042',
      },
      {
        date: y1Str,
        provider: 'Oscar',
        vehicleId: 'veh_osc_2',
        driverName: 'Roberto Mendes',
        vehiclePlate: 'DEF-5678',
        vehicleModel: 'Fiat Fiorino 1.4 EVO',
        odometerKm: 78400,
        previousOdometerKm: 77880,
        distanceSinceLastFuel: 520,
        fuelEfficiencyKmL: 11.56,
        costPerKm: 0.51,
        fuelType: 'Gasolina Comum',
        liters: 45,
        pricePerLiter: 5.95,
        totalCost: 267.75,
        stationName: 'Posto Shell Marginal',
        receiptNumber: 'NF-7634',
      },
      {
        date: y1Str,
        provider: 'Tiago',
        vehicleId: 'veh_tia_2',
        driverName: 'Diego Pereira',
        vehiclePlate: 'STU-3344',
        vehicleModel: 'Renault Master L3H2',
        odometerKm: 89600,
        previousOdometerKm: 88920,
        distanceSinceLastFuel: 680,
        fuelEfficiencyKmL: 10.0,
        costPerKm: 0.61,
        fuelType: 'Diesel S10',
        liters: 68,
        pricePerLiter: 6.05,
        totalCost: 411.40,
        stationName: 'Posto Graal Castelo Branco',
        receiptNumber: 'NF-6612',
      },
      {
        date: y2Str,
        provider: 'Oscar',
        vehicleId: 'veh_osc_3',
        driverName: 'Lucas Rocha',
        vehiclePlate: 'GHI-9012',
        vehicleModel: 'Mercedes-Benz Sprinter 415',
        odometerKm: 130100,
        previousOdometerKm: 129400,
        distanceSinceLastFuel: 700,
        fuelEfficiencyKmL: 10.0,
        costPerKm: 0.61,
        fuelType: 'Diesel S10',
        liters: 70,
        pricePerLiter: 6.08,
        totalCost: 425.60,
        stationName: 'Posto Ipiranga Bandeirantes',
        receiptNumber: 'NF-5491',
      },
      {
        date: y3Str,
        provider: 'Tiago',
        vehicleId: 'veh_tia_3',
        driverName: 'Rafael Costa',
        vehiclePlate: 'VWX-5566',
        vehicleModel: 'Fiat Fiorino Endurance',
        odometerKm: 52300,
        previousOdometerKm: 51800,
        distanceSinceLastFuel: 500,
        fuelEfficiencyKmL: 11.9,
        costPerKm: 0.5,
        fuelType: 'Gasolina Comum',
        liters: 42,
        pricePerLiter: 5.99,
        totalCost: 251.58,
        stationName: 'Auto Posto Anhanguera',
        receiptNumber: 'NF-4321',
      },
    ];

    for (let i = 0; i < sampleFuel.length; i++) {
      const id = `seed_fuel_${i + 1}`;
      await setDoc(doc(db, FUEL_COLLECTION, id), sanitizeData({ ...sampleFuel[i], id, createdAt: new Date().toISOString() }));
    }

    const sampleMaintenance: Omit<MaintenanceLog, 'id' | 'createdAt'>[] = [
      { date: y2Str, provider: 'Oscar', vehicleId: 'veh_osc_1', driverName: 'Carlos Silva', vehiclePlate: 'ABC-1234', vehicleModel: 'Renault Master L3H2', odometerKm: 110000, type: 'Preventiva', category: 'Óleo e Filtros', description: 'Troca de Óleo 5W30 Sintético, Filtro de Óleo, Combustível e Ar', cost: 580, workshop: 'Oficina Mecânica RodoSul', invoiceNumber: 'OS-1044', nextMaintenanceKm: 120000, nextMaintenanceDate: '2026-12-15', status: 'Concluída' },
      { date: y3Str, provider: 'Oscar', vehicleId: 'veh_osc_2', driverName: 'Roberto Mendes', vehiclePlate: 'DEF-5678', vehicleModel: 'Fiat Fiorino 1.4 EVO', odometerKm: 75000, type: 'Preventiva', category: 'Freios e Pastilhas', description: 'Substituição de pastilhas de freio dianteiras, discos e alinhamento', cost: 420, workshop: 'Centro Automotivo Paulista', invoiceNumber: 'OS-1089', nextMaintenanceKm: 85000, status: 'Concluída' },
      { date: y1Str, provider: 'Tiago', vehicleId: 'veh_tia_1', driverName: 'Anderson Souza', vehiclePlate: 'PQR-1122', vehicleModel: 'Mercedes-Benz Sprinter 516', odometerKm: 140000, type: 'Preventiva', category: 'Pneus e Geometria', description: 'Troca de 2 Pneus dianteiros aro 16 de carga e balanceamento computadorizado', cost: 1680, workshop: 'Pneus & Cia Distribuidora', invoiceNumber: 'OS-2022', nextMaintenanceKm: 160000, status: 'Concluída' },
      { date: y2Str, provider: 'Tiago', vehicleId: 'veh_tia_3', driverName: 'Rafael Costa', vehiclePlate: 'VWX-5566', vehicleModel: 'Fiat Fiorino Endurance', odometerKm: 51000, type: 'Preventiva', category: 'Revisão Geral', description: 'Revisão periódica programada de 50.000 KM', cost: 350, workshop: 'Oficina Central Auto', invoiceNumber: 'OS-2115', nextMaintenanceKm: 60000, status: 'Concluída' },
    ];

    for (let i = 0; i < sampleMaintenance.length; i++) {
      const id = `seed_maint_${i + 1}`;
      await setDoc(doc(db, MAINTENANCE_COLLECTION, id), sanitizeData({ ...sampleMaintenance[i], id, createdAt: new Date().toISOString() }));
    }

    const sampleMileage: Omit<MileageLog, 'id' | 'createdAt'>[] = [
      { date: todayStr, provider: 'Oscar', vehicleId: 'veh_osc_1', driverName: 'Carlos Silva', vehiclePlate: 'ABC-1234', vehicleModel: 'Renault Master L3H2', routeNumber: 'RT-101', startKm: 112320, endKm: 112500, totalKm: 180, notes: 'Rota comercial cumprida' },
      { date: todayStr, provider: 'Oscar', vehicleId: 'veh_osc_2', driverName: 'Roberto Mendes', vehiclePlate: 'DEF-5678', vehicleModel: 'Fiat Fiorino 1.4 EVO', routeNumber: 'RT-102', startKm: 78260, endKm: 78400, totalKm: 140, notes: 'Entregas na Zona Sul' },
      { date: todayStr, provider: 'Tiago', vehicleId: 'veh_tia_1', driverName: 'Anderson Souza', vehiclePlate: 'PQR-1122', vehicleModel: 'Mercedes-Benz Sprinter 516', routeNumber: 'RT-201', startKm: 144980, endKm: 145200, totalKm: 220, notes: 'Metropolitana Leste' },
      { date: todayStr, provider: 'Tiago', vehicleId: 'veh_tia_2', driverName: 'Diego Pereira', vehiclePlate: 'STU-3344', vehicleModel: 'Renault Master L3H2', routeNumber: 'RT-202', startKm: 89435, endKm: 89600, totalKm: 165, notes: 'Zona Oeste e Pinheiros' },
      { date: y1Str, provider: 'Oscar', vehicleId: 'veh_osc_3', driverName: 'Lucas Rocha', vehiclePlate: 'GHI-9012', vehicleModel: 'Mercedes-Benz Sprinter 415', routeNumber: 'RT-103', startKm: 129890, endKm: 130100, totalKm: 210 },
      { date: y1Str, provider: 'Tiago', vehicleId: 'veh_tia_3', driverName: 'Rafael Costa', vehiclePlate: 'VWX-5566', vehicleModel: 'Fiat Fiorino Endurance', routeNumber: 'RT-203', startKm: 52120, endKm: 52300, totalKm: 180 },
    ];

    for (let i = 0; i < sampleMileage.length; i++) {
      const id = `seed_km_${i + 1}`;
      await setDoc(doc(db, MILEAGE_COLLECTION, id), sanitizeData({ ...sampleMileage[i], id, createdAt: new Date().toISOString() }));
    }

    return true;
  } catch (err) {
    console.error('Error during fleet data initialization:', err);
    return false;
  }
}

