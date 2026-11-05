import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RouteRecord, QualityMetrics, CONTRACTUAL_GOAL, getQualityClassification, calculateQuality } from '../types.ts';

export type ReportType = 'daily' | 'weekly' | 'monthly' | 'provider_oscar' | 'provider_tiago' | 'comparative';

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

export function generatePdfReport(config: ReportConfig) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // GLS Brand Palette
  const glsBlue = [0, 87, 184]; // #0057B8
  const glsYellow = [255, 209, 0]; // #FFD100
  const glsDarkBlue = [0, 43, 92]; // #002B5C
  const colorGreen = [16, 185, 129];
  const colorYellow = [217, 119, 6];
  const colorRed = [220, 38, 38];

  // Helper to get color array from classification
  const getStatusColor = (percentage: number) => {
    if (percentage > CONTRACTUAL_GOAL) return colorGreen;
    if (percentage >= 90) return colorYellow;
    return colorRed;
  };

  // 1. Header Banner
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
  doc.text(`Meta Contratual Fixa: ${CONTRACTUAL_GOAL}% | Gerado em: ${new Date().toLocaleString('pt-BR')}`, 35, 18);

  // 2. Report Title & Period Banner
  doc.setTextColor(glsDarkBlue[0], glsDarkBlue[1], glsDarkBlue[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(config.title.toUpperCase(), 14, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Período de Análise: ${config.periodLabel} | Total de Rotas Auditadas: ${config.routes.length}`, 14, 43);

  // 3. KPI Summary Boxes
  const boxY = 48;
  const boxWidth = (pageWidth - 28 - 9) / 4; // 4 boxes with 3mm gap
  const boxHeight = 22;

  const boxes = [
    {
      title: 'QUALIDADE GERAL',
      value: `${config.globalMetrics.qualityPercentage.toFixed(2)}%`,
      sub: config.globalMetrics.goalMet ? 'META ATINGIDA' : 'ABAIXO DA META',
      color: getStatusColor(config.globalMetrics.qualityPercentage),
    },
    {
      title: 'OSCAR (PROVEDOR)',
      value: `${config.oscarMetrics.qualityPercentage.toFixed(2)}%`,
      sub: `${config.oscarMetrics.totalIncidences} inc. / ${config.oscarMetrics.totalPackages} pct`,
      color: getStatusColor(config.oscarMetrics.qualityPercentage),
    },
    {
      title: 'TIAGO (PROVEDOR)',
      value: `${config.tiagoMetrics.qualityPercentage.toFixed(2)}%`,
      sub: `${config.tiagoMetrics.totalIncidences} inc. / ${config.tiagoMetrics.totalPackages} pct`,
      color: getStatusColor(config.tiagoMetrics.qualityPercentage),
    },
    {
      title: 'TOTAL VOLUMES / PCT',
      value: `${config.globalMetrics.totalPackages}`,
      sub: `${config.globalMetrics.totalVolumes} vol. | ${config.globalMetrics.totalIncidences} inc.`,
      color: glsBlue,
    },
  ];

  boxes.forEach((b, i) => {
    const x = 14 + i * (boxWidth + 3);
    // Card background
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, boxY, boxWidth, boxHeight, 2, 2, 'FD');

    // Colored top pill indicator
    doc.setFillColor(b.color[0], b.color[1], b.color[2]);
    doc.rect(x, boxY, boxWidth, 2, 'F');

    // Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(b.title, x + 3, boxY + 7);

    doc.setFontSize(11);
    doc.setTextColor(b.color[0], b.color[1], b.color[2]);
    doc.text(b.value, x + 3, boxY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text(b.sub, x + 3, boxY + 19);
  });

  // 4. Comparison Bar & Meta 94% Visualization
  const barY = boxY + boxHeight + 4;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, barY, pageWidth - 28, 22, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(glsDarkBlue[0], glsDarkBlue[1], glsDarkBlue[2]);
  doc.text('COMPARATIVO DE QUALIDADE VS META CONTRATUAL (94.0%)', 18, barY + 6);

  // Bars rendering: Oscar vs Tiago
  const drawBar = (label: string, percentage: number, yPos: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(`${label}:`, 18, yPos + 3);

    const barMaxWidth = pageWidth - 28 - 60;
    const barStartX = 42;
    // Base track
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(barStartX, yPos, barMaxWidth, 4, 1, 1, 'F');

    // Fill
    const fillWidth = (Math.min(100, percentage) / 100) * barMaxWidth;
    const c = getStatusColor(percentage);
    doc.setFillColor(c[0], c[1], c[2]);
    doc.roundedRect(barStartX, yPos, fillWidth, 4, 1, 1, 'F');

    // Target 94% marker line
    const targetX = barStartX + 0.94 * barMaxWidth;
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.6);
    doc.line(targetX, yPos - 1, targetX, yPos + 5);

    // Percentage value text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(c[0], c[1], c[2]);
    doc.text(`${percentage.toFixed(2)}%`, barStartX + barMaxWidth + 3, yPos + 3);
  };

  drawBar('Oscar', config.oscarMetrics.qualityPercentage, barY + 9);
  drawBar('Tiago', config.tiagoMetrics.qualityPercentage, barY + 15);

  // 5. Highlights & Rankings Grid
  const rankY = barY + 25;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(glsDarkBlue[0], glsDarkBlue[1], glsDarkBlue[2]);
  doc.text('DESTAQUES & RANKING DO PERÍODO', 14, rankY);

  const rankBoxW = (pageWidth - 28 - 6) / 3;
  const rankBoxH = 18;

  const highlightCards = [
    {
      title: 'MELHOR / PIOR PROVEDOR',
      line1: `1º: ${config.oscarMetrics.qualityPercentage >= config.tiagoMetrics.qualityPercentage ? 'Oscar' : 'Tiago'} (${Math.max(config.oscarMetrics.qualityPercentage, config.tiagoMetrics.qualityPercentage).toFixed(2)}%)`,
      line2: `2º: ${config.oscarMetrics.qualityPercentage < config.tiagoMetrics.qualityPercentage ? 'Oscar' : 'Tiago'} (${Math.min(config.oscarMetrics.qualityPercentage, config.tiagoMetrics.qualityPercentage).toFixed(2)}%)`,
    },
    {
      title: 'MOTORISTAS DESTAQUE',
      line1: config.bestDriver ? `Melhor: ${config.bestDriver.name} (${config.bestDriver.quality.toFixed(1)}%)` : 'Sem dados',
      line2: config.worstDriver ? `Atenção: ${config.worstDriver.name} (${config.worstDriver.quality.toFixed(1)}%)` : 'Sem dados',
    },
    {
      title: 'ROTAS EXTREMAS',
      line1: config.bestRoute ? `Melhor: ${config.bestRoute.number} (${config.bestRoute.quality.toFixed(1)}%)` : 'Sem dados',
      line2: config.worstRoute ? `Crítica: ${config.worstRoute.number} (${config.worstRoute.quality.toFixed(1)}%)` : 'Sem dados',
    },
  ];

  highlightCards.forEach((c, idx) => {
    const x = 14 + idx * (rankBoxW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, rankY + 3, rankBoxW, rankBoxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.title, x + 3, rankY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(c.line1, x + 3, rankY + 13);
    doc.text(c.line2, x + 3, rankY + 18);
  });

  // 6. Detailed Routes Table
  const tableStartY = rankY + rankBoxH + 7;

  const tableRows = config.routes.slice(0, 45).map((r) => {
    const classif = getQualityClassification(r.quality);
    return [
      r.date.split('-').reverse().join('/'),
      r.provider,
      r.driverName,
      r.routeNumber,
      r.locality,
      r.volumes.toString(),
      r.packages.toString(),
      r.incidences.toString(),
      `${r.quality.toFixed(2)}%`,
      classif,
    ];
  });

  autoTable(doc, {
    startY: tableStartY,
    head: [['Data', 'Provedor', 'Motorista', 'Rota', 'Localidade', 'Vol.', 'Pct.', 'Inc.', 'Qualidade', 'Status']],
    body: tableRows,
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
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 16, halign: 'center' },
      2: { cellWidth: 32 },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 34 },
      5: { cellWidth: 12, halign: 'right' },
      6: { cellWidth: 12, halign: 'right' },
      7: { cellWidth: 12, halign: 'right' },
      8: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
      9: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Color code the quality and status column
      if (data.section === 'body' && (data.column.index === 8 || data.column.index === 9)) {
        const row = config.routes[data.row.index];
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
    margin: { left: 14, right: 14, bottom: 18 },
  });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(241, 245, 249);
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('GLS – GESTÃO DE QUALIDADE | Fórmula Contratual: ((Pacotes - Incidências) / Pacotes) * 100', 14, pageHeight - 5);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 30, pageHeight - 5);
  }

  // Trigger download
  const filename = `GLS_Relatorio_${config.type}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
