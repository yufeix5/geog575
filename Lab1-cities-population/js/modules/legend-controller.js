// Handles temporal + proportional legend rendering.
export function createLegendController({
  keyYears,
  radiusScale,
  formatPopulation,
  temporalItems,
  temporalLegendNote,
  sizeLegendCircles,
  sizeLegendLabels
}) {
  // Pick representative populations for small/medium/large legend circles.
  function getLegendSamples(year, cityData, getPopulation) {
    if (!cityData || !Array.isArray(cityData.features)) {
      return [2000000, 6000000, 12000000];
    }

    const values = cityData.features
      .map(feature => getPopulation(feature, year))
      .filter(value => Number.isFinite(value) && value > 0)
      .sort((a, b) => a - b);

    if (values.length < 3) {
      return [2000000, 6000000, 12000000];
    }

    const pick = ratio => values[Math.min(values.length - 1, Math.floor((values.length - 1) * ratio))];
    return [pick(0.2), pick(0.5), pick(0.85)];
  }

  // Resize and relabel symbol legend based on current-year distribution.
  function updateSizeLegend(year, cityData, getPopulation) {
    const samples = getLegendSamples(year, cityData, getPopulation);

    samples.forEach((value, index) => {
      const radius = Math.max(4, Math.min(20, radiusScale(value)));
      const cx = [48, 110, 172][index];
      const cy = 62 - radius;

      sizeLegendCircles[index].setAttribute("r", String(radius));
      sizeLegendCircles[index].setAttribute("cx", String(cx));
      sizeLegendCircles[index].setAttribute("cy", String(cy));
      sizeLegendLabels[index].setAttribute("x", String(cx));
      sizeLegendLabels[index].textContent = formatPopulation(value);
    });
  }

  // Toggle active temporal chips in single-year vs key-year overlay mode.
  function updateTemporalLegend(year, showAllYearsChecked) {
    Object.keys(temporalItems).forEach(key => {
      temporalItems[key].classList.remove("active");
    });

    if (showAllYearsChecked) {
      Object.keys(temporalItems).forEach(key => {
        temporalItems[key].classList.add("active");
      });
      temporalLegendNote.textContent = "Overlay mode: key years 1975, 2000, 2025, 2050.";
      return;
    }

    const nearestKey = keyYears.reduce((prev, current) => {
      return Math.abs(current - year) < Math.abs(prev - year) ? current : prev;
    }, keyYears[0]);

    temporalItems[nearestKey].classList.add("active");
    temporalLegendNote.textContent = `Current map year: ${year}. Closest key-year color: ${nearestKey}.`;
  }

  // Keep one public method to refresh both legend blocks together.
  function updateLegends(year, cityData, getPopulation, showAllYearsChecked) {
    updateTemporalLegend(year, showAllYearsChecked);
    updateSizeLegend(year, cityData, getPopulation);
  }

  // Populate ranking year dropdown from full timeline.
  function initRankingYearFilter(rankingYearFilter, chartYears) {
    if (!rankingYearFilter) return;
    rankingYearFilter.innerHTML = "";
    chartYears.forEach(year => {
      const option = document.createElement("option");
      option.value = String(year);
      option.textContent = String(year);
      rankingYearFilter.appendChild(option);
    });
  }

  return {
    initRankingYearFilter,
    updateLegends
  };
}
