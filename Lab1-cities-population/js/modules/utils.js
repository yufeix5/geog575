// Convert raw population count to proportional symbol radius.
export function radiusScale(population) {
  return Math.sqrt(population) / 180;
}

// Compact population formatter for labels and table cells.
export function formatPopulation(value) {
  if (!value && value !== 0) return "—";
  if (value >= 1000000) return (value / 1000000).toFixed(1) + "m";
  if (value >= 1000) return (value / 1000).toFixed(0) + "k";
  return value.toFixed(0);
}

// Uniform fallback for missing rank values.
export function formatRank(value) {
  return value === null ? "—" : String(value);
}

// Parse a #RGB/#RRGGBB color string into numeric channels.
export function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map(ch => ch + ch).join("")
    : clean;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

// Compose RGB channels back to #RRGGBB.
export function rgbToHex(r, g, b) {
  const toHex = value => value.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Linear interpolation between two hex colors.
export function mixColor(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const mix = (x, y) => Math.round(x + (y - x) * t);
  return rgbToHex(mix(a.r, b.r), mix(a.g, b.g), mix(a.b, b.b));
}

// Resolve year color by exact key-year lookup or interpolation between neighbors.
export function getYearColor(year, keyYears, colors) {
  if (colors[year]) return colors[year];

  for (let i = 0; i < keyYears.length - 1; i++) {
    const startYear = keyYears[i];
    const endYear = keyYears[i + 1];
    if (year > startYear && year < endYear) {
      const t = (year - startYear) / (endYear - startYear);
      return mixColor(colors[startYear], colors[endYear], t);
    }
  }

  return colors[2050];
}
