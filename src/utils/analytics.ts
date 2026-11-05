import {
  RouteRecord,
  QualityMetrics,
  RankingItem,
  CONTRACTUAL_GOAL,
  getQualityClassification,
  calculateQuality,
  ProviderName,
} from '../types.ts';

export function computeAggregateMetrics(routes: RouteRecord[]): QualityMetrics {
  const totalRoutes = routes.length;
  if (totalRoutes === 0) {
    return {
      totalRoutes: 0,
      totalVolumes: 0,
      totalPackages: 0,
      totalIncidences: 0,
      qualityPercentage: 100,
      classification: 'VERDE',
      goalMet: true,
      deltaToGoal: 6,
    };
  }

  let totalVolumes = 0;
  let totalPackages = 0;
  let totalIncidences = 0;

  for (const r of routes) {
    totalVolumes += Number(r.volumes) || 0;
    totalPackages += Number(r.packages) || 0;
    totalIncidences += Number(r.incidences) || 0;
  }

  // Critical rule: calculated by sum of packages and incidences, never simple average
  const qualityPercentage = calculateQuality(totalPackages, totalIncidences);
  const classification = getQualityClassification(qualityPercentage);
  const goalMet = qualityPercentage >= CONTRACTUAL_GOAL;
  const deltaToGoal = Number((qualityPercentage - CONTRACTUAL_GOAL).toFixed(2));

  return {
    totalRoutes,
    totalVolumes,
    totalPackages,
    totalIncidences,
    qualityPercentage,
    classification,
    goalMet,
    deltaToGoal,
  };
}

export function computeDriverRankings(routes: RouteRecord[]): RankingItem[] {
  const map = new Map<
    string,
    {
      driverName: string;
      provider: ProviderName;
      totalRoutes: number;
      packages: number;
      incidences: number;
    }
  >();

  for (const r of routes) {
    const key = `${r.provider}_${r.driverName.toLowerCase().trim()}`;
    const existing = map.get(key) || {
      driverName: r.driverName,
      provider: r.provider,
      totalRoutes: 0,
      packages: 0,
      incidences: 0,
    };

    existing.totalRoutes += 1;
    existing.packages += Number(r.packages) || 0;
    existing.incidences += Number(r.incidences) || 0;
    map.set(key, existing);
  }

  const list: RankingItem[] = [];
  map.forEach((item, id) => {
    const quality = calculateQuality(item.packages, item.incidences);
    list.push({
      id,
      label: item.driverName,
      subLabel: item.provider,
      provider: item.provider,
      quality,
      totalRoutes: item.totalRoutes,
      totalPackages: item.packages,
      totalIncidences: item.incidences,
      classification: getQualityClassification(quality),
    });
  });

  // Sort by quality descending; if tied, by highest packages delivered
  return list.sort((a, b) => {
    if (b.quality !== a.quality) return b.quality - a.quality;
    return b.totalPackages - a.totalPackages;
  });
}

export function computeRouteRankings(routes: RouteRecord[]): RankingItem[] {
  const map = new Map<
    string,
    {
      routeNumber: string;
      routeName: string;
      locality: string;
      provider: ProviderName;
      totalRuns: number;
      packages: number;
      incidences: number;
    }
  >();

  for (const r of routes) {
    const key = r.routeNumber.trim().toUpperCase();
    const existing = map.get(key) || {
      routeNumber: r.routeNumber,
      routeName: r.routeName,
      locality: r.locality,
      provider: r.provider,
      totalRuns: 0,
      packages: 0,
      incidences: 0,
    };

    existing.totalRuns += 1;
    existing.packages += Number(r.packages) || 0;
    existing.incidences += Number(r.incidences) || 0;
    map.set(key, existing);
  }

  const list: RankingItem[] = [];
  map.forEach((item, id) => {
    const quality = calculateQuality(item.packages, item.incidences);
    list.push({
      id,
      label: `${item.routeNumber} - ${item.routeName}`,
      subLabel: `${item.locality} (${item.provider})`,
      provider: item.provider,
      quality,
      totalRoutes: item.totalRuns,
      totalPackages: item.packages,
      totalIncidences: item.incidences,
      classification: getQualityClassification(quality),
    });
  });

  return list.sort((a, b) => {
    if (b.quality !== a.quality) return b.quality - a.quality;
    return b.totalPackages - a.totalPackages;
  });
}

export function computeDayRankings(routes: RouteRecord[]): RankingItem[] {
  const map = new Map<
    string,
    {
      date: string;
      totalRoutes: number;
      packages: number;
      incidences: number;
    }
  >();

  for (const r of routes) {
    const key = r.date;
    const existing = map.get(key) || {
      date: r.date,
      totalRoutes: 0,
      packages: 0,
      incidences: 0,
    };

    existing.totalRoutes += 1;
    existing.packages += Number(r.packages) || 0;
    existing.incidences += Number(r.incidences) || 0;
    map.set(key, existing);
  }

  const list: RankingItem[] = [];
  map.forEach((item, id) => {
    const quality = calculateQuality(item.packages, item.incidences);
    const dateFormatted = item.date.split('-').reverse().join('/');
    list.push({
      id,
      label: dateFormatted,
      subLabel: `${item.totalRoutes} rotas no dia`,
      quality,
      totalRoutes: item.totalRoutes,
      totalPackages: item.packages,
      totalIncidences: item.incidences,
      classification: getQualityClassification(quality),
    });
  });

  return list.sort((a, b) => b.quality - a.quality);
}

export interface DayComparison {
  date: string;
  formattedDate: string;
  oscarQuality: number | null;
  tiagoQuality: number | null;
  globalQuality: number;
  oscarPackages: number;
  tiagoPackages: number;
  oscarIncidences: number;
  tiagoIncidences: number;
}

export function computeTimelineComparison(routes: RouteRecord[]): DayComparison[] {
  const dateMap = new Map<
    string,
    {
      oscarPkgs: number;
      oscarIncs: number;
      tiagoPkgs: number;
      tiagoIncs: number;
    }
  >();

  for (const r of routes) {
    const entry = dateMap.get(r.date) || {
      oscarPkgs: 0,
      oscarIncs: 0,
      tiagoPkgs: 0,
      tiagoIncs: 0,
    };

    if (r.provider === 'Oscar') {
      entry.oscarPkgs += Number(r.packages) || 0;
      entry.oscarIncs += Number(r.incidences) || 0;
    } else {
      entry.tiagoPkgs += Number(r.packages) || 0;
      entry.tiagoIncs += Number(r.incidences) || 0;
    }
    dateMap.set(r.date, entry);
  }

  const sortedDates = Array.from(dateMap.keys()).sort();

  return sortedDates.map((date) => {
    const item = dateMap.get(date)!;
    const oscarQuality = item.oscarPkgs > 0 ? calculateQuality(item.oscarPkgs, item.oscarIncs) : null;
    const tiagoQuality = item.tiagoPkgs > 0 ? calculateQuality(item.tiagoPkgs, item.tiagoIncs) : null;
    const totalPkgs = item.oscarPkgs + item.tiagoPkgs;
    const totalIncs = item.oscarIncs + item.tiagoIncs;
    const globalQuality = totalPkgs > 0 ? calculateQuality(totalPkgs, totalIncs) : 100;

    return {
      date,
      formattedDate: date.split('-').slice(1).reverse().join('/'), // DD/MM
      oscarQuality,
      tiagoQuality,
      globalQuality,
      oscarPackages: item.oscarPkgs,
      tiagoPackages: item.tiagoPkgs,
      oscarIncidences: item.oscarIncs,
      tiagoIncidences: item.tiagoIncs,
    };
  });
}
