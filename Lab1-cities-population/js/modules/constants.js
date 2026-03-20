// Canonical key years used by layered rendering and legend highlighting.
export const keyYears = [1975, 2000, 2025, 2050];

// Full chart timeline (1975..2050 every 5 years).
export const chartYears = Array.from({ length: 16 }, (_, i) => 1975 + i * 5);

// Sparse labels so the x-axis stays readable.
export const chartLabelYears = [1980, 1990, 2000, 2010, 2020, 2030, 2040, 2050];

// Forecast segment starts from this year and is rendered dashed.
export const forecastStartYear = 2025;

// Palette for key years; in-between years are interpolated in utils.js.
export const colors = {
  1975: "#0c4f76",
  2000: "#1b78a5",
  2025: "#57bfe0",
  2050: "#a7dde9"
};

// Visual emphasis style for hovered/selected circles.
export const highlightStyle = {
  outline: "#f2c94c",
  extraWeight: 2.2
};

// Unified chart look so chart rendering stays consistent across updates.
export const chartStyle = {
  line: "#5a9fcf",
  grid: "rgba(120, 135, 150, 0.24)",
  axis: "rgba(96, 109, 122, 0.58)",
  label: "#3f4a54"
};
