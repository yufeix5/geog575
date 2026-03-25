// Safely read population for a specific year from feature properties.
export function getPopulation(feature, year) {
  // Dataset stores years as string keys, so normalize numeric input first.
  const pop = feature?.properties?.population?.[String(year)];
  // Use null for missing values so downstream formatting can display placeholder.
  return pop ?? null;
}

// Safely read global rank for a specific year.
export function getGlobalRank(feature, year) {
  const rank = feature?.properties?.rank?.[String(year)];
  // Rank may be undefined for some years/cities; keep output consistent.
  return Number.isFinite(rank) ? rank : null;
}

// Read precomputed national rank from lookup map.
export function getNationalRank(nationalRanksByCityCodeYear, feature, year) {
  const cityCode = feature?.properties?.city_code;
  // Stable numeric city code is required to look up precomputed national ranks.
  if (!Number.isFinite(cityCode)) return null;
  return nationalRanksByCityCodeYear.get(`${cityCode}:${year}`) ?? null;
}

// Build (city_code:year) -> national rank for each country-year slice.
export function buildNationalRanks(features, chartYears, getPopulationFn) {
  // First group all candidate cities by (year + country) buckets.
  const byYearCountry = new Map();

  features.forEach(feature => {
    const country = feature?.properties?.country;
    const cityCode = feature?.properties?.city_code;
    if (!country || !Number.isFinite(cityCode)) return;

    chartYears.forEach(year => {
      const pop = getPopulationFn(feature, year);
      // Skip empty/invalid rows so ranking only uses comparable population values.
      if (!Number.isFinite(pop) || pop <= 0) return;

      const key = `${year}:${country}`;
      // Each bucket stores city code and population for later descending sort.
      if (!byYearCountry.has(key)) byYearCountry.set(key, []);
      byYearCountry.get(key).push({ cityCode, pop });
    });
  });

  // Convert grouped arrays into fast lookup map: city_code:year -> national rank.
  const ranks = new Map();
  byYearCountry.forEach((entries, key) => {
    const [year] = key.split(":");
    // Higher population should always receive better (smaller) rank number.
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
  // City code avoids duplicate-name collisions (e.g., same city name in different countries).
  if (Number.isFinite(cityCode)) return `code:${cityCode}`;
  // Fallback key still keeps ranking list functional when city_code is missing.
  return `name:${feature?.properties?.city}|${feature?.properties?.country}`;
}
