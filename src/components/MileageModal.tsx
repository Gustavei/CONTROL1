import React, { useState, useEffect, useMemo } from 'react';
import { X, Gauge, Calendar, Save, AlertCircle, TrendingUp, Sun, ArrowRight } from 'lucide-react';
import { MileageLog, Driver, Vehicle, RouteRecord, ProviderName } from '../types.ts';
import { getLocalDateString } from '../utils/date.ts';

interface MileageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (log: Omit<MileageLog, 'id' | 'createdAt'>, existingId?: string) => Promise<void>;
  editingLog?: MileageLog | null;
  drivers: Driver[];
  vehicles: Vehicle[];
  routes?: RouteRecord[];
  defaultProvider?: ProviderName;
  preselectedVehicleId?: string;
  allMileageLogs?: MileageLog[];
}

export const MileageModal: React.FC<MileageModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingLog,
  drivers,
  vehicles,
  defaultProvider = 'Oscar',
  preselectedVehicleId,
  allMileageLogs = [],
}) => {
  const [date, setDate] = useState<string>(getLocalDateString());
  const [provider, setProvider] = useState<ProviderName>(defaultProvider);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('');
  const [routeNumber, setRouteNumber] = useState<string>('');
  const [morningKm, setMorningKm] = useState<number | string>('');
  const [notes, setNotes] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const providerDrivers = drivers.filter((d) => d.provider === provider && d.status === 'active');
  const providerVehicles = vehicles.filter((v) => v.provider === provider && v.status !== 'inactive');

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, saving, onClose]);

  useEffect(() => {
    setErrorMsg('');
    if (editingLog) {
      setDate(editingLog.date);
      setProvider(editingLog.provider);
      setSelectedVehicleId(editingLog.vehicleId || '');
      setDriverName(editingLog.driverName);
      setVehiclePlate(editingLog.vehiclePlate);
      setVehicleModel(editingLog.vehicleModel || '');
      setRouteNumber(editingLog.routeNumber || '');
      setMorningKm(editingLog.startKm);
      setNotes(editingLog.notes || '');
    } else {
      setDate(getLocalDateString());
      setProvider(defaultProvider);

      const targetVeh = preselectedVehicleId
        ? vehicles.find((v) => v.id === preselectedVehicleId)
        : providerVehicles[0] || vehicles[0];

      if (targetVeh) {
        setSelectedVehicleId(targetVeh.id);
        setProvider(targetVeh.provider);
        setVehiclePlate(targetVeh.plate);
        setVehicleModel(targetVeh.model);
        setDriverName(targetVeh.defaultDriverName || (providerDrivers[0]?.name ?? ''));
      } else {
        setSelectedVehicleId('');
        setVehiclePlate('');
        setVehicleModel('');
        setDriverName(providerDrivers[0]?.name || '');
      }

      setMorningKm('');
      setRouteNumber('');
      setNotes('');
    }
  }, [editingLog, isOpen, defaultProvider, preselectedVehicleId]);

  const handleVehicleSelect = (vehId: string) => {
    setSelectedVehicleId(vehId);
    setErrorMsg('');
    const v = vehicles.find((item) => item.id === vehId);
    if (v) {
      setProvider(v.provider);
      setVehiclePlate(v.plate);
      setVehicleModel(v.model);
      if (v.defaultDriverName) {
        setDriverName(v.defaultDriverName);
      }
    }
  };

  // Find the immediately preceding morning reading for this furgoneta (day-to-day comparison)
  const previousMorningRecord = useMemo(() => {
    if (!vehiclePlate.trim()) return null;
    const plateUpper = vehiclePlate.trim().toUpperCase();

    const candidates = allMileageLogs.filter((m) => {
      if (editingLog && m.id === editingLog.id) return false;
      return m.vehiclePlate && m.vehiclePlate.trim().toUpperCase() === plateUpper;
    });

    // Prefer records strictly prior to the selected date
    const strictlyPrior = candidates.filter((m) => m.date < date);
    const pool = strictlyPrior.length > 0 ? strictlyPrior : editingLog ? [] : candidates.filter((m) => m.date === date);

    if (pool.length > 0) {
      const sorted = [...pool].sort((a, b) => {
        const dateCmp = b.date.localeCompare(a.date);
        if (dateCmp !== 0) return dateCmp;
        const odoA = Math.max(Number(a.startKm) || 0, Number(a.endKm) || 0);
        const odoB = Math.max(Number(b.startKm) || 0, Number(b.endKm) || 0);
        if (odoB !== odoA) return odoB - odoA;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
      const latest = sorted[0];
      return {
        km: Math.max(Number(latest.startKm) || 0, Number(latest.endKm) || 0),
        date: latest.date,
      };
    }

    if (editingLog && editingLog.previousKm !== undefined && editingLog.previousKm !== null) {
      return {
        km: Number(editingLog.previousKm),
        date: editingLog.previousDate || null,
      };
    }

    return null;
  }, [vehiclePlate, date, allMileageLogs, editingLog]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId || v.plate.trim().toUpperCase() === vehiclePlate.trim().toUpperCase()),
    [vehicles, selectedVehicleId, vehiclePlate]
  );

  const hasTypedMorning = morningKm !== '' && morningKm !== null && morningKm !== undefined;
  const numMorning = Number(morningKm) || 0;
  const previousKm = previousMorningRecord ? previousMorningRecord.km : null;

  const isValidComparison = previousKm !== null && hasTypedMorning && numMorning >= previousKm;
  const calculatedTotal = isValidComparison ? numMorning - previousKm : 0;

  // Historical & projected daily average (only counting intervals > 0 KM)
  const vehicleStats = useMemo(() => {
    if (!vehiclePlate.trim()) return null;
    const plateUpper = vehiclePlate.trim().toUpperCase();
    const plateLogs = allMileageLogs.filter(
      (m) => m.vehiclePlate.trim().toUpperCase() === plateUpper && (!editingLog || m.id !== editingLog.id)
    );
    const intervalLogs = plateLogs.filter((m) => (Number(m.totalKm) || 0) > 0);
    const totalRecordedKm = intervalLogs.reduce((acc, curr) => acc + (Number(curr.totalKm) || 0), 0);
    const daysCount = intervalLogs.length;

    const projectedTotal = totalRecordedKm + calculatedTotal;
    const projectedDays = daysCount + (calculatedTotal > 0 ? 1 : 0);
    const projectedAvg = projectedDays > 0 ? (projectedTotal / projectedDays).toFixed(1) : null;
    const currentAvg = daysCount > 0 ? (totalRecordedKm / daysCount).toFixed(1) : null;

    return {
      daysCount,
      totalRecordedKm,
      currentAvg,
      projectedAvg,
      projectedDays,
    };
  }, [vehiclePlate, allMileageLogs, editingLog, calculatedTotal]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!vehiclePlate.trim()) {
      setErrorMsg('Informe ou selecione a furgoneta.');
      return;
    }
    if (!hasTypedMorning || numMorning <= 0) {
      setErrorMsg('Informe a quilometragem atual do odômetro pela manhã.');
      return;
    }
    if (previousKm !== null && numMorning < previousKm) {
      setErrorMsg(
        `O KM da manhã (${numMorning.toLocaleString('pt-BR')} KM) não pode ser menor que a leitura da manhã anterior (${previousKm.toLocaleString('pt-BR')} KM).`
      );
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          date,
          provider,
          vehicleId: selectedVehicleId || undefined,
          driverName: driverName.trim() || 'Motorista Titular',
          vehiclePlate: vehiclePlate.trim().toUpperCase(),
          vehicleModel: vehicleModel.trim(),
          routeNumber: routeNumber.trim(),
          startKm: numMorning,
          endKm: numMorning,
          previousKm,
          previousDate: previousMorningRecord?.date || null,
          totalKm: calculatedTotal,
          readingType: 'morning',
          notes: notes.trim(),
        },
        editingLog?.id
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao registrar quilometragem da manhã.');
    } finally {
      setSaving(false);
    }
  };

  const suggestedPlaceholder = previousKm
    ? `Ex: ${(previousKm + 165).toLocaleString('pt-BR').replace(/\./g, '')}`
    : selectedVehicle?.currentOdometer
    ? `Ex: ${selectedVehicle.currentOdometer}`
    : 'Ex: 112500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header GLS */}
        <div className="bg-[#0057B8] text-white p-5 flex items-center justify-between border-b-4 border-[#FFD100]">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFD100] text-[#002B5C] p-2 rounded-lg font-black">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                {editingLog ? 'Editar KM da Manhã' : 'Marcar KM da Manhã'}
              </h3>
              <p className="text-xs text-blue-100">
                Cadastro matinal diário &bull; cálculo automático de um dia para o outro
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-blue-100 hover:text-white p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Seleção de Furgoneta */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
              Furgoneta / Veículo:
            </label>
            {vehicles.length > 0 ? (
              <select
                value={selectedVehicleId}
                onChange={(e) => handleVehicleSelect(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
              >
                <option value="">Selecione a furgoneta cadastrada...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} &bull; {v.plate} ({v.model}) - Odômetro: {v.currentOdometer.toLocaleString('pt-BR')} KM
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-xs">
                Nenhuma furgoneta cadastrada. Cadastre em &quot;Furgonetas&quot; para preenchimento automático.
              </div>
            )}
          </div>

          {/* Data & Provedor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Data (Manhã):
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Provedor:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Oscar', 'Tiago'] as const).map((prov) => (
                  <button
                    type="button"
                    key={prov}
                    onClick={() => {
                      setProvider(prov);
                      const pDrivers = drivers.filter((d) => d.provider === prov);
                      if (pDrivers.length > 0) setDriverName(pDrivers[0].name);
                    }}
                    className={`py-1.5 px-2 rounded-md text-xs font-bold transition flex items-center justify-center gap-1 ${
                      provider === prov
                        ? 'bg-[#0057B8] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${prov === 'Oscar' ? 'bg-[#FFD100]' : 'bg-amber-400'}`} />
                    {prov}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Motorista & Placa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Motorista:
              </label>
              {providerDrivers.length > 0 ? (
                <select
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
                >
                  <option value="">Selecione o motorista...</option>
                  {providerDrivers.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Nome do motorista..."
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
                />
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Placa da Furgoneta:
              </label>
              <input
                type="text"
                required
                placeholder="Ex: ABC-1234"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md uppercase font-bold tracking-wider focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              />
            </div>
          </div>

          {/* Rota Vinculada */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Código / Nome da Rota (Opcional):
            </label>
            <input
              type="text"
              placeholder="Ex: RT-101 - Centro Expandido"
              value={routeNumber}
              onChange={(e) => setRouteNumber(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
            />
          </div>

          {/* Leitura Única da Manhã + Comparação Dia a Dia */}
          <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-emerald-700" />
                Leitura do Odômetro pela Manhã
              </span>
              {previousMorningRecord && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Última: {previousMorningRecord.km.toLocaleString('pt-BR')} KM
                </span>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                KM Atual da Manhã (Painel da Furgoneta):
              </label>
              <input
                type="number"
                min="1"
                required
                placeholder={suggestedPlaceholder}
                value={morningKm}
                onChange={(e) => setMorningKm(e.target.value)}
                className="w-full px-3 py-2 text-sm border-2 border-emerald-600 rounded-lg font-black text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            {/* Comparativo Automático de Um Dia Para o Outro */}
            <div className="p-3 bg-white rounded-lg border border-emerald-200 shadow-xs space-y-2">
              {previousMorningRecord ? (
                <>
                  <div className="flex items-center justify-between text-[11px] text-slate-600 pb-2 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Manhã Anterior {previousMorningRecord.date ? `(${previousMorningRecord.date.split('-').reverse().join('/')})` : ''}
                      </span>
                      <span className="font-bold text-slate-800">
                        {previousMorningRecord.km.toLocaleString('pt-BR')} KM
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Manhã de Hoje ({date.split('-').reverse().join('/')})
                      </span>
                      <span className="font-black text-[#0057B8]">
                        {hasTypedMorning && numMorning > 0 ? `${numMorning.toLocaleString('pt-BR')} KM` : '---'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">KM Rodados (dia p/ dia):</span>
                    <span
                      className={`text-lg font-black ${
                        hasTypedMorning && numMorning < previousMorningRecord.km
                          ? 'text-red-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {hasTypedMorning && numMorning >= previousMorningRecord.km
                        ? `+${calculatedTotal.toLocaleString('pt-BR')} KM`
                        : hasTypedMorning && numMorning < previousMorningRecord.km
                        ? 'Menor que anterior!'
                        : '0 KM'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-[11px] text-slate-600 leading-relaxed">
                  <span className="font-bold text-[#0057B8] block mb-0.5">
                    1º Registro Matinal (Marco Base)
                  </span>
                  Esta será a leitura inicial desta furgoneta. A partir do registro da manhã seguinte, a distância percorrida de um dia para o outro será calculada automaticamente.
                </div>
              )}

              {vehicleStats && (vehicleStats.projectedAvg || vehicleStats.currentAvg) && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-[#0057B8]" />
                    Média Diária (Dia p/ Dia):
                  </span>
                  <span className="font-bold text-[#0057B8]">
                    {vehicleStats.projectedAvg || vehicleStats.currentAvg} KM / dia ({vehicleStats.projectedDays || vehicleStats.daysCount} dias)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Observações:
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Saída no horário normal, painel conferido pela manhã..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold bg-[#0057B8] hover:bg-blue-700 text-white rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-[#FFD100]" />
              {saving ? 'Gravando...' : editingLog ? 'Atualizar KM da Manhã' : 'Salvar KM da Manhã'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
