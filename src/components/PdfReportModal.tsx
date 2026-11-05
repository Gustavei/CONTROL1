import React, { useState } from 'react';
import {
  FileText,
  X,
  Calendar,
  Users,
  TrendingUp,
  Download,
  CheckCircle2,
  AlertCircle,
  Truck,
} from 'lucide-react';
import {
  RouteRecord,
  Driver,
  CONTRACTUAL_GOAL,
} from '../types.ts';
import {
  computeAggregateMetrics,
  computeDriverRankings,
  computeRouteRankings,
  computeDayRankings,
} from '../utils/analytics.ts';
import { generatePdfReport, ReportType } from '../services/pdfReportService.ts';

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: RouteRecord[];
  drivers: Driver[];
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  onClose,
  routes,
  drivers,
}) => {
  const [reportType, setReportType] = useState<ReportType>('comparative');
  const [selectedDate, setSelectedDate] = useState<string>(
    routes.length > 0 ? routes[0].date : new Date().toISOString().split('T')[0]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  // Filter routes based on chosen report type
  const targetRoutes = (() => {
    if (reportType === 'daily') {
      return routes.filter((r) => r.date === selectedDate);
    }
    if (reportType === 'weekly') {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 7);
      const startStr = d.toISOString().split('T')[0];
      return routes.filter((r) => r.date >= startStr && r.date <= selectedDate);
    }
    if (reportType === 'monthly') {
      return routes.filter((r) => r.date.startsWith(selectedMonth));
    }
    if (reportType === 'provider_oscar') {
      return routes.filter((r) => r.provider === 'Oscar');
    }
    if (reportType === 'provider_tiago') {
      return routes.filter((r) => r.provider === 'Tiago');
    }
    return routes; // comparative
  })();

  const globalMetrics = computeAggregateMetrics(targetRoutes);
  const oscarRoutes = targetRoutes.filter((r) => r.provider === 'Oscar');
  const oscarMetrics = computeAggregateMetrics(oscarRoutes);
  const tiagoRoutes = targetRoutes.filter((r) => r.provider === 'Tiago');
  const tiagoMetrics = computeAggregateMetrics(tiagoRoutes);

  const driverRanks = computeDriverRankings(targetRoutes);
  const routeRanks = computeRouteRankings(targetRoutes);
  const dayRanks = computeDayRankings(targetRoutes);

  const handleDownload = () => {
    setIsGenerating(true);
    try {
      let title = 'Relatório Geral Comparativo de Qualidade';
      let periodLabel = 'Todo o Período';

      if (reportType === 'daily') {
        title = `Relatório Diário de Qualidade - ${selectedDate.split('-').reverse().join('/')}`;
        periodLabel = selectedDate.split('-').reverse().join('/');
      } else if (reportType === 'weekly') {
        title = 'Relatório Semanal de Qualidade Operacional';
        periodLabel = `Semana encerrada em ${selectedDate.split('-').reverse().join('/')}`;
      } else if (reportType === 'monthly') {
        const [year, month] = selectedMonth.split('-');
        title = `Relatório Mensal de Qualidade - ${month}/${year}`;
        periodLabel = `Mês ${month}/${year}`;
      } else if (reportType === 'provider_oscar') {
        title = 'Relatório de Qualidade & Performance: Provedor Oscar';
        periodLabel = 'Operação Completa Provedor Oscar';
      } else if (reportType === 'provider_tiago') {
        title = 'Relatório de Qualidade & Performance: Provedor Tiago';
        periodLabel = 'Operação Completa Provedor Tiago';
      }

      generatePdfReport({
        type: reportType,
        title,
        periodLabel,
        routes: targetRoutes,
        globalMetrics,
        oscarMetrics,
        tiagoMetrics,
        bestDriver: driverRanks[0]
          ? {
              name: driverRanks[0].label,
              provider: driverRanks[0].subLabel || '',
              quality: driverRanks[0].quality,
              packages: driverRanks[0].totalPackages,
            }
          : undefined,
        worstDriver:
          driverRanks.length > 1
            ? {
                name: driverRanks[driverRanks.length - 1].label,
                provider: driverRanks[driverRanks.length - 1].subLabel || '',
                quality: driverRanks[driverRanks.length - 1].quality,
                packages: driverRanks[driverRanks.length - 1].totalPackages,
              }
            : undefined,
        bestRoute: routeRanks[0]
          ? {
              name: routeRanks[0].label,
              number: routeRanks[0].label.split(' - ')[0] || '',
              quality: routeRanks[0].quality,
            }
          : undefined,
        worstRoute:
          routeRanks.length > 1
            ? {
                name: routeRanks[routeRanks.length - 1].label,
                number: routeRanks[routeRanks.length - 1].label.split(' - ')[0] || '',
                quality: routeRanks[routeRanks.length - 1].quality,
              }
            : undefined,
        bestDay: dayRanks[0]
          ? { date: dayRanks[0].label, quality: dayRanks[0].quality }
          : undefined,
        worstDay:
          dayRanks.length > 1
            ? {
                date: dayRanks[dayRanks.length - 1].label,
                quality: dayRanks[dayRanks.length - 1].quality,
              }
            : undefined,
      });
    } catch (e) {
      console.error('Error generating PDF:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const reportOptions = [
    {
      id: 'comparative' as ReportType,
      title: 'Comparativo Geral',
      desc: 'Visão executiva integrada com Oscar vs Tiago e auditoria de metas',
      icon: TrendingUp,
    },
    {
      id: 'daily' as ReportType,
      title: 'Relatório Diário',
      desc: 'Fechamento do dia operacional por rotas e motoristas',
      icon: Calendar,
    },
    {
      id: 'weekly' as ReportType,
      title: 'Relatório Semanal',
      desc: 'Consolidado dos últimos 7 dias com evolução da qualidade',
      icon: Calendar,
    },
    {
      id: 'monthly' as ReportType,
      title: 'Relatório Mensal',
      desc: 'Auditoria mensal completa com metas e indicadores contratuais',
      icon: Calendar,
    },
    {
      id: 'provider_oscar' as ReportType,
      title: 'Por Provedor: Oscar',
      desc: 'Dossiê exclusivo das rotas e motoristas da equipe Oscar',
      icon: Users,
    },
    {
      id: 'provider_tiago' as ReportType,
      title: 'Por Provedor: Tiago',
      desc: 'Dossiê exclusivo das rotas e motoristas da equipe Tiago',
      icon: Users,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#0057B8] text-white p-5 flex items-center justify-between border-b-4 border-[#FFD100]">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFD100] text-[#002B5C] font-black p-2 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">
                Emissão de Relatórios Oficiais em PDF
              </h3>
              <p className="text-xs text-blue-100">
                Gere documentos prontos para auditoria interna e diretoria GLS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-100 hover:text-white p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Select Type Grid */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              1. Selecione o Tipo de Relatório:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {reportOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = reportType === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setReportType(opt.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                      isSelected
                        ? 'border-[#0057B8] bg-blue-50/60 shadow-xs ring-1 ring-[#0057B8]'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg mt-0.5 ${
                        isSelected
                          ? 'bg-[#0057B8] text-[#FFD100]'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">
                        {opt.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {opt.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Date Parameter if applicable */}
          {(reportType === 'daily' || reportType === 'weekly') && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Data de Referência:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8] bg-white"
              />
            </div>
          )}

          {reportType === 'monthly' && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Mês de Referência (YYYY-MM):
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0057B8] bg-white"
              />
            </div>
          )}

          {/* Report Data Preview Box */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Pré-visualização do Relatório:</span>
              <span className="text-[11px] font-semibold text-slate-500">
                {targetRoutes.length} rotas selecionadas
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold">Qualidade</span>
                <span
                  className={`text-base font-black ${
                    globalMetrics.qualityPercentage >= CONTRACTUAL_GOAL
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }`}
                >
                  {globalMetrics.qualityPercentage.toFixed(2)}%
                </span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold">Pacotes</span>
                <span className="text-base font-bold text-slate-800">
                  {globalMetrics.totalPackages.toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold">Incidências</span>
                <span className="text-base font-bold text-red-600">
                  {globalMetrics.totalIncidences}
                </span>
              </div>
            </div>

            {targetRoutes.length === 0 && (
              <div className="text-xs text-amber-600 font-medium flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Aviso: Não há rotas no período selecionado. O relatório sairá sem dados operacionais.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold bg-[#0057B8] hover:bg-blue-700 text-white rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-[#FFD100]" />
            {isGenerating ? 'Gerando PDF...' : 'Baixar Relatório em PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};
