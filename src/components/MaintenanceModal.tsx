import React, { useState, useEffect } from 'react';
import { X, Wrench, Calendar, Gauge, DollarSign, Save, AlertCircle } from 'lucide-react';
import { MaintenanceLog, Driver, ProviderName, MaintenanceType, MaintenanceStatus } from '../types.ts';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (log: Omit<MaintenanceLog, 'id' | 'createdAt'>, existingId?: string) => Promise<void>;
  editingLog?: MaintenanceLog | null;
  drivers: Driver[];
  defaultProvider?: ProviderName;
}

const CATEGORIES = [
  'Óleo e Filtros',
  'Freios e Pastilhas',
  'Pneus e Geometria',
  'Motor e Câmbio',
  'Suspensão e Amortecedores',
  'Elétrica e Bateria',
  'Arrefecimento / Radiador',
  'Funilaria e Pintura',
  'Revisão Geral Preventiva',
  'Outros Serviços',
];

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingLog,
  drivers,
  defaultProvider = 'Oscar',
}) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [provider, setProvider] = useState<ProviderName>(defaultProvider);
  const [driverName, setDriverName] = useState<string>('');
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('');
  const [odometerKm, setOdometerKm] = useState<number | string>(100000);
  const [type, setType] = useState<MaintenanceType>('Preventiva');
  const [category, setCategory] = useState<string>('Óleo e Filtros');
  const [description, setDescription] = useState<string>('');
  const [cost, setCost] = useState<number | string>(450);
  const [workshop, setWorkshop] = useState<string>('Oficina Mecânica Especializada');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [nextMaintenanceKm, setNextMaintenanceKm] = useState<number | string>('');
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState<string>('');
  const [status, setStatus] = useState<MaintenanceStatus>('Concluída');
  const [notes, setNotes] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const providerDrivers = drivers.filter((d) => d.provider === provider && d.status === 'active');

  useEffect(() => {
    if (editingLog) {
      setDate(editingLog.date);
      setProvider(editingLog.provider);
      setDriverName(editingLog.driverName || '');
      setVehiclePlate(editingLog.vehiclePlate);
      setVehicleModel(editingLog.vehicleModel || '');
      setOdometerKm(editingLog.odometerKm);
      setType(editingLog.type);
      setCategory(editingLog.category);
      setDescription(editingLog.description);
      setCost(editingLog.cost);
      setWorkshop(editingLog.workshop);
      setInvoiceNumber(editingLog.invoiceNumber || '');
      setNextMaintenanceKm(editingLog.nextMaintenanceKm || '');
      setNextMaintenanceDate(editingLog.nextMaintenanceDate || '');
      setStatus(editingLog.status);
      setNotes(editingLog.notes || '');
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setProvider(defaultProvider);
      if (providerDrivers.length > 0) {
        setDriverName(providerDrivers[0].name);
        setVehiclePlate(providerDrivers[0].licensePlate || '');
        setVehicleModel(providerDrivers[0].vehicleType || '');
      } else {
        setDriverName('');
        setVehiclePlate('');
        setVehicleModel('');
      }
      setOdometerKm(115000);
      setType('Preventiva');
      setCategory('Óleo e Filtros');
      setDescription('Troca de óleo de motor e filtros (óleo, combustível e ar)');
      setCost(550.00);
      setWorkshop('Oficina Mecânica Especializada');
      setInvoiceNumber('');
      setNextMaintenanceKm(125000);
      setNextMaintenanceDate('');
      setStatus('Concluída');
      setNotes('');
    }
  }, [editingLog, isOpen, defaultProvider]);

  const handleDriverSelect = (selectedName: string) => {
    setDriverName(selectedName);
    const d = providerDrivers.find((drv) => drv.name === selectedName);
    if (d) {
      if (d.licensePlate) setVehiclePlate(d.licensePlate);
      if (d.vehicleType) setVehicleModel(d.vehicleType);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!vehiclePlate.trim()) {
      setErrorMsg('Informe a placa do veículo.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Descreva o serviço realizado ou peças trocadas.');
      return;
    }

    const numCost = parseFloat(String(cost)) || 0;
    if (numCost < 0) {
      setErrorMsg('O custo não pode ser negativo.');
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          date,
          provider,
          driverName: driverName.trim(),
          vehiclePlate: vehiclePlate.trim().toUpperCase(),
          vehicleModel: vehicleModel.trim(),
          odometerKm: Number(odometerKm) || 0,
          type,
          category,
          description: description.trim(),
          cost: numCost,
          workshop: workshop.trim(),
          invoiceNumber: invoiceNumber.trim(),
          nextMaintenanceKm: nextMaintenanceKm ? Number(nextMaintenanceKm) : null,
          nextMaintenanceDate: nextMaintenanceDate || null,
          status,
          notes: notes.trim(),
        },
        editingLog?.id
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar manutenção.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0057B8] text-white p-5 flex items-center justify-between border-b-4 border-[#FFD100]">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFD100] text-[#002B5C] p-2 rounded-lg font-black">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                {editingLog ? 'Editar Registro de Manutenção' : 'Registrar Manutenção / Oficina'}
              </h3>
              <p className="text-xs text-blue-100">
                Acompanhamento preventivo, corretivo e controle de oficina
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

          {/* Row 1: Data & Provedor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Data do Serviço:
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
                      if (pDrivers.length > 0) {
                        setDriverName(pDrivers[0].name);
                        setVehiclePlate(pDrivers[0].licensePlate || '');
                        setVehicleModel(pDrivers[0].vehicleType || '');
                      }
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
                  onChange={(e) => handleDriverSelect(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
                >
                  <option value="">Selecione...</option>
                  {providerDrivers.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} {d.licensePlate ? `(${d.licensePlate})` : ''}
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
                Placa do Veículo:
              </label>
              <input
                type="text"
                required
                placeholder="Ex: ABC-1234"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md uppercase font-bold focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              />
            </div>
          </div>

          {/* Tipo & Categoria */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Tipo de Manutenção:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['Preventiva', 'Corretiva'] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setType(t)}
                    className={`py-1.5 px-2 rounded-md text-xs font-bold transition text-center ${
                      type === t
                        ? t === 'Preventiva'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Categoria:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Descrição do Serviço */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Descrição do Serviço / Peças Trocadas:
            </label>
            <textarea
              rows={2}
              required
              placeholder="Ex: Troca de pastilhas de freio dianteiras, retífica de discos e sangria do fluido..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
            />
          </div>

          {/* Odômetro & Custo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Odômetro no Serviço (KM):
              </label>
              <div className="relative">
                <Gauge className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  min="0"
                  required
                  value={odometerKm}
                  onChange={(e) => setOdometerKm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md font-bold focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Valor Total (R$):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md font-black text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
                />
              </div>
            </div>
          </div>

          {/* Oficina & OS / Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Oficina / Prestador:
              </label>
              <input
                type="text"
                placeholder="Ex: Auto Mecânica Centro"
                value={workshop}
                onChange={(e) => setWorkshop(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Nº O.S. ou NF:
              </label>
              <input
                type="text"
                placeholder="Ex: OS-4512"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Status:
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MaintenanceStatus)}
                className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              >
                <option value="Concluída">Concluída</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Agendada">Agendada</option>
              </select>
            </div>
          </div>

          {/* Próxima Revisão */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
              Planejamento da Próxima Revisão (Opcional):
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-1">
                  Próxima Troca / Revisão (KM):
                </label>
                <input
                  type="number"
                  placeholder="Ex: 125000"
                  value={nextMaintenanceKm}
                  onChange={(e) => setNextMaintenanceKm(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
                />
              </div>

              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-1">
                  Data Prevista:
                </label>
                <input
                  type="date"
                  value={nextMaintenanceDate}
                  onChange={(e) => setNextMaintenanceDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
                />
              </div>
            </div>
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
              {saving ? 'Gravando...' : editingLog ? 'Atualizar Manutenção' : 'Salvar Manutenção'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
