import React, { useState, useEffect } from 'react';
import { X, Users, Phone, Truck, Shield, Save, AlertCircle } from 'lucide-react';
import { Driver, ProviderName } from '../types.ts';

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (driverData: Omit<Driver, 'id' | 'createdAt'>, existingId?: string) => Promise<void>;
  editingDriver?: Driver | null;
  defaultProvider?: ProviderName;
}

export const DriverModal: React.FC<DriverModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingDriver,
  defaultProvider = 'Oscar',
}) => {
  const [provider, setProvider] = useState<ProviderName>(defaultProvider);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('Van Master');
  const [licensePlate, setLicensePlate] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editingDriver) {
      setProvider(editingDriver.provider);
      setName(editingDriver.name);
      setPhone(editingDriver.phone || '');
      setVehicleType(editingDriver.vehicleType || 'Van Master');
      setLicensePlate(editingDriver.licensePlate || '');
      setStatus(editingDriver.status);
    } else {
      setProvider(defaultProvider);
      setName('');
      setPhone('');
      setVehicleType('Van Master');
      setLicensePlate('');
      setStatus('active');
    }
  }, [editingDriver, isOpen, defaultProvider]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Por favor informe o nome completo do motorista.');
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          provider,
          name: name.trim(),
          phone: phone.trim(),
          vehicleType: vehicleType.trim(),
          licensePlate: licensePlate.trim().toUpperCase(),
          status,
        },
        editingDriver?.id
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar motorista.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0057B8] text-white p-5 flex items-center justify-between border-b-4 border-[#FFD100]">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFD100] text-[#002B5C] p-2 rounded-lg font-black">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                {editingDriver ? 'Editar Motorista' : 'Cadastrar Novo Motorista'}
              </h3>
              <p className="text-xs text-blue-100">
                Vincule o motorista ao provedor Oscar ou Tiago
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-blue-100 hover:text-white p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Provider Select */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Provedor Responsável:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['Oscar', 'Tiago'] as const).map((prov) => (
                <button
                  type="button"
                  key={prov}
                  onClick={() => setProvider(prov)}
                  className={`py-2 px-3 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 ${
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

          {/* Driver Name */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Nome Completo do Motorista:
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Carlos Roberto da Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8] font-medium"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Telefone / WhatsApp:
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="(11) 98765-4321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              />
            </div>
          </div>

          {/* Vehicle Type & Plate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Tipo de Veículo:
              </label>
              <input
                type="text"
                placeholder="Ex: Fiorino, Van Master"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Placa do Veículo:
              </label>
              <input
                type="text"
                placeholder="Ex: ABC-1234"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md uppercase font-bold focus:outline-none focus:ring-1 focus:ring-[#0057B8]"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Status Operacional:
            </label>
            <div className="flex gap-4 text-xs font-semibold">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={status === 'active'}
                  onChange={() => setStatus('active')}
                  className="text-[#0057B8]"
                />
                <span className="text-emerald-700">Ativo para Rotas</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={status === 'inactive'}
                  onChange={() => setStatus('inactive')}
                  className="text-slate-400"
                />
                <span className="text-slate-500">Inativo / Afastado</span>
              </label>
            </div>
          </div>

          {/* Footer */}
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
              {saving ? 'Gravando...' : editingDriver ? 'Atualizar Motorista' : 'Cadastrar Motorista'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
