// Manages ranking panel visibility and top-N city list rendering.
export function createRankingController({
  rankingPanel,
  rankingList,
  rankingTopNFilter,
  map,
  formatPopulation,
  getPopulation,
  getFeatureKey,
  getCityData,
  updateInfoPanel,
  isMobileLayout,
  infoPanel,
  closeMobileSearch,
  refreshMapSize
}) {
  // On mobile, ranking panel is hidden while info panel is open.
  function setRankingPanelVisibility(isVisible) {
    if (!rankingPanel) return;

    if (isMobileLayout() && infoPanel.style.display === "block") {
      rankingPanel.style.display = "none";
      rankingPanel.classList.remove("visible");
      return;
    }

    if (isMobileLayout() && isVisible) {
      closeMobileSearch();
    }

    rankingPanel.classList.toggle("visible", isVisible);
    refreshMapSize();
  }

  // Build the ranking list for selected year and chosen top-N value.
  function updateRankingPanel(year) {
    const cityData = getCityData();
    if (!rankingList || !cityData || !Array.isArray(cityData.features)) return;

    const topN = parseInt(rankingTopNFilter.value, 10);
    const bestByCity = new Map();

    cityData.features.forEach(feature => {
      const pop = getPopulation(feature, year);
      if (!Number.isFinite(pop) || pop <= 0) return;

      const key = getFeatureKey(feature);
      const existing = bestByCity.get(key);
      if (!existing || pop > existing.pop) {
        bestByCity.set(key, { feature, pop });
      }
    });

    const ranked = [...bestByCity.values()]
      .sort((a, b) => b.pop - a.pop)
      .slice(0, topN);

    rankingList.innerHTML = "";

    if (ranked.length === 0) {
      const empty = document.createElement("li");
      empty.className = "ranking-empty";
      empty.textContent = `No population data for ${year}.`;
      rankingList.appendChild(empty);
      return;
    }

    ranked.forEach((row, index) => {
      const item = document.createElement("li");
      item.className = "ranking-item";
      item.innerHTML = `
        <div class="ranking-rank">${index + 1}</div>
        <div>
          <div class="ranking-city">${row.feature.properties.city}</div>
          <div class="ranking-country">${row.feature.properties.country}</div>
        </div>
        <div class="ranking-pop">${formatPopulation(row.pop)}</div>
      `;

      item.addEventListener("click", () => {
        const [lon, lat] = row.feature.geometry.coordinates;
        map.flyTo([lat, lon], Math.max(map.getZoom(), 6), { duration: 0.8 });
        updateInfoPanel(row.feature, {
          originalEvent: {
            clientX: window.innerWidth * 0.62,
            clientY: window.innerHeight * 0.28
          }
        });
      });

      rankingList.appendChild(item);
    });
  }

  return {
    setRankingPanelVisibility,
    updateRankingPanel
  };
}
