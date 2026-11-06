import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  RouteRecord,
  QualityMetrics,
  CONTRACTUAL_GOAL,
  getQualityClassification,
  Vehicle,
  FuelLog,
  MaintenanceLog,
  MileageLog,
} from '../types.ts';

export type ReportType =
  // Rotas & Qualidade
  | 'comparative'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'provider_oscar'
  | 'provider_tiago'
  // Controle de Frota & Furgonetas
  | 'fleet_complete'
  | 'fleet_efficiency'
  | 'fleet_mileage'
  | 'fleet_fuel';

export interface ReportConfig {
  type: ReportType;
  title: string;
  periodLabel: string;
  routes: RouteRecord[];
  globalMetrics: QualityMetrics;
  oscarMetrics: QualityMetrics;
  tiagoMetrics: QualityMetrics;
  bestDriver?: { name: string; provider: string; quality: number; packages: number };
  worstDriver?: { name: string; provider: string; quality: number; packages: number };
  bestRoute?: { name: string; number: string; quality: number };
  worstRoute?: { name: string; number: string; quality: number };
  bestDay?: { date: string; quality: number };
  worstDay?: { date: string; quality: number };
}

export interface FleetReportConfig {
  type: ReportType;
  title: string;
  periodLabel: string;
  provider: 'all' | 'Oscar' | 'Tiago';
  vehicles: Vehicle[];
  mileageLogs: MileageLog[];
  fuelLogs: FuelLog[];
  maintenanceLogs: MaintenanceLog[];
  minEfficiencyThreshold: number;
}

// GLS Official Brand Colors
const glsBlue = [0, 87, 184]; // #0057B8
const glsYellow = [255, 209, 0]; // #FFD100
const glsDarkBlue = [0, 43, 92]; // #002B5C
const colorGreen = [16, 185, 129];
const colorYellow = [217, 119, 6];
const colorRed = [220, 38, 38];

const getStatusColor = (percentage: number) => {
  if (percentage > CONTRACTUAL_GOAL) return colorGreen;
  if (percentage >= 90) return colorYellow;
  return colorRed;
};

// 1. Quality & Routes Report Generator
export function generatePdfReport(config: ReportConfig) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header Banner
  doc.setFillColor(glsBlue[0], glsBlue[1], glsBlue[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Yellow accent line
  doc.setFillColor(glsYellow[0], glsYellow[1], glsYellow[2]);
  doc.rect(0, 28, pageWidth, 3, 'F');

  // GLS Brand Text Logo
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('GLS', 14, 15);

  doc.setFontSize(13);
  doc.text('GESTÃO DE QUALIDADE & AUDITORIA DE ROTAS', 35, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(230, 240, 255);
  doc.text(
    `Meta Contratual Fixa: ${CONTRACTUAL_GOAL}% | Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    35,
    18
  );

  // Title & Period
  doc.setTextColor(glsDarkBlue[0], glsDarkBlue[1], glsDarkBlue[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(config.title.toUpperCase(), 14, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Período de Análise: ${config.periodLabel} | Total de Rotas Auditadas: ${config.routes.length}`,
    14,
    43
  );

  // Helper to get delivered packages
  const getDelivered = (r: RouteRecord) =>
    r.deliveredPackages !== undefined ? r.deliveredPackages : Math.max(0, r.packages - r.incidences);

  const totalDelivered = config.routes.reduce((acc, r) => acc + getDelivered(r), 0);
  const totalPackages = config.routes.reduce((acc, r) => acc + (r.packages || 0), 0);
  const totalIncidences = config.routes.reduce((acc, r) => acc + (r.incidences || 0), 0);

  const oscarRoutes = config.routes.filter((r) => r.provider === 'Oscar');
  const oscarDelivered = oscarRoutes.reduce((acc, r) => acc + getDelivered(r), 0);
  const oscarPackages = oscarRoutes.reduce((acc, r) => acc + (r.packages || 0), 0);
  const oscarIncidences = oscarRoutes.reduce((acc, r) => acc + (r.incidences || 0), 0);

  const tiagoRoutes = config.routes.filter((r) => r.provider === 'Tiago');
  const tiagoDelivered = tiagoRoutes.reduce((acc, r) => acc + getDelivered(r), 0);
  const tiagoPackages = tiagoRoutes.reduce((acc, r) => acc + (r.packages || 0), 0);
  const tiagoIncidences = tiagoRoutes.reduce((acc, r) => acc + (r.incidences || 0), 0);

  // KPI Summary Boxes (Sem volume, com foco em Entregas e Saídas)
  const boxY = 48;
  const boxWidth = (pageWidth - 28 - 9) / 4;
  const boxHeight = 22;

  const boxes = [
    {
      title: 'QUALIDADE GERAL',
      value: `${config.globalMetrics.qualityPercentage.toFixed(2)}%`,
      sub: config.globalMetrics.goalMet ? 'META 94% ATINGIDA' : 'ABAIXO DA META (94%)',
      color: getStatusColor(config.globalMetrics.qualityPercentage),
    },
    {
      title: 'FUNCIONÁRIOS OSCAR',
      value: `${config.oscarMetrics.qualityPercentage.toFixed(2)}%`,
      sub: `${oscarDelivered} entregues de ${oscarPackages} (${oscarIncidences} inc.)`,
      color: getStatusColor(config.oscarMetrics.qualityPercentage),
    },
    {
      title: 'FUNCIONÁRIOS TIAGO',
      value: `${config.tiagoMetrics.qualityPercentage.toFixed(2)}%`,
      sub: `${tiagoDelivered} entregues de ${tiagoPackages} (${tiagoIncidences} inc.)`,
      color: getStatusColor(config.tiagoMetrics.qualityPercentage),
    },
    {
      title: 'TOTAL ENTREGAS (SAÍDA)',
      value: `${totalDelivered} / ${totalPackages}`,
      sub: `${totalIncidences} não entregues (${totalPackages > 0 ? ((totalDelivered / totalPackages) * 100).toFixed(1) : 0}% entregue)`,
      color: glsBlue,
    },
  ];

  boxes.forEach((b, i) => {
    const x = 14 + i * (boxWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, boxY, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFillColor(b.color[0], b.color[1], b.color[2]);
    doc.rect(x, boxY, boxWidth, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(b.title, x + 3, boxY + 7);

    doc.setFontSize(10.5);
    doc.setTextColor(b.color[0], b.color[1], b.color[2]);
    doc.text(b.value, x + 3, boxY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(71, 85, 105);
    doc.text(b.sub, x + 3, boxY + 19);
  });

  // Comparison Bar
  const barY = boxY + boxHeight + 4;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, barY, pageWidth - 28, 20, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(glsDarkBlue[0], glsDarkBlue[1], glsDarkBlue[2]);
  doc.text('COMPARATIVO DE QUALIDADE VS META CONTRATUAL FIXA (94.0%)', 18, barY + 5.5);

  const drawBar = (label: string, percentage: number, yPos: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(`${label}:`, 18, yPos + 3);

    const barMaxWidth = pageWidth - 28 - 60;
    const barStartX = 42;
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(barStartX, yPos, barMaxWidth, 3.5, 1, 1, 'F');

    const fillWidth = (Math.min(100, percentage) / 100) * barMaxWidth;
    const c = getStatusColor(percentage);
    doc.setFillColor(c[0], c[1], c[2]);
    doc.roundedRect(barStartX, yPos, fillWidth, 3.5, 1, 1, 'F');

    const targetX = barStartX + 0.94 * barMaxWidth;
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.6);
    doc.line(targetX, yPos - 1, targetX, yPos + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(c[0], c[1], c[2]);
    doc.text(`${percentage.toFixed(2)}%`, barStartX + barMaxWidth + 3, yPos + 3);
  };

  drawBar('Oscar', config.oscarMetrics.qualityPercentage, barY + 8);
  drawBar('Tiago', config.tiagoMetrics.qualityPercentage, barY + 14);

  // Highlights
  const rankY = barY + 23;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(glsDarkBlue[0], glsDarkBlue[1], glsDarkBlue[2]);
  doc.text('DESTAQUES OPERACIONAIS', 14, rankY);

  const rankBoxW = (pageWidth - 28 - 6) / 3;
  const rankBoxH = 16;

  const highlightCards = [
    {
      title: 'PROVEDOR EM 1º LUGAR',
      line1: `1º: ${
        config.oscarMetrics.qualityPercentage >= config.tiagoMetrics.qualityPercentage ? 'Oscar' : 'Tiago'
      } (${Math.max(config.oscarMetrics.qualityPercentage, config.tiagoMetrics.qualityPercentage).toFixed(2)}%)`,
      line2: `2º: ${
        config.oscarMetrics.qualityPercentage < config.tiagoMetrics.qualityPercentage ? 'Oscar' : 'Tiago'
      } (${Math.min(config.oscarMetrics.qualityPercentage, config.tiagoMetrics.qualityPercentage).toFixed(2)}%)`,
    },
    {
      title: 'FUNCIONÁRIOS DESTAQUE',
      line1: config.bestDriver
        ? `Melhor: ${config.bestDriver.name} (${config.bestDriver.quality.toFixed(1)}%)`
        : 'Sem dados',
      line2: config.worstDriver
        ? `Atenção: ${config.worstDriver.name} (${config.worstDriver.quality.toFixed(1)}%)`
        : 'Sem dados',
    },
    {
      title: 'ROTAS AUDITADAS',
      line1: config.bestRoute
        ? `Melhor: ${config.bestRoute.number} (${config.bestRoute.quality.toFixed(1)}%)`
        : 'Sem dados',
      line2: config.worstRoute
        ? `Crítica: ${config.worstRoute.number} (${config.worstRoute.quality.toFixed(1)}%)`
        : 'Sem dados',
    },
  ];

  highlightCards.forEach((c, idx) => {
    const x = 14 + idx * (rankBoxW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, rankY + 2.5, rankBoxW, rankBoxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.title, x + 3, rankY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(c.line1, x + 3, rankY + 11.5);
    doc.text(c.line2, x + 3, rankY + 15.5);
  });

  // Calculate separate employee stats by provider, strictly ranked BEST to WORST
  const getDriverStats = (providerRoutes: RouteRecord[]) => {
    const map = new Map<
      string,
      {
        name: string;
        routes: number;
        packages: number; // Saiu
        delivered: number; // Entregou
        incidences: number; // Incidências
      }
    >();

    for (const r of providerRoutes) {
      const key = r.driverName.toLowerCase().trim();
      const existing = map.get(key) || {
        name: r.driverName.trim(),
        routes: 0,
        packages: 0,
        delivered: 0,
        incidences: 0,
      };

      existing.routes += 1;
      existing.packages += Number(r.packages) || 0;
      existing.delivered += getDelivered(r);
      existing.incidences += Number(r.incidences) || 0;
      map.set(key, existing);
    }

    const list = Array.from(map.values()).map((d) => {
      const quality = d.packages > 0 ? ((d.packages - d.incidences) / d.packages) * 100 : 100;
      return {
        ...d,
        quality,
        classification: getQualityClassification(quality),
      };
    });

    // Sort strictly from BEST to WORST (highest quality first; if tied, highest delivered)
    return list.sort((a, b) => {
      if (b.quality !== a.quality) return b.quality - a.quality;
      return b.delivered - a.delivered;
    });
  };

  const oscarDrivers = getDriverStats(oscarRoutes);
  const tiagoDrivers = getDriverStats(tiagoRoutes);

  // Sort routes by provider from best quality to worst quality
  const sortedOscarRoutes = [...oscarRoutes].sort((a, b) => {
    if (b.quality !== a.quality) return b.quality - a.quality;
    return getDelivered(b) - getDelivered(a);
  });

  const sortedTiagoRoutes = [...tiagoRoutes].sort((a, b) => {
    if (b.quality !== a.quality) return b.quality - a.quality;
    return getDelivered(b) - getDelivered(a);
  });

  let currentY = rankY + rankBoxH + 6;

  // SECTION 1: PROVEDOR OSCAR
  if (config.type !== 'provider_tiago' && (oscarDrivers.length > 0 || sortedOscarRoutes.length > 0)) {
    // 1.1 Oscar Drivers Ranking (Melhor para o Pior)
    if (oscarDrivers.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 87, 184); // GLS Blue
      doc.text('PROVEDOR OSCAR – RANKING DE FUNCIONÁRIOS (DO MELHOR PARA O PIOR)', 14, currentY);

      const oscarDriverRows = oscarDrivers.map((d, index) => [
        `${index + 1}º`,
        d.name,
        `${d.routes}`,
        `${d.packages}`,
        `${d.delivered}`,
        `${d.incidences}`,
        `${d.quality.toFixed(2)}%`,
        d.classification,
      ]);

      autoTable(doc, {
        startY: currentY + 2.5,
        head: [['Pos.', 'Funcionário / Motorista', 'Rotas', 'Saiu (Total)', 'Entregou', 'Incidências', 'Qualidade (%)', 'Status']],
        body: oscarDriverRows,
        theme: 'grid',
        styles: {
          fontSize: 6.5,
          cellPadding: 1.5,
          font: 'helvetica',
        },
        headStyles: {
          fillColor: [0, 87, 184],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 50, fontStyle: 'bold' },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 22, halign: 'right' },
          4: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
          5: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
          6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
          7: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && (data.column.index === 6 || data.column.index === 7)) {
            const row = oscarDrivers[data.row.index];
            if (row) {
              if (row.quality > CONTRACTUAL_GOAL) {
                data.cell.styles.textColor = [5, 150, 105];
              } else if (row.quality >= 90) {
                data.cell.styles.textColor = [217, 119, 6];
              } else {
                data.cell.styles.textColor = [220, 38, 38];
              }
            }
          }
        },
        margin: { left: 14, right: 14, bottom: 16 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;
    }

    // 1.2 Oscar Operational Routes (Data, Rota, Funcionário, etc. - Do Melhor para o Pior)
    if (sortedOscarRoutes.length > 0) {
      if (currentY > pageHeight - 35) {
        doc.addPage();
        currentY = 16;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 87, 184); // GLS Blue
      doc.text('PROVEDOR OSCAR – ROTAS OPERACIONAIS (DATA, ROTA & QUALIDADE)', 14, currentY);

      const oscarRouteRows = sortedOscarRoutes.slice(0, 40).map((r) => {
        const classif = getQualityClassification(r.quality);
        const delivered = getDelivered(r);
        return [
          r.date.split('-').reverse().join('/'),
          r.routeNumber,
          r.driverName,
          r.locality,
          r.packages.toString(),
          delivered.toString(),
          r.incidences.toString(),
          `${r.quality.toFixed(2)}%`,
          classif,
        ];
      });

      autoTable(doc, {
        startY: currentY + 2.5,
        head: [['Data', 'Rota', 'Funcionário / Motorista', 'Localidade', 'Saiu', 'Entregou', 'Incidências', 'Qualidade', 'Status']],
        body: oscarRouteRows,
        theme: 'grid',
        styles: {
          fontSize: 6.5,
          cellPadding: 1.5,
          font: 'helvetica',
        },
        headStyles: {
          fillColor: [30, 64, 175], // Blue 800
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 16, halign: 'center' },
          1: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 40 },
          3: { cellWidth: 36 },
          4: { cellWidth: 14, halign: 'right' },
          5: { cellWidth: 15, halign: 'right', fontStyle: 'bold' },
          6: { cellWidth: 15, halign: 'right', fontStyle: 'bold' },
          7: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
          8: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && (data.column.index === 7 || data.column.index === 8)) {
            const row = sortedOscarRoutes[data.row.index];
            if (row) {
              if (row.quality > CONTRACTUAL_GOAL) {
                data.cell.styles.textColor = [5, 150, 105];
              } else if (row.quality >= 90) {
                data.cell.styles.textColor = [217, 119, 6];
              } else {
                data.cell.styles.textColor = [220, 38, 38];
              }
            }
          }
        },
        margin: { left: 14, right: 14, bottom: 16 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // SECTION 2: PROVEDOR TIAGO
  if (config.type !== 'provider_oscar' && (tiagoDrivers.length > 0 || sortedTiagoRoutes.length > 0)) {
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 16;
    }

    // 2.1 Tiago Drivers Ranking (Melhor para o Pior)
    if (tiagoDrivers.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 43, 92); // GLS Dark Blue
      doc.text('PROVEDOR TIAGO – RANKING DE FUNCIONÁRIOS (DO MELHOR PARA O PIOR)', 14, currentY);

      const tiagoDriverRows = tiagoDrivers.map((d, index) => [
        `${index + 1}º`,
        d.name,
        `${d.routes}`,
        `${d.packages}`,
        `${d.delivered}`,
        `${d.incidences}`,
        `${d.quality.toFixed(2)}%`,
        d.classification,
      ]);

      autoTable(doc, {
        startY: currentY + 2.5,
        head: [['Pos.', 'Funcionário / Motorista', 'Rotas', 'Saiu (Total)', 'Entregou', 'Incidências', 'Qualidade (%)', 'Status']],
        body: tiagoDriverRows,
        theme: 'grid',
        styles: {
          fontSize: 6.5,
          cellPadding: 1.5,
          font: 'helvetica',
        },
        headStyles: {
          fillColor: [0, 43, 92],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 50, fontStyle: 'bold' },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 22, halign: 'right' },
          4: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
          5: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
          6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
          7: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && (data.column.index === 6 || data.column.index === 7)) {
            const row = tiagoDrivers[data.row.index];
            if (row) {
              if (row.quality > CONTRACTUAL_GOAL) {
                data.cell.styles.textColor = [5, 150, 105];
              } else if (row.quality >= 90) {
                data.cell.styles.textColor = [217, 119, 6];
              } else {
                data.cell.styles.textColor = [220, 38, 38];
              }
            }
          }
        },
        margin: { left: 14, right: 14, bottom: 16 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;
    }

    // 2.2 Tiago Operational Routes (Data, Rota, Funcionário, etc. - Do Melhor para o Pior)
    if (sortedTiagoRoutes.length > 0) {
      if (currentY > pageHeight - 35) {
        doc.addPage();
        currentY = 16;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 43, 92); // GLS Dark Blue
      doc.text('PROVEDOR TIAGO – ROTAS OPERACIONAIS (DATA, ROTA & QUALIDADE)', 14, currentY);

      const tiagoRouteRows = sortedTiagoRoutes.slice(0, 40).map((r) => {
        const classif = getQualityClassification(r.quality);
        const delivered = getDelivered(r);
        return [
          r.date.split('-').reverse().join('/'),
          r.routeNumber,
          r.driverName,
          r.locality,
          r.packages.toString(),
          delivered.toString(),
          r.incidences.toString(),
          `${r.quality.toFixed(2)}%`,
          classif,
        ];
      });

      autoTable(doc, {
        startY: currentY + 2.5,
        head: [['Data', 'Rota', 'Funcionário / Motorista', 'Localidade', 'Saiu', 'Entregou', 'Incidências', 'Qualidade', 'Status']],
        body: tiagoRouteRows,
        theme: 'grid',
        styles: {
          fontSize: 6.5,
          cellPadding: 1.5,
          font: 'helvetica',
        },
        headStyles: {
          fillColor: [15, 23, 42], // Slate 900
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 16, halign: 'center' },
          1: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 40 },
          3: { cellWidth: 36 },
          4: { cellWidth: 14, halign: 'right' },
          5: { cellWidth: 15, halign: 'right', fontStyle: 'bold' },
          6: { cellWidth: 15, halign: 'right', fontStyle: 'bold' },
          7: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
          8: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && (data.column.index === 7 || data.column.index === 8)) {
            const row = sortedTiagoRoutes[data.row.index];
            if (row) {
              if (row.quality > CONTRACTUAL_GOAL) {
                data.cell.styles.textColor = [5, 150, 105];
              } else if (row.quality >= 90) {
                data.cell.styles.textColor = [217, 119, 6];
              } else {
                data.cell.styles.textColor = [220, 38, 38];
              }
            }
          }
        },
        margin: { left: 14, right: 14, bottom: 16 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(241, 245, 249);
    doc.rect(0, pageHeight - 11, pageWidth, 11, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'GLS – GESTÃO DE QUALIDADE | Fórmula Contratual: ((Saiu - Incidências) / Saiu) * 100 | Meta Fixa: 94.0%',
      14,
      pageHeight - 4.5
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 26, pageHeight - 4.5);
  }

  const filename = `GLS_Relatorio_Qualidade_${config.type}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

// 2. Specialized Fleet Report Generator (Furgonetas, Quilometragem, Abastecimento e Alertas)
export function generateFleetPdfReport(config: FleetReportConfig) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Helper metrics per vehicle
  const getVehicleStats = (plate: string) => {
    const pUpper = plate.trim().toUpperCase();
    const vKmLogs = config.mileageLogs.filter((m) => m.vehiclePlate.trim().toUpperCase() === pUpper);
    const vFuelLogs = config.fuelLogs.filter((f) => f.vehiclePlate.trim().toUpperCase() === pUpper);

    const vTotalKm = vKmLogs.reduce((acc, curr) => acc + (Number(curr.totalKm) || 0), 0);
    const daysCount = vKmLogs.length;
    const avgDailyKm = daysCount > 0 ? Number((vTotalKm / daysCount).toFixed(1)) : 0;

    let totalDist = 0;
    let totalLit = 0;
    vFuelLogs.forEach((f) => {
      if (f.distanceSinceLastFuel && f.distanceSinceLastFuel > 0 && Number(f.liters) > 0) {
        totalDist += f.distanceSinceLastFuel;
        totalLit += Number(f.liters);
      }
    });

    let avgKmL: number | null = null;
    if (totalDist > 0 && totalLit > 0) {
      avgKmL = Number((totalDist / totalLit).toFixed(2));
    } else if (vTotalKm > 0 && vFuelLogs.reduce((acc, c) => acc + Number(c.liters), 0) > 0) {
      avgKmL = Number((vTotalKm / vFuelLogs.reduce((acc, c) => acc + Number(c.liters), 0)).toFixed(2));
    }

    return {
      vTotalKm,
      daysCount,
      avgDailyKm,
      avgKmL,
      fuelLogsCount: vFuelLogs.length,
    };
  };

  // Global fleet calculations
  const totalKm = config.mileageLogs.reduce((acc, c) => acc + (Number(c.totalKm) || 0), 0);
  const totalFuelCost = config.fuelLogs.reduce((acc, c) => acc + (Number(c.totalCost) || 0), 0);
  const totalLiters = config.fuelLogs.reduce((acc, c) => acc + (Number(c.liters) || 0), 0);
  const totalMaintCost = config.maintenanceLogs.reduce((acc, c) => acc + (Number(c.cost) || 0), 0);
  const totalFleetCost = totalFuelCost + totalMaintCost;
  const overallAvgKmL = totalLiters > 0 && totalKm > 0 ? (totalKm / totalLiters).toFixed(2) : '0.00';
  const overallCostPerKm = totalKm > 0 ? (totalFleetCost / totalKm).toFixed(2) : '0.00';

  // Identify vehicles below acceptable efficiency threshold
  const vehiclesWithAlert = config.vehicles.filter((v) => {
    const stats = getVehicleStats(v.plate);
    return stats.avgKmL !== null && stats.avgKmL < config.minEfficiencyThreshold;
  });

  // 1. Header Banner
  doc.setFillColor(glsBlue[0], glsBlue[1], glsBlue[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Yellow accent line
  doc.setFillColor(glsYellow[0], glsYellow[1], glsYellow[2]);
  doc.rect(0, 28, pageWidth, 3, 'F');

  // GLS Text Logo & Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('GLS', 14, 15);

  doc.setFontSize(13);
  doc.text('CONTROLE DE FROTA: FURGONETAS, QUILOMETRAGEM & COMBUSTÍVEL', 35, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(230, 240, 255);
  doc.text(
    `Auditoria Operacional & Média de Consumo | Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    35,
    18
  );

  // 2. Report Title & Period Banner
  doc.setTextColor(glsDarkBlue[0], glsDarkBlue[1], glsDarkBlue[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(config.title.toUpperCase(), 14, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Período: ${config.periodLabel} | Provedor: ${config.provider === 'all' ? 'Oscar & Tiago' : config.provider} | Limite Aceitável: ${config.minEfficiencyThreshold} KM/L`,
    14,
    43
  );

  // 3. KPI Summary Boxes
  const boxY = 48;
  const boxWidth = (pageWidth - 28 - 9) / 4;
  const boxHeight = 22;

  const fleetKpis = [
    {
      title: 'QUILOMETRAGEM TOTAL',
      value: `${totalKm.toLocaleString('pt-BR')} KM`,
      sub: `${config.mileageLogs.length} rotas diárias auditadas`,
      color: [5, 150, 105],
    },
    {
      title: 'COMBUSTÍVEL TOTAL',
      value: `R$ ${totalFuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      sub: `${totalLiters.toFixed(1)} L (${config.fuelLogs.length} abastecimentos)`,
      color: [217, 119, 6],
    },
    {
      title: 'MÉDIA GERAL CONSUMO',
      value: `${overallAvgKmL} KM/L`,
      sub: `Meta Aceitável: ${config.minEfficiencyThreshold} KM/L`,
      color: Number(overallAvgKmL) >= config.minEfficiencyThreshold ? [5, 150, 105] : [220, 38, 38],
    },
    {
      title: 'CUSTO TOTAL FROTA',
      value: `R$ ${totalFleetCost.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      sub: `R$ ${overallCostPerKm} / KM rodado`,
      color: glsDarkBlue,
    },
  ];

  fleetKpis.forEach((b, i) => {
    const x = 14 + i * (boxWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, boxY, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFillColor(b.color[0], b.color[1], b.color[2]);
    doc.rect(x, boxY, boxWidth, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(b.title, x + 3, boxY + 7);

    doc.setFontSize(10.5);
    doc.setTextColor(b.color[0], b.color[1], b.color[2]);
    doc.text(b.value, x + 3, boxY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text(b.sub, x + 3, boxY + 19);
  });

  // 4. Efficiency Alert Banner
  const alertY = boxY + boxHeight + 4;
  let currentY = alertY;

  if (vehiclesWithAlert.length > 0) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(14, alertY, pageWidth - 28, 16, 1.5, 1.5, 'FD');

    doc.setFillColor(220, 38, 38);
    doc.rect(14, alertY, 3, 16, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(185, 28, 28);
    doc.text(
      `ALERTA DE EFICIÊNCIA: ${vehiclesWithAlert.length} furgoneta(s) operando abaixo do limite aceitável (< ${config.minEfficiencyThreshold} KM/L)`,
      20,
      alertY + 6
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(153, 27, 27);
    const alertPlates = vehiclesWithAlert.map((v) => `${v.plate} (${v.name})`).join(', ');
    doc.text(`Furgonetas em alerta: ${alertPlates}. Recomenda-se revisão de bicos, filtros e calibragem.`, 20, alertY + 11);

    currentY = alertY + 20;
  } else {
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(14, alertY, pageWidth - 28, 12, 1.5, 1.5, 'FD');

    doc.setFillColor(16, 185, 129);
    doc.rect(14, alertY, 3, 12, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(21, 128, 61);
    doc.text(
      `EFICIÊNCIA OPERACIONAL: Todas as furgonetas auditadas atingiram a meta mínima de ${config.minEfficiencyThreshold} KM/L.`,
      20,
      alertY + 7
    );

    currentY = alertY + 16;
  }

  // 5. Tables based on report type
  if (config.type === 'fleet_complete' || config.type === 'fleet_efficiency') {
    // Section Header: Furgonetas & Médias de Consumo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(glsDarkBlue[0], glsDarkBlue[1], glsDarkBlue[2]);
    doc.text('FURGONETAS CADASTRADAS: ODÔMETRO, MÉDIA DIÁRIA & CONSUMO (KM/L)', 14, currentY + 3);

    const vehicleRows = config.vehicles.map((v) => {
      const stats = getVehicleStats(v.plate);
      let statusLabel = 'SEM DADOS';
      if (stats.avgKmL !== null) {
        if (stats.avgKmL < config.minEfficiencyThreshold) statusLabel = 'ABAIXO DO LIMITE';
        else if (stats.avgKmL < config.minEfficiencyThreshold + 1.2) statusLabel = 'REGULAR';
        else statusLabel = 'EFICIENTE';
      }

      return [
        v.name,
        v.plate,
        v.model,
        v.provider,
        v.defaultDriverName || 'Rotativo',
        `${v.currentOdometer.toLocaleString('pt-BR')} KM`,
        stats.avgDailyKm > 0 ? `${stats.avgDailyKm} KM/dia` : '-',
        stats.avgKmL !== null ? `${stats.avgKmL} KM/L` : 'Aguardando',
        statusLabel,
      ];
    });

    autoTable(doc, {
      startY: currentY + 6,
      head: [['Identificação', 'Placa', 'Modelo', 'Provedor', 'Motorista Titular', 'Odômetro Atual', 'Média Diária', 'Consumo (KM/L)', 'Status Eficiência']],
      body: vehicleRows,
      theme: 'grid',
      styles: {
        fontSize: 6.5,
        cellPadding: 1.5,
        font: 'helvetica',
      },
      headStyles: {
        fillColor: [0, 87, 184],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 28 },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 24 },
        5: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 18, halign: 'right' },
        7: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
        8: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && (data.column.index === 7 || data.column.index === 8)) {
          const val = data.cell.raw as string;
          if (val === 'ABAIXO DO LIMITE') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fillColor = [254, 242, 242];
          } else if (val === 'REGULAR') {
            data.cell.styles.textColor = [217, 119, 6];
          } else if (val === 'EFICIENTE') {
            data.cell.styles.textColor = [5, 150, 105];
          }
        }
      },
      margin: { left: 14, right: 14, bottom: 18 },
    });

    // Next section: Abastecimentos recentes
    const lastY = (doc as any).lastAutoTable.finalY + 8;
    if (lastY < pageHeight - 40) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(glsDarkBlue[0], glsDarkBlue[1], glsDarkBlue[2]);
      doc.text('ÚLTIMOS ABASTECIMENTOS AUDITADOS COM MÉDIA DE CONSUMO', 14, lastY);

      const fuelRows = config.fuelLogs.slice(0, 15).map((f) => [
        f.date.split('-').reverse().join('/'),
        f.vehiclePlate,
        f.driverName,
        `${f.odometerKm.toLocaleString('pt-BR')} KM`,
        f.distanceSinceLastFuel ? `+${f.distanceSinceLastFuel} KM` : '1º abastec.',
        f.fuelEfficiencyKmL ? `${f.fuelEfficiencyKmL} KM/L` : '-',
        f.fuelType,
        `${f.liters.toFixed(1)} L`,
        `R$ ${f.totalCost.toFixed(2)}`,
        f.stationName || '-',
      ]);

      autoTable(doc, {
        startY: lastY + 3,
        head: [['Data', 'Placa', 'Motorista', 'Odômetro', 'KM Tanque', 'Média KM/L', 'Combustível', 'Litros', 'Total Pago', 'Posto']],
        body: fuelRows,
        theme: 'grid',
        styles: {
          fontSize: 6.5,
          cellPadding: 1.5,
          font: 'helvetica',
        },
        headStyles: {
          fillColor: [0, 43, 92],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 16, halign: 'center' },
          1: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 26 },
          3: { cellWidth: 20, halign: 'right' },
          4: { cellWidth: 18, halign: 'right' },
          5: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
          6: { cellWidth: 18, halign: 'center' },
          7: { cellWidth: 14, halign: 'right' },
          8: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
          9: { cellWidth: 24 },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 5) {
            const raw = data.cell.raw as string;
            const num = parseFloat(raw);
            if (!isNaN(num)) {
              if (num < config.minEfficiencyThreshold) {
                data.cell.styles.textColor = [220, 38, 38];
              } else {
                data.cell.styles.textColor = [5, 150, 105];
              }
            }
          }
        },
        margin: { left: 14, right: 14, bottom: 18 },
      });
    }
  } else if (config.type === 'fleet_mileage') {
    // Sub-report: Quilometragem Diária
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(glsDarkBlue[0], glsDarkBlue[1], glsDarkBlue[2]);
    doc.text('REGISTRO DIÁRIO DE ODÔMETRO (KM INICIAL & FINAL)', 14, currentY + 3);

    const mileageRows = config.mileageLogs.slice(0, 40).map((km) => {
      const stats = getVehicleStats(km.vehiclePlate);
      let statusStr = 'SEM DADOS';
      if (stats.avgKmL !== null) {
        statusStr = stats.avgKmL < config.minEfficiencyThreshold ? 'ALERTA' : 'EFICIENTE';
      }

      return [
        km.date.split('-').reverse().join('/'),
        km.provider,
        km.vehiclePlate,
        km.driverName,
        km.routeNumber || '-',
        `${km.startKm.toLocaleString('pt-BR')} KM`,
        `${km.endKm.toLocaleString('pt-BR')} KM`,
        `${km.totalKm.toLocaleString('pt-BR')} KM`,
        stats.avgKmL !== null ? `${stats.avgKmL} KM/L` : '-',
        statusStr,
      ];
    });

    autoTable(doc, {
      startY: currentY + 6,
      head: [['Data', 'Provedor', 'Placa', 'Motorista', 'Rota', 'KM Inicial', 'KM Final', 'KM Rodados', 'Consumo Médio', 'Status']],
      body: mileageRows,
      theme: 'grid',
      styles: {
        fontSize: 6.5,
        cellPadding: 1.5,
        font: 'helvetica',
      },
      headStyles: {
        fillColor: [5, 150, 105],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 16, halign: 'center' },
        1: { cellWidth: 14, halign: 'center' },
        2: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 30 },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 20, halign: 'right' },
        6: { cellWidth: 20, halign: 'right' },
        7: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
        8: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
        9: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && (data.column.index === 8 || data.column.index === 9)) {
          const raw = data.cell.raw as string;
          if (raw === 'ALERTA') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fillColor = [254, 242, 242];
          } else if (raw === 'EFICIENTE') {
            data.cell.styles.textColor = [5, 150, 105];
          }
        }
      },
      margin: { left: 14, right: 14, bottom: 18 },
    });
  } else if (config.type === 'fleet_fuel') {
    // Sub-report: Abastecimentos & Custos
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(glsDarkBlue[0], glsDarkBlue[1], glsDarkBlue[2]);
    doc.text('HISTÓRICO DE ABASTECIMENTOS, RENDIMENTO POR TANQUE E CUSTOS', 14, currentY + 3);

    const fuelRows = config.fuelLogs.slice(0, 40).map((f) => [
      f.date.split('-').reverse().join('/'),
      f.provider,
      f.vehiclePlate,
      f.driverName,
      `${f.odometerKm.toLocaleString('pt-BR')} KM`,
      f.distanceSinceLastFuel ? `+${f.distanceSinceLastFuel} KM` : '-',
      f.fuelEfficiencyKmL ? `${f.fuelEfficiencyKmL} KM/L` : '-',
      f.costPerKm ? `R$ ${f.costPerKm}/KM` : '-',
      f.fuelType,
      `${f.liters.toFixed(1)} L`,
      `R$ ${f.pricePerLiter.toFixed(2)}`,
      `R$ ${f.totalCost.toFixed(2)}`,
      f.stationName || '-',
    ]);

    autoTable(doc, {
      startY: currentY + 6,
      head: [['Data', 'Provedor', 'Placa', 'Motorista', 'Odômetro', 'KM Tanque', 'Média KM/L', 'Custo/KM', 'Combustível', 'Litros', 'Preço/L', 'Total Pago', 'Posto / NF']],
      body: fuelRows,
      theme: 'grid',
      styles: {
        fontSize: 6,
        cellPadding: 1.2,
        font: 'helvetica',
      },
      headStyles: {
        fillColor: [217, 119, 6],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 12, halign: 'center' },
        2: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 24 },
        4: { cellWidth: 16, halign: 'right' },
        5: { cellWidth: 14, halign: 'right' },
        6: { cellWidth: 14, halign: 'right', fontStyle: 'bold' },
        7: { cellWidth: 14, halign: 'right' },
        8: { cellWidth: 15, halign: 'center' },
        9: { cellWidth: 11, halign: 'right' },
        10: { cellWidth: 11, halign: 'right' },
        11: { cellWidth: 15, halign: 'right', fontStyle: 'bold' },
        12: { cellWidth: 18 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 6) {
          const raw = data.cell.raw as string;
          const num = parseFloat(raw);
          if (!isNaN(num)) {
            if (num < config.minEfficiencyThreshold) {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fillColor = [254, 242, 242];
            } else {
              data.cell.styles.textColor = [5, 150, 105];
            }
          }
        }
      },
      margin: { left: 14, right: 14, bottom: 18 },
    });
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(241, 245, 249);
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'GLS – GESTÃO DE QUALIDADE & CONTROLE DE FROTA | Auditoria e Monitoramento de Consumo de Combustível',
      14,
      pageHeight - 5
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 30, pageHeight - 5);
  }

  const filename = `GLS_Relatorio_Frota_${config.type}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
