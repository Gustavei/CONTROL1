import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  Calendar,
  Layers,
  MapPin,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Package,
  Boxes,
  AlertCircle,
  Save,
} from 'lucide-react';
import {
  RouteRecord,
  Driver,
  ProviderName,
  CONTRACTUAL_GOAL,
  calculateQuality,
  getQualityClassification,
} from '../types.ts';

interface RouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (routeData: Omit<RouteRecord, 'id' | 'createdAt'>, existingId?: string) => Promise<void>;
  editingRoute?: RouteRecord | null;
  drivers: Driver[];
  defaultProvider?: ProviderName;
}

export const RouteModal: React.FC<RouteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRoute,
  drivers,
  defaultProvider = 'Oscar',
}) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [provider, setProvider] = useState<ProviderName>(defaultProvider);
  const [driverName, setDriverName] = useState<string>('');
  const [driverId, setDriverId] = useState<string>('');
  const [routeNumber, setRouteNumber] = useState<string>('');
  const [routeName, setRouteName] = useState<string>('');
  const [locality, setLocality] = useState<string>('');
  const [volumes, setVolumes] = useState<number | string>('');
  const [packages, setPackages] = useState<number | string>('');
  const [incidences, setIncidences] = useState<number | string>(0);
  const [notes, setNotes] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Available drivers for current provider
  const availableDrivers = drivers.filter(
    (d) => d.provider === provider && d.status === 'active'
  );

  useEffect(() => {
    if (editingRoute) {
      setDate(editingRoute.date);
      setProvider(editingRoute.provider);
      setDriverName(editingRoute.driverName);
      setDriverId(editingRoute.driverId);
      setRouteNumber(editingRoute.routeNumber);
      setRouteName(editingRoute.routeName);
      setLocality(editingRoute.locality);
      setVolumes(editingRoute.volumes);
      setPackages(editingRoute.packages);
      setIncidences(editingRoute.incidences);
      setNotes(editingRoute.notes || '');
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setProvider(defaultProvider);
      setRouteNumber('');
      setRouteName('');
      setLocality('');
      setVolumes('');
      setPackages('');
      setIncidences(0);
      setNotes('');
      // Auto select first driver of this provider
      const provDrivers = drivers.filter((d) => d.provider === defaultProvider);
      if (provDrivers.length > 0) {
        setDriverName(provDrivers[0].name);
        setDriverId(provDrivers[0].id);
      } else {
        setDriverName('');
        setDriverId('');
      }
    }
  }, [editingRoute, isOpen, defaultProvider]);

  // Handle provider switch -> update available driver
  const handleProviderChange = (newProvider: ProviderName) => {
    setProvider(newProvider);
    const provDrivers = drivers.filter((d) => d.provider === newProvider);
    if (provDrivers.length > 0) {
      setDriverName(provDrivers[0].name);
      setDriverId(provDrivers[0].id);
    } else {
      setDriverName('');
      setDriverId('');
    }
  };

  // Live calculation
  const numPackages = Number(packages) || 0;
  const numIncidences = Number(incidences) || 0;
  const calculatedQuality = calculateQuality(numPackages, numIncidences);
  const classification = getQualityClassification(calculatedQuality);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!driverName.trim()) {
      setErrorMsg('Por favor selecione ou informe o nome do motorista.');
      return;
    }
    if (!routeNumber.trim()) {
      setErrorMsg('Por favor informe o número da rota (ex: RT-101).');
      return;
    }
    if (!locality.trim()) {
      setErrorMsg('Por favor informe a localidade da rota.');
      return;
    }
    if (numPackages <= 0) {
      setErrorMsg('A quantidade de pacotes deve ser maior que zero.');
      return;
    }
    if (numIncidences < 0) {
      setErrorMsg('Incidências não podem ser negativas.');
      return;
    }
    if (numIncidences > numPackages) {
      setErrorMsg('A quantidade de incidências não pode ser maior que o total de pacotes.');
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          date,
          provider,
          driverId: driverId || `temp_${Date.now()}`,
          driverName: driverName.trim(),
          routeNumber: routeNumber.trim(),
          routeName: routeName.trim() || `Rota ${routeNumber.trim()}`,
          locality: locality.trim(),
          volumes: Number(volumes) || numPackages,
          packages: numPackages,
          incidences: numIncidences,
          quality: calculatedQuality,
          notes: notes.trim(),
        },
        editingRoute?.id
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar rota.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-[#0057B8] text-white p-5 flex items-center justify-between border-b-4 border-[#FFD100]">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFD100] text-[#002B5C] p-2 rounded-lg font-black">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                {editingRoute ? 'Editar Rota de Entrega' : 'Cadastrar Nova Rota Diária'}
              </h3>
              <p className="text-xs text-blue-100">
                Auditoria de volumes, pacotes e qualidade operacional GLS
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-blue-100 hover:text-white p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Row 1: Data e Provedor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Data da Rota:
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
                Provedor Contratado:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Oscar', 'Tiago'] as const).map((prov) => (
                  <button
                    type="button"
                    key={prov}
                    onClick={() => handleProviderChange(prov)}
                    className={`py-1.5 px-3 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      provider === prov
                        ? 'bg-[#0057B8] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        prov === 'Oscar' ? 'bg-[#FFD100]' : 'bg-amber-400'
                      }`}
                    />
                    {prov}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Motorista */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Motorista ({provider}):
            </label>
            {availableDrivers.length > 0 ? (
              <div className="space-y-1">
                <select
                  value={driverName}
                  onChange={(e) => {
                    setDriverName(e.target.value);
                    const found = availableDrivers.find((d) => d.name === e.target.value);
                    if (found) setDriverId(found.id);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8] bg-white font-medium"
                >
                  <option value="">Selecione um motorista...</option>
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} {d.licensePlate ? `(${d.licensePlate})` : ''}
                    </option>
                  ))}
                </select>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Ou digite um nome avulso abaixo:</span>
                </div>
                <input
                  type="text"
                  placeholder="Nome do motorista..."
                  value={driverName}
                  onChange={(e) => {
                    setDriverName(e.target.value);
                    setDriverId('');
                  }}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
                />
              </div>
            ) : (
              <input
                type="text"
                required
                placeholder="Nome do motorista..."
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              />
            )}
          </div>

          {/* Row 3: Número da Rota, Nome e Localidade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Número da Rota:
              </label>
              <input
                type="text"
                required
                placeholder="Ex: RT-101"
                value={routeNumber}
                onChange={(e) => setRouteNumber(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8] font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Nome / Descrição da Rota:
              </label>
              <input
                type="text"
                placeholder="Ex: Rota Centro Comercial Express"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Localidade / Bairros:
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder="Ex: Centro / Vila Mariana / Distrito Industrial"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              />
            </div>
          </div>

          {/* Row 4: Volumes, Pacotes, Incidências */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Métricas Operacionais da Rota:
            </span>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Volumes:
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={volumes}
                  onChange={(e) => setVolumes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md font-bold focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Pacotes:
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={packages}
                  onChange={(e) => setPackages(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md font-bold focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-red-600 uppercase block mb-1">
                  Incidências:
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={incidences}
                  onChange={(e) => setIncidences(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-red-300 rounded-md font-bold text-red-600 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Live Quality Calculation Box */}
            <div className="mt-2 p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Qualidade Calculada ((Pacotes - Inc.) / Pacotes):
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`text-2xl font-black ${
                      classification === 'VERDE'
                        ? 'text-emerald-600'
                        : classification === 'AMARELO'
                        ? 'text-amber-500'
                        : 'text-red-600'
                    }`}
                  >
                    {calculatedQuality.toFixed(2)}%
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      classification === 'VERDE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : classification === 'AMARELO'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {classification}
                  </span>
                </div>
              </div>

              <div className="text-right text-[11px]">
                <span className="font-semibold text-slate-700 block">Meta: 94.0%</span>
                {calculatedQuality >= CONTRACTUAL_GOAL ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1 justify-end">
                    <CheckCircle className="w-3.5 h-3.5" /> Meta Atingida
                  </span>
                ) : (
                  <span className="text-amber-600 font-bold flex items-center gap-1 justify-end">
                    <AlertTriangle className="w-3.5 h-3.5" /> Abaixo da Meta
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Observações / Justificativas:
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Chuva torrencial causou atrasos; cliente ausente na segunda tentativa..."
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
              {saving ? 'Gravando...' : editingRoute ? 'Atualizar Rota' : 'Cadastrar Rota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
