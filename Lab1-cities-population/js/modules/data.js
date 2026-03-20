// Safely read population for a specific year from feature properties.
export function getPopulation(feature, year) {
  const pop = feature?.properties?.population?.[String(year)];
  return pop ?? null;
}

// Safely read global rank for a specific year.
export function getGlobalRank(feature, year) {
  const rank = feature?.properties?.rank?.[String(year)];
  return Number.isFinite(rank) ? rank : null;
}

// Read precomputed national rank from lookup map.
export function getNationalRank(nationalRanksByCityCodeYear, feature, year) {
  const cityCode = feature?.properties?.city_code;
  if (!Number.isFinite(cityCode)) return null;
  return nationalRanksByCityCodeYear.get(`${cityCode}:${year}`) ?? null;
}

// Build (city_code:year) -> national rank for each country-year slice.
export function buildNationalRanks(features, chartYears, getPopulationFn) {
  const byYearCountry = new Map();

  features.forEach(feature => {
    const country = feature?.properties?.country;
    const cityCode = feature?.properties?.city_code;
    if (!country || !Number.isFinite(cityCode)) return;

    chartYears.forEach(year => {
      const pop = getPopulationFn(feature, year);
      if (!Number.isFinite(pop) || pop <= 0) return;

      const key = `${year}:${country}`;
      if (!byYearCountry.has(key)) byYearCountry.set(key, []);
      byYearCountry.get(key).push({ cityCode, pop });
    });
  });

  const ranks = new Map();
  byYearCountry.forEach((entries, key) => {
    const [year] = key.split(":");
    entries.sort((a, b) => b.pop - a.pop);
    entries.forEach((entry, index) => {
      ranks.set(`${entry.cityCode}:${year}`, index + 1);
    });
  });

  return ranks;
}

// Prefer stable city_code key; fallback to city+country composite key.
export function getFeatureKey(feature) {
  const cityCode = feature?.properties?.city_code;
  if (Number.isFinite(cityCode)) return `code:${cityCode}`;
  return `name:${feature?.properties?.city}|${feature?.properties?.country}`;
}
