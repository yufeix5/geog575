import {
  keyYears,
  chartYears,
  chartLabelYears,
  forecastStartYear,
  colors,
  highlightStyle,
  chartStyle
} from "./constants.js";
import {
  radiusScale,
  formatPopulation,
  formatRank,
  getYearColor
} from "./utils.js";
import {
  getPopulation,
  getGlobalRank,
  getNationalRank,
  buildNationalRanks,
  getFeatureKey
} from "./data.js";
import { createLegendController } from "./legend-controller.js";
import { createInfoController } from "./info-controller.js";
import { createRankingController } from "./ranking-controller.js";
import { createSearchController } from "./search-controller.js";

// Main composition root: wires map, controllers, data loading, and UI events.
export function initApp() {
  // --- Map bootstrapping ---
  const map = L.map("map", { zoomControl: false }).setView([30, 90], 4);

  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap &copy; CARTO"
  }).addTo(map);

  // --- DOM references ---
  const yearSlider = document.getElementById("yearSlider");
  const yearLabel = document.getElementById("yearLabel");
  const prevYearBtn = document.getElementById("prevYear");
  const nextYearBtn = document.getElementById("nextYear");
  const showAllYearsCheckbox = document.getElementById("showAllYears");
  const showRankingPanelCheckbox = document.getElementById("showRankingPanel");
  const infoPanel = document.getElementById("infoPanel");
  const infoCloseBtn = document.getElementById("infoCloseBtn");
  const mapWidget = document.getElementById("mapWidget");
  const mobileSearchFab = document.getElementById("mobileSearchFab");
  const rankingPanel = document.getElementById("rankingPanel");
  const rankingCloseBtn = document.getElementById("rankingCloseBtn");
  const rankingYearFilter = document.getElementById("rankingYearFilter");
  const rankingTopNFilter = document.getElementById("rankingTopNFilter");
  const rankingList = document.getElementById("rankingList");
  const placeSearchInput = document.getElementById("placeSearchInput");
  const placeSearchBtn = document.getElementById("placeSearchBtn");
  const searchStatus = document.getElementById("searchStatus");
  const temporalLegendNote = document.getElementById("temporalLegendNote");

  const temporalItems = {
    1975: document.getElementById("temporalItem1975"),
    2000: document.getElementById("temporalItem2000"),
    2025: document.getElementById("temporalItem2025"),
    2050: document.getElementById("temporalItem2050")
  };

  const sizeLegendCircles = [
    document.getElementById("sizeCircle1"),
    document.getElementById("sizeCircle2"),
    document.getElementById("sizeCircle3")
  ];

  const sizeLegendLabels = [
    document.getElementById("sizeLabel1"),
    document.getElementById("sizeLabel2"),
    document.getElementById("sizeLabel3")
  ];

  // --- Runtime state ---
  const cityLayerGroup = L.layerGroup().addTo(map);
  let cityData = null;
  let nationalRanksByCityCodeYear = new Map();
  let searchMarker = null;
  let suppressNextMapClickClose = false;
  let mobileSelectedLayer = null;
  let mobileSelectedBaseStyle = null;
  let isMobileSearchOpen = false;

  // Leaflet needs explicit size invalidation after mobile layout panel changes.
  function refreshMapSize() {
    requestAnimationFrame(() => {
      map.invalidateSize(true);
    });
  }

  function isMobileLayout() {
    return window.matchMedia("(max-width: 700px)").matches;
  }

  // Hide mobile search drawer and reset accessibility state.
  function closeMobileSearch() {
    isMobileSearchOpen = false;
    mapWidget?.classList.remove("mobile-open");
    mobileSearchFab?.setAttribute("aria-expanded", "false");
    refreshMapSize();
  }

  function setMobilePanelsForInfoOpen(isInfoOpen) {
    if (!isMobileLayout()) return;

    if (isInfoOpen) {
      closeMobileSearch();
      if (rankingPanel) rankingPanel.style.display = "none";
      return;
    }

    if (rankingPanel) rankingPanel.style.display = "";
    setRankingPanelVisibility(showRankingPanelCheckbox?.checked ?? false);
  }

  // Close info panel and restore selected marker style on mobile.
  function hideInfoPanel() {
    infoPanel.style.display = "none";

    if (mobileSelectedLayer && mobileSelectedBaseStyle) {
      mobileSelectedLayer.setStyle(mobileSelectedBaseStyle);
    }
    mobileSelectedLayer = null;
    mobileSelectedBaseStyle = null;

    setMobilePanelsForInfoOpen(false);
    refreshMapSize();
  }

  const getNationalRankForFeature = (feature, year) => {
    return getNationalRank(nationalRanksByCityCodeYear, feature, year);
  };

  // --- Controller composition ---
  const { initRankingYearFilter, updateLegends } = createLegendController({
    keyYears,
    radiusScale,
    formatPopulation,
    temporalItems,
    temporalLegendNote,
    sizeLegendCircles,
    sizeLegendLabels
  });

  const { updateInfoPanel, positionInfoPanel } = createInfoController({
    infoPanel,
    yearSlider,
    chartYears,
    chartLabelYears,
    forecastStartYear,
    chartStyle,
    formatPopulation,
    formatRank,
    getPopulation,
    getGlobalRank,
    getNationalRank: getNationalRankForFeature,
    isMobileLayout,
    setMobilePanelsForInfoOpen
  });

  const { setRankingPanelVisibility, updateRankingPanel } = createRankingController({
    rankingPanel,
    rankingList,
    rankingTopNFilter,
    map,
    formatPopulation,
    getPopulation,
    getFeatureKey,
    getCityData: () => cityData,
    updateInfoPanel,
    isMobileLayout,
    infoPanel,
    closeMobileSearch,
    refreshMapSize
  });

  const { searchPlace } = createSearchController({
    map,
    placeSearchInput,
    searchStatus,
    getSearchMarker: () => searchMarker,
    setSearchMarker: marker => {
      searchMarker = marker;
    }
  });

  // Toggle mobile search drawer; keep it mutually exclusive with ranking/info overlays.
  function toggleMobileSearch() {
    if (!isMobileLayout()) return;

    if (isMobileSearchOpen) {
      closeMobileSearch();
      return;
    }

    if (infoPanel.style.display === "block") {
      hideInfoPanel();
    }

    showRankingPanelCheckbox.checked = false;
    setRankingPanelVisibility(false);

    isMobileSearchOpen = true;
    mapWidget.classList.add("mobile-open");
    mobileSearchFab.setAttribute("aria-expanded", "true");
    placeSearchInput.focus();
    refreshMapSize();
  }

  // Shared marker events for both single-year and overlay render modes.
  function bindInteractions(layer, feature, baseStyle, focusResolver) {
    let activeFocusLayer = layer;
    let activeFocusStyle = baseStyle;

    layer.on("mouseover", event => {
      if (isMobileLayout()) return;

      const focus = typeof focusResolver === "function"
        ? focusResolver()
        : { layer, baseStyle };

      activeFocusLayer = focus.layer;
      activeFocusStyle = focus.baseStyle;

      activeFocusLayer.setStyle({
        ...activeFocusStyle,
        color: highlightStyle.outline,
        weight: activeFocusStyle.weight + highlightStyle.extraWeight
      });
      updateInfoPanel(feature, event);
    });

    layer.on("mousemove", event => {
      if (isMobileLayout()) return;
      positionInfoPanel(event);
    });

    layer.on("click", event => {
      suppressNextMapClickClose = true;

      if (event?.originalEvent) {
        L.DomEvent.stopPropagation(event.originalEvent);
      }

      const focus = typeof focusResolver === "function"
        ? focusResolver()
        : { layer, baseStyle };

      activeFocusLayer = focus.layer;
      activeFocusStyle = focus.baseStyle;

      activeFocusLayer.setStyle({
        ...activeFocusStyle,
        color: highlightStyle.outline,
        weight: activeFocusStyle.weight + highlightStyle.extraWeight
      });

      if (isMobileLayout()) {
        if (mobileSelectedLayer && mobileSelectedBaseStyle && mobileSelectedLayer !== activeFocusLayer) {
          mobileSelectedLayer.setStyle(mobileSelectedBaseStyle);
        }
        mobileSelectedLayer = activeFocusLayer;
        mobileSelectedBaseStyle = activeFocusStyle;
      }

      updateInfoPanel(feature, event);
    });

    layer.on("mouseout", () => {
      if (isMobileLayout()) return;
      activeFocusLayer.setStyle(activeFocusStyle);
      hideInfoPanel();
    });
  }

  // Render only the currently selected year.
  function renderSingleYear(year) {
    cityLayerGroup.clearLayers();

    cityData.features.forEach(feature => {
      const pop = getPopulation(feature, year);
      if (!pop) return;

      const [lon, lat] = feature.geometry.coordinates;
      const color = getYearColor(year, keyYears, colors);
      const baseStyle = {
        radius: radiusScale(pop),
        color,
        weight: 1.6,
        fillColor: color,
        fillOpacity: 1
      };

      const circle = L.circleMarker([lat, lon], baseStyle);
      bindInteractions(circle, feature, baseStyle, null);
      circle.addTo(cityLayerGroup);
    });
  }

  // Render key years together for overlay comparison.
  function renderAllYears() {
    cityLayerGroup.clearLayers();
    const drawOrder = [...keyYears].reverse();
    const latestOrder = [...keyYears].reverse();

    cityData.features.forEach(feature => {
      const [lon, lat] = feature.geometry.coordinates;
      const markerEntries = [];

      drawOrder.forEach(year => {
        const pop = getPopulation(feature, year);
        if (!pop) return;

        const baseStyle = {
          radius: radiusScale(pop),
          color: colors[year],
          weight: 1.2,
          fillColor: colors[year],
          fillOpacity: 1
        };

        const circle = L.circleMarker([lat, lon], baseStyle);
        circle.addTo(cityLayerGroup);
        markerEntries.push({ year, circle, baseStyle });
      });

      if (markerEntries.length === 0) return;

      const latestEntry = latestOrder
        .map(year => markerEntries.find(entry => entry.year === year))
        .find(Boolean) || markerEntries[0];

      markerEntries.forEach(entry => {
        bindInteractions(entry.circle, feature, entry.baseStyle, () => {
          return {
            layer: latestEntry.circle,
            baseStyle: latestEntry.baseStyle
          };
        });
      });
    });
  }

  // Primary refresh pipeline for slider/ranking/legend and symbols.
  function updateMap() {
    const year = parseInt(yearSlider.value, 10);
    yearLabel.textContent = year;
    if (rankingYearFilter) rankingYearFilter.value = String(year);

    updateLegends(year, cityData, getPopulation, showAllYearsCheckbox.checked);
    updateRankingPanel(year);

    if (showAllYearsCheckbox.checked) {
      renderAllYears();
      return;
    }
    renderSingleYear(year);
  }

  // Step years by slider increment while clamping to min/max.
  function shiftYear(step) {
    const minYear = parseInt(yearSlider.min, 10);
    const maxYear = parseInt(yearSlider.max, 10);
    const sliderStep = parseInt(yearSlider.step, 10);
    const currentYear = parseInt(yearSlider.value, 10);
    const nextYear = Math.max(minYear, Math.min(maxYear, currentYear + step * sliderStep));

    yearSlider.value = String(nextYear);
    updateMap();
  }

  // --- Data bootstrapping ---
  fetch("./data/cities_grouped.geojson")
    .then(res => res.json())
    .then(data => {
      cityData = data;
      nationalRanksByCityCodeYear = buildNationalRanks(cityData.features, chartYears, getPopulation);
      initRankingYearFilter(rankingYearFilter, chartYears);
      if (rankingYearFilter) rankingYearFilter.value = yearSlider.value;
      setRankingPanelVisibility(showRankingPanelCheckbox?.checked ?? false);
      updateMap();
    });

  // --- UI event wiring ---
  yearSlider.addEventListener("input", updateMap);
  showAllYearsCheckbox.addEventListener("change", updateMap);
  showRankingPanelCheckbox?.addEventListener("change", () => {
    setRankingPanelVisibility(showRankingPanelCheckbox.checked);
  });
  prevYearBtn.addEventListener("click", () => shiftYear(-1));
  nextYearBtn.addEventListener("click", () => shiftYear(1));
  rankingYearFilter?.addEventListener("change", () => {
    yearSlider.value = rankingYearFilter.value;
    updateMap();
  });
  rankingTopNFilter?.addEventListener("change", () => {
    updateRankingPanel(parseInt(yearSlider.value, 10));
  });
  placeSearchBtn.addEventListener("click", searchPlace);
  placeSearchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchPlace();
    }
  });

  mobileSearchFab?.addEventListener("click", toggleMobileSearch);

  rankingCloseBtn?.addEventListener("click", () => {
    showRankingPanelCheckbox.checked = false;
    setRankingPanelVisibility(false);
  });

  L.DomEvent.disableClickPropagation(mapWidget);
  L.DomEvent.disableScrollPropagation(mapWidget);
  if (mobileSearchFab) L.DomEvent.disableClickPropagation(mobileSearchFab);
  if (rankingPanel) {
    L.DomEvent.disableClickPropagation(rankingPanel);
    L.DomEvent.disableScrollPropagation(rankingPanel);
  }

  if (infoCloseBtn) infoCloseBtn.addEventListener("click", hideInfoPanel);

  // Clicking map background closes mobile info panel unless click came from marker.
  map.on("click", () => {
    if (suppressNextMapClickClose) {
      suppressNextMapClickClose = false;
      return;
    }

    if (isMobileLayout()) hideInfoPanel();
  });

  // Keep map dimensions accurate on viewport changes.
  window.addEventListener("resize", () => {
    if (!isMobileLayout()) closeMobileSearch();
    refreshMapSize();
  });

  window.addEventListener("orientationchange", () => {
    setTimeout(refreshMapSize, 120);
  });
}
