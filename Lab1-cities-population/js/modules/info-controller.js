// Manages hover/click info panel positioning and trend chart rendering.
export function createInfoController({
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
  getNationalRank,
  isMobileLayout,
  setMobilePanelsForInfoOpen
}) {
  // Years shown in the summary table rows.
  const summaryYears = [1975, 2000, 2025, 2050];

  // Place floating info panel near pointer while keeping it on-screen.
  function positionInfoPanel(event) {
    if (isMobileLayout()) return;
    if (!event || !event.originalEvent) return;

    const pointerX = event.originalEvent.clientX;
    const pointerY = event.originalEvent.clientY;
    const margin = 12;
    const offset = 18;

    const panelWidth = infoPanel.offsetWidth || 460;
    const panelHeight = infoPanel.offsetHeight || 300;

    let left = pointerX + offset;
    let top = pointerY + offset;

    if (left + panelWidth > window.innerWidth - margin) {
      left = pointerX - panelWidth - offset;
    }

    if (top + panelHeight > window.innerHeight - margin) {
      top = window.innerHeight - panelHeight - margin;
    }

    if (left < margin) left = margin;
    if (top < margin) top = margin;

    infoPanel.style.left = `${left}px`;
    infoPanel.style.top = `${top}px`;
  }

  // Draw compact timeline chart inside info panel canvas.
  function drawTrendChart(feature) {
    const canvas = document.getElementById("trendChart");
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const values = chartYears
      .map(year => getPopulation(feature, year))
      .filter(value => Number.isFinite(value));

    if (values.length === 0) return;

    const minY = 0;
    const rawMax = Math.max(...values) * 1.05;
    const maxY = Math.ceil(rawMax / 1000000) * 1000000;

    const left = 58;
    const right = 16;
    const top = 12;
    const bottom = 34;
    const plotW = w - left - right;
    const plotH = h - top - bottom;
    const xSpan = chartYears[chartYears.length - 1] - chartYears[0];

    const getX = year => left + ((year - chartYears[0]) / xSpan) * plotW;
    const getY = value => top + plotH - ((value - minY) / (maxY - minY)) * plotH;

    ctx.strokeStyle = chartStyle.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, top + plotH);
    ctx.lineTo(left + plotW, top + plotH);
    ctx.stroke();

    ctx.fillStyle = chartStyle.label;
    ctx.font = "12px Arial";
    for (let i = 0; i <= 5; i++) {
      const v = minY + (maxY - minY) * (i / 5);
      const y = top + plotH - (plotH * i / 5);
      ctx.fillText(formatPopulation(v), 6, y + 4);
      ctx.strokeStyle = chartStyle.grid;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + plotW, y);
      ctx.stroke();
    }

    const points = chartYears
      .map(year => {
        const value = getPopulation(feature, year);
        if (!Number.isFinite(value)) return null;
        return { year, value, x: getX(year), y: getY(value) };
      })
      .filter(point => point !== null);

    if (points.length < 2) return;

    ctx.strokeStyle = chartStyle.line;
    ctx.lineWidth = 2;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      if (a.year >= forecastStartYear) {
        ctx.setLineDash([4, 3]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    points.forEach(point => {
      ctx.fillStyle = "#edf4f8";
      ctx.strokeStyle = chartStyle.line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    ctx.fillStyle = chartStyle.label;
    chartLabelYears.forEach(year => {
      const x = getX(year);
      ctx.fillText(String(year), x - 14, h - 8);
    });
  }

  // Fill info panel fields and show panel for current feature.
  function updateInfoPanel(feature, event) {
    const currentYear = parseInt(yearSlider.value, 10);

    document.getElementById("cityTitle").textContent = feature.properties.city;
    document.getElementById("countryTitle").textContent = feature.properties.country;
    document.getElementById("currentYearLabel").textContent = String(currentYear);
    document.getElementById("currentYearPopulationValue").textContent = formatPopulation(getPopulation(feature, currentYear));

    summaryYears.forEach(year => {
      document.getElementById(`p${year}`).textContent = formatPopulation(getPopulation(feature, year));
      document.getElementById(`g${year}`).textContent = formatRank(getGlobalRank(feature, year));
      document.getElementById(`n${year}`).textContent = formatRank(getNationalRank(feature, year));
    });

    drawTrendChart(feature);
    infoPanel.style.display = "block";

    if (isMobileLayout()) {
      infoPanel.style.left = "10px";
      infoPanel.style.right = "10px";
      infoPanel.style.top = "auto";
      infoPanel.style.bottom = "10px";
      setMobilePanelsForInfoOpen(true);
    } else {
      infoPanel.style.right = "auto";
      infoPanel.style.bottom = "auto";
      positionInfoPanel(event);
    }
  }

  return {
    updateInfoPanel,
    positionInfoPanel
  };
}
