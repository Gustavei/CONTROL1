import React, { useState, useEffect, useMemo } from 'react';
import { X, Fuel, Calendar, Gauge, DollarSign, FileText, MapPin, Save, AlertCircle, ArrowRight, TrendingUp } from 'lucide-react';
import { FuelLog, Driver, Vehicle, ProviderName, FuelType } from '../types.ts';
import { getLastFuelLogForVehicle } from '../services/dataService.ts';

interface FuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (log: Omit<FuelLog, 'id' | 'createdAt'>, existingId?: string) => Promise<void>;
  editingLog?: FuelLog | null;
  drivers: Driver[];
  vehicles: Vehicle[];
  defaultProvider?: ProviderName;
  preselectedVehicleId?: string;
}

export const FuelModal: React.FC<FuelModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingLog,
  drivers,
  vehicles,
  defaultProvider = 'Oscar',
  preselectedVehicleId,
}) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [provider, setProvider] = useState<ProviderName>(defaultProvider);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('');
  const [odometerKm, setOdometerKm] = useState<number | string>(110000);
  const [previousOdometerKm, setPreviousOdometerKm] = useState<number | null>(null);
  const [fuelType, setFuelType] = useState<FuelType>('Diesel S10');
  const [liters, setLiters] = useState<number | string>(60);
  const [pricePerLiter, setPricePerLiter] = useState<number | string>(6.05);
  const [totalCost, setTotalCost] = useState<number | string>(363.0);
  const [stationName, setStationName] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [loadingLastFuel, setLoadingLastFuel] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const providerDrivers = drivers.filter((d) => d.provider === provider && d.status === 'active');
  const providerVehicles = vehicles.filter((v) => v.provider === provider && v.status !== 'inactive');

  // Fetch previous fuel log when vehicle changes
  const loadPreviousFuel = async (plate: string, currentKm?: number) => {
    if (!plate) {
      setPreviousOdometerKm(null);
      return;
    }
    setLoadingLastFuel(true);
    try {
      const prev = await getLastFuelLogForVehicle(plate, currentKm);
      if (prev && prev.odometerKm) {
        setPreviousOdometerKm(Number(prev.odometerKm));
      } else {
        // Fallback to vehicle initial odometer
        const v = vehicles.find((item) => item.plate.toUpperCase() === plate.toUpperCase());
        if (v && v.initialOdometer) {
          setPreviousOdometerKm(Number(v.initialOdometer));
        } else {
          setPreviousOdometerKm(null);
        }
      }
    } catch (e) {
      console.warn('Error loading previous fuel:', e);
    } finally {
      setLoadingLastFuel(false);
    }
  };

  useEffect(() => {
    if (editingLog) {
      setDate(editingLog.date);
      setProvider(editingLog.provider);
      setSelectedVehicleId(editingLog.vehicleId || '');
      setDriverName(editingLog.driverName);
      setVehiclePlate(editingLog.vehiclePlate);
      setVehicleModel(editingLog.vehicleModel || '');
      setOdometerKm(editingLog.odometerKm);
      setPreviousOdometerKm(editingLog.previousOdometerKm ?? null);
      setFuelType(editingLog.fuelType);
      setLiters(editingLog.liters);
      setPricePerLiter(editingLog.pricePerLiter);
      setTotalCost(editingLog.totalCost);
      setStationName(editingLog.stationName || '');
      setReceiptNumber(editingLog.receiptNumber || '');
      setNotes(editingLog.notes || '');
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setProvider(defaultProvider);

      const targetVeh = preselectedVehicleId
        ? vehicles.find((v) => v.id === preselectedVehicleId)
        : providerVehicles[0] || vehicles[0];

      if (targetVeh) {
        setSelectedVehicleId(targetVeh.id);
        setProvider(targetVeh.provider);
        setVehiclePlate(targetVeh.plate);
        setVehicleModel(targetVeh.model);
        setFuelType(targetVeh.fuelType || 'Diesel S10');
        setDriverName(targetVeh.defaultDriverName || (providerDrivers[0]?.name ?? ''));
        const nextOdo = (Number(targetVeh.currentOdometer) || 100000) + 350;
        setOdometerKm(nextOdo);
        loadPreviousFuel(targetVeh.plate, nextOdo);
      } else {
        setSelectedVehicleId('');
        setVehiclePlate('');
        setVehicleModel('');
        setDriverName(providerDrivers[0]?.name || '');
        setOdometerKm(110000);
        setPreviousOdometerKm(null);
      }

      setLiters(60);
      setPricePerLiter(6.05);
      setTotalCost(363.0);
      setStationName('Posto Ipiranga');
      setReceiptNumber('');
      setNotes('');
    }
  }, [editingLog, isOpen, defaultProvider, preselectedVehicleId]);

  // Handle vehicle dropdown selection
  const handleVehicleSelect = (vehId: string) => {
    setSelectedVehicleId(vehId);
    const v = vehicles.find((item) => item.id === vehId);
    if (v) {
      setProvider(v.provider);
      setVehiclePlate(v.plate);
      setVehicleModel(v.model);
      setFuelType(v.fuelType);
      if (v.defaultDriverName) {
        setDriverName(v.defaultDriverName);
      }
      const cur = Number(v.currentOdometer) || 100000;
      setOdometerKm(cur + 300);
      loadPreviousFuel(v.plate, cur + 300);
    }
  };

  // Calculations
  const curOdoNum = Number(odometerKm) || 0;
  const numLiters = parseFloat(String(liters)) || 0;
  const numPrice = parseFloat(String(pricePerLiter)) || 0;
  const numTotalCost = parseFloat(String(totalCost)) || 0;

  const distanceTravelled = useMemo(() => {
    if (previousOdometerKm !== null && curOdoNum > previousOdometerKm) {
      return curOdoNum - previousOdometerKm;
    }
    return null;
  }, [curOdoNum, previousOdometerKm]);

  const fuelEfficiency = useMemo(() => {
    if (distanceTravelled && numLiters > 0) {
      return Number((distanceTravelled / numLiters).toFixed(2));
    }
    return null;
  }, [distanceTravelled, numLiters]);

  const costPerKm = useMemo(() => {
    if (distanceTravelled && numTotalCost > 0) {
      return Number((numTotalCost / distanceTravelled).toFixed(2));
    }
    return null;
  }, [distanceTravelled, numTotalCost]);

  // Auto calculate total cost when liters or price changes
  const handleLitersChange = (val: string) => {
    setLiters(val);
    const l = parseFloat(val) || 0;
    const p = parseFloat(String(pricePerLiter)) || 0;
    setTotalCost(Number((l * p).toFixed(2)));
  };

  const handlePriceChange = (val: string) => {
    setPricePerLiter(val);
    const p = parseFloat(val) || 0;
    const l = parseFloat(String(liters)) || 0;
    setTotalCost(Number((l * p).toFixed(2)));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!vehiclePlate.trim()) {
      setErrorMsg('Informe ou selecione a furgoneta.');
      return;
    }
    if (numLiters <= 0) {
      setErrorMsg('A quantidade em litros deve ser maior que zero.');
      return;
    }
    if (numTotalCost <= 0) {
      setErrorMsg('O valor total do abastecimento deve ser maior que zero.');
      return;
    }
    if (previousOdometerKm !== null && curOdoNum <= previousOdometerKm) {
      setErrorMsg(
        `O odômetro atual (${curOdoNum} KM) deve ser maior que o do último abastecimento (${previousOdometerKm} KM).`
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
          odometerKm: curOdoNum,
          previousOdometerKm: previousOdometerKm,
          distanceSinceLastFuel: distanceTravelled,
          fuelEfficiencyKmL: fuelEfficiency,
          costPerKm: costPerKm,
          fuelType,
          liters: numLiters,
          pricePerLiter: numPrice,
          totalCost: numTotalCost,
          stationName: stationName.trim(),
          receiptNumber: receiptNumber.trim(),
          notes: notes.trim(),
        },
        editingLog?.id
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao registrar abastecimento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header GLS */}
        <div className="bg-[#0057B8] text-white p-5 flex items-center justify-between border-b-4 border-[#FFD100]">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFD100] text-[#002B5C] p-2 rounded-lg font-black">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                {editingLog ? 'Editar Registro de Abastecimento' : 'Novo Abastecimento com Média Automática'}
              </h3>
              <p className="text-xs text-blue-100">
                Cálculo de consumo (KM/L) comparado ao último abastecimento da furgoneta
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

          {/* Selecionar Furgoneta Cadastrada */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Furgoneta / Veículo da Frota:
              </label>
              {loadingLastFuel && (
                <span className="text-[10px] text-blue-600 font-semibold animate-pulse">
                  Buscando histórico...
                </span>
              )}
            </div>
            {vehicles.length > 0 ? (
              <select
                value={selectedVehicleId}
                onChange={(e) => handleVehicleSelect(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0057B8]"
              >
                <option value="">Selecione a Furgoneta cadastrada...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} &bull; {v.plate} ({v.model}) - Provedor {v.provider}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-xs">
                Nenhuma furgoneta cadastrada no sistema. Você pode cadastrar uma na aba &quot;Furgonetas&quot; ou digitar os dados abaixo.
              </div>
            )}
          </div>

          {/* Row: Data & Provedor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Data do Abastecimento:
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
                Motorista Responsável:
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
                onChange={(e) => {
                  const p = e.target.value.toUpperCase();
                  setVehiclePlate(p);
                  loadPreviousFuel(p, curOdoNum);
                }}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md uppercase font-bold tracking-wider focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              />
            </div>
          </div>

          {/* Bloco de Odômetro & Média com Último Abastecimento */}
          <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#002B5C] uppercase tracking-wider flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-[#0057B8]" />
                Odômetro da Furgoneta (KM)
              </span>
              {previousOdometerKm !== null && (
                <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-blue-100">
                  Último abastecimento: <strong>{previousOdometerKm.toLocaleString('pt-BR')} KM</strong>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  KM Último Abastecimento:
                </label>
                <input
                  type="number"
                  placeholder="Sem registro anterior"
                  value={previousOdometerKm !== null ? previousOdometerKm : ''}
                  onChange={(e) => setPreviousOdometerKm(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#0057B8] uppercase block mb-1">
                  KM Atual (Na Bomba):
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={odometerKm}
                  onChange={(e) => setOdometerKm(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border-2 border-[#0057B8] rounded-md font-black text-slate-900 bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Live Calculation Feedback Card */}
            {distanceTravelled !== null && distanceTravelled > 0 ? (
              <div className="p-3 bg-white rounded-lg border border-blue-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Distância Percorrida no Tanque:
                  </span>
                  <span className="text-emerald-700 font-black text-sm">
                    {distanceTravelled.toLocaleString('pt-BR')} KM
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                  <div className="p-2 bg-emerald-50 rounded border border-emerald-100">
                    <span className="text-emerald-800 block text-[10px] uppercase font-bold">Média de Consumo</span>
                    <span className="text-base font-black text-emerald-700">
                      {fuelEfficiency !== null ? `${fuelEfficiency} KM/L` : '-'}
                    </span>
                  </div>

                  <div className="p-2 bg-blue-50 rounded border border-blue-100">
                    <span className="text-blue-800 block text-[10px] uppercase font-bold">Custo por KM</span>
                    <span className="text-base font-black text-[#0057B8]">
                      {costPerKm !== null ? `R$ ${costPerKm} / KM` : '-'}
                    </span>
                  </div>
                </div>
              </div>
            ) : previousOdometerKm !== null && curOdoNum <= previousOdometerKm ? (
              <div className="text-[11px] text-amber-700 font-semibold bg-amber-50 p-2 rounded border border-amber-200">
                O KM atual deve ser maior que {previousOdometerKm.toLocaleString('pt-BR')} KM para calcular a média de consumo.
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 italic bg-white p-2 rounded border border-slate-200">
                Primeiro abastecimento desta furgoneta. A média será calculada no próximo abastecimento.
              </div>
            )}
          </div>

          {/* Valores sobre o Abastecimento */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-amber-500" />
              Valores do Abastecimento
            </span>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Combustível:
                </label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value as FuelType)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
                >
                  <option value="Diesel S10">Diesel S10</option>
                  <option value="Gasolina Comum">Gasolina Comum</option>
                  <option value="Gasolina Aditivada">Gasolina Aditivada</option>
                  <option value="Etanol">Etanol</option>
                  <option value="GNV">GNV</option>
                  <option value="Arla 32">Arla 32</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Litros:
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  required
                  placeholder="Ex: 60"
                  value={liters}
                  onChange={(e) => handleLitersChange(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md font-bold focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Preço / Litro (R$):
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.01"
                  required
                  placeholder="Ex: 6.05"
                  value={pricePerLiter}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md font-bold focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
                />
              </div>
            </div>

            {/* Total Cost Display / Manual Override */}
            <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200">
              <span className="text-xs font-bold text-slate-700">Valor Total Pago no Abastecimento:</span>
              <div className="flex items-center gap-1 text-[#0057B8] font-black text-base">
                <span>R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  className="w-28 text-right font-black border-b-2 border-blue-400 focus:outline-none bg-blue-50/40 px-1 py-0.5 rounded"
                />
              </div>
            </div>
          </div>

          {/* Posto e Nota Fiscal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Posto / Estabelecimento:
              </label>
              <input
                type="text"
                placeholder="Ex: Posto Ipiranga Rodoanel"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Nº Nota / Cupom Fiscal:
              </label>
              <input
                type="text"
                placeholder="Ex: NF-12345"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Observações:
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Tanque completado; calibragem de pneus e checagem de óleo realizadas..."
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
              {saving ? 'Gravando...' : editingLog ? 'Atualizar Abastecimento' : 'Salvar Abastecimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
