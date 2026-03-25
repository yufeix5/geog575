// Handles geocoding search, map fly-to, and temporary search marker.
export function createSearchController({
  map,
  placeSearchInput,
  searchStatus,
  getSearchMarker,
  setSearchMarker
}) {
  // Inline status helper so calling code stays minimal.
  function setSearchStatus(text, isError = false) {
    searchStatus.textContent = text;
    // Error color gives quick feedback without interrupting interaction.
    searchStatus.style.color = isError ? "#a53e3e" : "#315266";
  }

  // Resolve query via Nominatim and focus map on first result.
  async function searchPlace() {
    const query = placeSearchInput.value.trim();
    if (!query) {
      setSearchStatus("Enter a place name to search.", true);
      return;
    }

    setSearchStatus("Searching...");

    try {
      // Nominatim free-form geocoding endpoint (single best match).
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("search request failed");

      const results = await response.json();
      if (!Array.isArray(results) || results.length === 0) {
        setSearchStatus("No results found.", true);
        return;
      }

      const result = results[0];
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        setSearchStatus("Invalid coordinates returned.", true);
        return;
      }

      map.flyTo([lat, lon], Math.max(map.getZoom(), 7), { duration: 1.2 });

      const existingSearchMarker = getSearchMarker();
      if (existingSearchMarker) {
        // Keep only one temporary marker so map does not become cluttered.
        map.removeLayer(existingSearchMarker);
      }

      const marker = L.circleMarker([lat, lon], {
        radius: 7,
        color: "#f59e0b",
        weight: 2,
        fillColor: "#fcd34d",
        fillOpacity: 0.95
      }).addTo(map);

      marker.bindPopup(result.display_name).openPopup();
      setSearchMarker(marker);
      setSearchStatus(`Found: ${result.display_name}`);
    } catch (error) {
      // Network/API errors are non-fatal; user can immediately retry.
      setSearchStatus("Search failed. Try again in a moment.", true);
    }
  }

  return {
    searchPlace
  };
}
