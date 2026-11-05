/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';
import {
  Header,
} from './components/Header.tsx';
import {
  Navigation,
  TabId,
} from './components/Navigation.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { ProviderView } from './components/ProviderView.tsx';
import { RankingsView } from './components/RankingsView.tsx';
import { HistoryView } from './components/HistoryView.tsx';
import { PdfReportModal } from './components/PdfReportModal.tsx';
import { ShareLinkModal } from './components/ShareLinkModal.tsx';
import { RouteModal } from './components/RouteModal.tsx';
import { DriverModal } from './components/DriverModal.tsx';
import { FleetView } from './components/FleetView.tsx';
import { FuelModal } from './components/FuelModal.tsx';
import { MaintenanceModal } from './components/MaintenanceModal.tsx';
import { MileageModal } from './components/MileageModal.tsx';
import { VehicleModal } from './components/VehicleModal.tsx';

import { auth, db, ADMIN_EMAIL } from './lib/firebase.ts';
import {
  RouteRecord,
  Driver,
  Vehicle,
  ProviderName,
  CONTRACTUAL_GOAL,
  FuelLog,
  MaintenanceLog,
  MileageLog,
} from './types.ts';
import {
  subscribeRoutes,
  subscribeDrivers,
  subscribeVehicles,
  addRoute,
  updateRoute,
  deleteRoute,
  deleteAllRoutes,
  addDriver,
  updateDriver,
  deleteDriver,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  seedInitialDataIfEmpty,
  subscribeFuelLogs,
  subscribeMaintenanceLogs,
  subscribeMileageLogs,
  addFuelLog,
  updateFuelLog,
  deleteFuelLog,
  addMaintenanceLog,
  updateMaintenanceLog,
  deleteMaintenanceLog,
  addMileageLog,
  updateMileageLog,
  deleteMileageLog,
  seedInitialFleetDataIfEmpty,
  seedVehiclesIfEmpty,
} from './services/dataService.ts';
import { Check, ShieldAlert, Wifi, Sparkles } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(true); // Default to admin for creator, can toggle
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteRecord | null>(null);
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [targetProviderForModal, setTargetProviderForModal] = useState<ProviderName>('Oscar');

  // Fleet & Vehicle Modals state
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [editingFuel, setEditingFuel] = useState<FuelLog | null>(null);
  const [preselectedVehicleIdForFuel, setPreselectedVehicleIdForFuel] = useState<string | undefined>(undefined);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceLog | null>(null);
  const [mileageModalOpen, setMileageModalOpen] = useState(false);
  const [editingMileage, setEditingMileage] = useState<MileageLog | null>(null);
  const [preselectedVehicleIdForMileage, setPreselectedVehicleIdForMileage] = useState<string | undefined>(undefined);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Check URL query parameters: if ?view=public is present, enforce Viewer mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'public') {
      setIsAdmin(false);
    }
  }, []);

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && user.email === ADMIN_EMAIL) {
        setIsAdmin(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Initialize and subscribe to Firestore
  useEffect(() => {
    async function init() {
      try {
        // Critical constraint from Firebase skill: test connection
        try {
          await getDocFromServer(doc(db, 'test', 'connection'));
        } catch (e: any) {
          if (e?.message?.includes('the client is offline')) {
            console.error('Please check your Firebase configuration.');
          }
        }

        // Seed initial data if empty
        await seedInitialDataIfEmpty();
        await seedInitialFleetDataIfEmpty();
        await seedVehiclesIfEmpty();
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    }

    init();

    // Subscribe to real-time collections
    const unsubRoutes = subscribeRoutes((data) => {
      setRoutes(data);
    });

    const unsubDrivers = subscribeDrivers((data) => {
      setDrivers(data);
    });

    const unsubVehicles = subscribeVehicles((data) => {
      setVehicles(data);
    });

    const unsubFuel = subscribeFuelLogs((data) => {
      setFuelLogs(data);
    });

    const unsubMaint = subscribeMaintenanceLogs((data) => {
      setMaintenanceLogs(data);
    });

    const unsubMileage = subscribeMileageLogs((data) => {
      setMileageLogs(data);
    });

    return () => {
      unsubRoutes();
      unsubDrivers();
      unsubVehicles();
      unsubFuel();
      unsubMaint();
      unsubMileage();
    };
  }, []);

  // Route operations
  const handleSaveRoute = async (
    routeData: Omit<RouteRecord, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    if (existingId) {
      await updateRoute(existingId, routeData);
      showToast(`Rota ${routeData.routeNumber} atualizada com sucesso!`);
    } else {
      await addRoute(routeData);
      showToast(`Rota ${routeData.routeNumber} cadastrada com sucesso!`);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    try {
      await deleteRoute(routeId);
      showToast('Rota excluída com sucesso.');
    } catch (err: any) {
      showToast('Erro ao excluir rota.');
    }
  };

  const handleDeleteAllRoutes = async () => {
    try {
      const count = await deleteAllRoutes();
      showToast(`${count} rotas excluídas com sucesso. O banco de dados está limpo!`);
    } catch (err: any) {
      showToast('Erro ao excluir rotas.');
    }
  };

  // Driver operations
  const handleSaveDriver = async (
    driverData: Omit<Driver, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    if (existingId) {
      await updateDriver(existingId, driverData);
      showToast(`Motorista ${driverData.name} atualizado!`);
    } else {
      await addDriver(driverData);
      showToast(`Motorista ${driverData.name} cadastrado!`);
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    try {
      await deleteDriver(driverId);
      showToast('Motorista excluído com sucesso.');
    } catch (err: any) {
      showToast('Erro ao excluir motorista.');
    }
  };

  // Fleet operations
  const handleSaveFuelLog = async (
    logData: Omit<FuelLog, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    if (existingId) {
      await updateFuelLog(existingId, logData);
      showToast('Abastecimento atualizado com sucesso!');
    } else {
      await addFuelLog(logData);
      showToast('Abastecimento registrado com sucesso!');
    }
  };

  const handleDeleteFuelLog = async (id: string) => {
    try {
      await deleteFuelLog(id);
      showToast('Registro de combustível excluído.');
    } catch (err: any) {
      showToast('Erro ao excluir combustível.');
    }
  };

  const handleSaveMaintenanceLog = async (
    logData: Omit<MaintenanceLog, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    if (existingId) {
      await updateMaintenanceLog(existingId, logData);
      showToast('Manutenção atualizada com sucesso!');
    } else {
      await addMaintenanceLog(logData);
      showToast('Manutenção registrada com sucesso!');
    }
  };

  const handleDeleteMaintenanceLog = async (id: string) => {
    try {
      await deleteMaintenanceLog(id);
      showToast('Registro de manutenção excluído.');
    } catch (err: any) {
      showToast('Erro ao excluir manutenção.');
    }
  };

  const handleSaveMileageLog = async (
    logData: Omit<MileageLog, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    if (existingId) {
      await updateMileageLog(existingId, logData);
      showToast('Registro de quilometragem atualizado!');
    } else {
      await addMileageLog(logData);
      showToast('Quilometragem diária registrada com sucesso!');
    }
  };

  const handleDeleteMileageLog = async (id: string) => {
    try {
      await deleteMileageLog(id);
      showToast('Registro de quilometragem excluído.');
    } catch (err: any) {
      showToast('Erro ao excluir quilometragem.');
    }
  };

  // Vehicle operations
  const handleSaveVehicle = async (
    vehicleData: Omit<Vehicle, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    if (existingId) {
      await updateVehicle(existingId, vehicleData);
      showToast(`Furgoneta ${vehicleData.name} atualizada com sucesso!`);
    } else {
      await addVehicle(vehicleData);
      showToast(`Furgoneta ${vehicleData.name} cadastrada com sucesso!`);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    try {
      await deleteVehicle(vehicleId);
      showToast('Furgoneta excluída com sucesso.');
    } catch (err: any) {
      showToast('Erro ao excluir furgoneta.');
    }
  };

  const oscarRoutesCount = routes.filter((r) => r.provider === 'Oscar').length;
  const tiagoRoutesCount = routes.filter((r) => r.provider === 'Tiago').length;

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-800 flex flex-col font-['Inter',sans-serif]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#002B5C] text-white px-4 py-3 rounded-xl shadow-xl border border-blue-400/40 flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <div className="w-5 h-5 rounded-full bg-[#FFD100] text-[#002B5C] flex items-center justify-center font-bold">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        isAdmin={isAdmin}
        userEmail={currentUser?.email || (isAdmin ? ADMIN_EMAIL : null)}
        onOpenRouteModal={() => {
          setEditingRoute(null);
          setRouteModalOpen(true);
        }}
        onOpenDriverModal={() => {
          setEditingDriver(null);
          setDriverModalOpen(true);
        }}
        onOpenShareModal={() => setShareModalOpen(true)}
        onOpenReportModal={() => setReportModalOpen(true)}
        onToggleAdminMode={(enable) => setIsAdmin(enable)}
      />

      {/* Navigation Tabs */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'reports') {
            setReportModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        oscarCount={oscarRoutesCount}
        tiagoCount={tiagoRoutesCount}
        fleetCount={vehicles.length + fuelLogs.length + maintenanceLogs.length + mileageLogs.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-[#0057B8] border-t-[#FFD100] rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Conectando ao banco de dados em tempo real...
            </span>
          </div>
        ) : (
          <>
            {/* Viewer Banner if in Viewer Mode */}
            {!isAdmin && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-900 shadow-xs">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Modo Visualizador Ativo:</strong> Você possui acesso de consulta a todas as métricas, rankings, relatórios e auditorias em tempo real. Apenas o administrador ({ADMIN_EMAIL}) pode alterar rotas e motoristas.
                  </span>
                </div>
                <button
                  onClick={() => setIsAdmin(true)}
                  className="font-bold text-[#0057B8] hover:underline whitespace-nowrap ml-2"
                >
                  Entrar como Admin
                </button>
              </div>
            )}

            {/* Views Router */}
            {activeTab === 'dashboard' && (
              <DashboardView
                routes={routes}
                drivers={drivers}
                onNavigateToTab={(tab) => setActiveTab(tab)}
                onOpenRouteModal={() => {
                  setEditingRoute(null);
                  setRouteModalOpen(true);
                }}
                isAdmin={isAdmin}
              />
            )}

            {activeTab === 'oscar' && (
              <ProviderView
                providerName="Oscar"
                routes={routes}
                drivers={drivers}
                isAdmin={isAdmin}
                onOpenDriverModal={(drv) => {
                  setTargetProviderForModal('Oscar');
                  setEditingDriver(drv || null);
                  setDriverModalOpen(true);
                }}
                onDeleteDriver={handleDeleteDriver}
                onOpenRouteModal={(rt) => {
                  setTargetProviderForModal('Oscar');
                  setEditingRoute(rt || null);
                  setRouteModalOpen(true);
                }}
                onDeleteRoute={handleDeleteRoute}
              />
            )}

            {activeTab === 'tiago' && (
              <ProviderView
                providerName="Tiago"
                routes={routes}
                drivers={drivers}
                isAdmin={isAdmin}
                onOpenDriverModal={(drv) => {
                  setTargetProviderForModal('Tiago');
                  setEditingDriver(drv || null);
                  setDriverModalOpen(true);
                }}
                onDeleteDriver={handleDeleteDriver}
                onOpenRouteModal={(rt) => {
                  setTargetProviderForModal('Tiago');
                  setEditingRoute(rt || null);
                  setRouteModalOpen(true);
                }}
                onDeleteRoute={handleDeleteRoute}
              />
            )}

            {activeTab === 'rankings' && <RankingsView routes={routes} />}

            {activeTab === 'history' && (
              <HistoryView
                routes={routes}
                drivers={drivers}
                isAdmin={isAdmin}
                onOpenRouteModal={(rt) => {
                  setEditingRoute(rt || null);
                  setRouteModalOpen(true);
                }}
                onDeleteRoute={handleDeleteRoute}
                onDeleteAllRoutes={handleDeleteAllRoutes}
              />
            )}

            {activeTab === 'fleet' && (
              <FleetView
                fuelLogs={fuelLogs}
                maintenanceLogs={maintenanceLogs}
                mileageLogs={mileageLogs}
                drivers={drivers}
                vehicles={vehicles}
                isAdmin={isAdmin}
                onOpenFuelModal={(log, vehId) => {
                  setEditingFuel(log || null);
                  setPreselectedVehicleIdForFuel(vehId);
                  setFuelModalOpen(true);
                }}
                onDeleteFuelLog={handleDeleteFuelLog}
                onOpenMaintenanceModal={(log) => {
                  setEditingMaintenance(log || null);
                  setMaintenanceModalOpen(true);
                }}
                onDeleteMaintenanceLog={handleDeleteMaintenanceLog}
                onOpenMileageModal={(log, vehId) => {
                  setEditingMileage(log || null);
                  setPreselectedVehicleIdForMileage(vehId);
                  setMileageModalOpen(true);
                }}
                onDeleteMileageLog={handleDeleteMileageLog}
                onOpenVehicleModal={(veh) => {
                  setEditingVehicle(veh || null);
                  setVehicleModalOpen(true);
                }}
                onDeleteVehicle={handleDeleteVehicle}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <RouteModal
        isOpen={routeModalOpen}
        onClose={() => {
          setRouteModalOpen(false);
          setEditingRoute(null);
        }}
        onSave={handleSaveRoute}
        editingRoute={editingRoute}
        drivers={drivers}
        defaultProvider={targetProviderForModal}
      />

      <DriverModal
        isOpen={driverModalOpen}
        onClose={() => {
          setDriverModalOpen(false);
          setEditingDriver(null);
        }}
        onSave={handleSaveDriver}
        editingDriver={editingDriver}
        defaultProvider={targetProviderForModal}
      />

      <VehicleModal
        isOpen={vehicleModalOpen}
        onClose={() => {
          setVehicleModalOpen(false);
          setEditingVehicle(null);
        }}
        onSave={handleSaveVehicle}
        editingVehicle={editingVehicle}
        drivers={drivers}
        defaultProvider={targetProviderForModal}
      />

      <FuelModal
        isOpen={fuelModalOpen}
        onClose={() => {
          setFuelModalOpen(false);
          setEditingFuel(null);
          setPreselectedVehicleIdForFuel(undefined);
        }}
        onSave={handleSaveFuelLog}
        editingLog={editingFuel}
        drivers={drivers}
        vehicles={vehicles}
        defaultProvider={targetProviderForModal}
        preselectedVehicleId={preselectedVehicleIdForFuel}
      />

      <MaintenanceModal
        isOpen={maintenanceModalOpen}
        onClose={() => {
          setMaintenanceModalOpen(false);
          setEditingMaintenance(null);
        }}
        onSave={handleSaveMaintenanceLog}
        editingLog={editingMaintenance}
        drivers={drivers}
        defaultProvider={targetProviderForModal}
      />

      <MileageModal
        isOpen={mileageModalOpen}
        onClose={() => {
          setMileageModalOpen(false);
          setEditingMileage(null);
          setPreselectedVehicleIdForMileage(undefined);
        }}
        onSave={handleSaveMileageLog}
        editingLog={editingMileage}
        drivers={drivers}
        vehicles={vehicles}
        routes={routes}
        defaultProvider={targetProviderForModal}
        preselectedVehicleId={preselectedVehicleIdForMileage}
        allMileageLogs={mileageLogs}
      />

      <ShareLinkModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />

      <PdfReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        routes={routes}
        drivers={drivers}
      />

      {/* Footer */}
      <footer className="bg-[#002B5C] text-white border-t border-blue-900 mt-12 py-6 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-[#FFD100] text-[#002B5C] font-black px-2 py-0.5 rounded text-sm font-['Outfit',sans-serif]">
              GLS
            </span>
            <span className="text-blue-200">
              GLS – GESTÃO DE QUALIDADE & AUDITORIA DE ROTAS &bull; Meta Contratual Fixa: {CONTRACTUAL_GOAL}%
            </span>
          </div>

          <div className="text-blue-300 text-[11px] text-center sm:text-right">
            <span>Fórmula Oficial: ((Pacotes - Incidências) / Pacotes) &times; 100</span>
            <div className="text-slate-400 mt-0.5">Sincronização em Nuvem em Tempo Real</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
