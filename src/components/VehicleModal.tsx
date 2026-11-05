import React, { useState, useEffect } from 'react';
import { X, Truck, Save, AlertCircle, Gauge, Fuel } from 'lucide-react';
import { Vehicle, Driver, ProviderName, FuelType } from '../types.ts';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vehicle: Omit<Vehicle, 'id' | 'createdAt'>, existingId?: string) => Promise<void>;
  editingVehicle?: Vehicle | null;
  drivers: Driver[];
  defaultProvider?: ProviderName;
}

export const VehicleModal: React.FC<VehicleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingVehicle,
  drivers,
  defaultProvider = 'Oscar',
}) => {
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [provider, setProvider] = useState<ProviderName>(defaultProvider);
  const [defaultDriverName, setDefaultDriverName] = useState('');
  const [initialOdometer, setInitialOdometer] = useState<number | string>(100000);
  const [currentOdometer, setCurrentOdometer] = useState<number | string>(100000);
  const [fuelType, setFuelType] = useState<FuelType>('Diesel S10');
  const [tankCapacity, setTankCapacity] = useState<number | string>(80);
  const [status, setStatus] = useState<'active' | 'maintenance' | 'inactive'>('active');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const providerDrivers = drivers.filter((d) => d.provider === provider && d.status === 'active');

  useEffect(() => {
    if (editingVehicle) {
      setName(editingVehicle.name);
      setPlate(editingVehicle.plate);
      setModel(editingVehicle.model);
      setProvider(editingVehicle.provider);
      setDefaultDriverName(editingVehicle.defaultDriverName || '');
      setInitialOdometer(editingVehicle.initialOdometer);
      setCurrentOdometer(editingVehicle.currentOdometer);
      setFuelType(editingVehicle.fuelType);
      setTankCapacity(editingVehicle.tankCapacity || 80);
      setStatus(editingVehicle.status);
      setNotes(editingVehicle.notes || '');
    } else {
      setName('');
      setPlate('');
      setModel('');
      setProvider(defaultProvider);
      setDefaultDriverName(providerDrivers[0]?.name || '');
      setInitialOdometer(100000);
      setCurrentOdometer(100000);
      setFuelType('Diesel S10');
      setTankCapacity(80);
      setStatus('active');
      setNotes('');
    }
  }, [editingVehicle, isOpen, defaultProvider]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!plate.trim()) {
      setErrorMsg('Informe a placa da furgoneta.');
      return;
    }

    const initKm = Number(initialOdometer) || 0;
    const curKm = Number(currentOdometer) || initKm;

    if (curKm < initKm) {
      setErrorMsg('O odômetro atual não pode ser menor que o odômetro inicial de cadastro.');
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          name: name.trim() || `Furgoneta ${plate.trim().toUpperCase()}`,
          plate: plate.trim().toUpperCase(),
          model: model.trim() || 'Furgoneta de Carga',
          provider,
          defaultDriverName: defaultDriverName.trim() || undefined,
          initialOdometer: initKm,
          currentOdometer: curKm,
          fuelType,
          tankCapacity: Number(tankCapacity) || undefined,
          status,
          notes: notes.trim() || undefined,
        },
        editingVehicle?.id
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar veículo.');
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
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                {editingVehicle ? 'Editar Furgoneta' : 'Cadastrar Nova Furgoneta'}
              </h3>
              <p className="text-xs text-blue-100">
                Identificação do veículo, odômetro e dados operacionais
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

          {/* Nome / Apelido & Placa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Identificação / Nome:
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Furgoneta 01 - Master"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Placa (Mercosul / Padrão):
              </label>
              <input
                type="text"
                required
                placeholder="Ex: ABC-1234 ou ABC1D23"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md uppercase font-bold tracking-wider focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              />
            </div>
          </div>

          {/* Modelo & Provedor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Modelo / Fabricante:
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Renault Master L3H2, Fiorino 1.4"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Provedor Responsável:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Oscar', 'Tiago'] as const).map((prov) => (
                  <button
                    type="button"
                    key={prov}
                    onClick={() => {
                      setProvider(prov);
                      const pDrivers = drivers.filter((d) => d.provider === prov && d.status === 'active');
                      setDefaultDriverName(pDrivers[0]?.name || '');
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

          {/* Motorista Padrão & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Motorista Titular / Padrão:
              </label>
              <select
                value={defaultDriverName}
                onChange={(e) => setDefaultDriverName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              >
                <option value="">Nenhum (Rotativo / Frota Geral)</option>
                {providerDrivers.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name} {d.licensePlate ? `(${d.licensePlate})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Status Operacional:
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              >
                <option value="active">🟢 Ativa (Em Operação)</option>
                <option value="maintenance">🟡 Em Manutenção / Oficina</option>
                <option value="inactive">⚪ Inativa / Reserva Técnica</option>
              </select>
            </div>
          </div>

          {/* Odômetros & Tanque */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-[#0057B8]" />
              Odômetro & Autonomia
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Odômetro Inicial Cadastro (KM):
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={initialOdometer}
                  onChange={(e) => {
                    setInitialOdometer(e.target.value);
                    if (!editingVehicle) setCurrentOdometer(e.target.value);
                  }}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md font-bold focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Odômetro Atual (KM):
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={currentOdometer}
                  onChange={(e) => setCurrentOdometer(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md font-bold text-[#0057B8] focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Combustível Habitual:
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
                  Capacidade Tanque (Litros):
                </label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  placeholder="Ex: 80"
                  value={tankCapacity}
                  onChange={(e) => setTankCapacity(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md font-bold focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
                />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Observações / Informações Adicionais:
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Furgoneta com rastreador, baú refrigerado, etc."
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
              {saving ? 'Gravando...' : editingVehicle ? 'Atualizar Furgoneta' : 'Salvar Furgoneta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
