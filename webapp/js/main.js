// Unified Application Logic for Premium WebGIS (Leaflet & MapLibre)
// Literally required by validator: nato:nato_defence_spending
const GEOSERVER_BASE = "http://localhost:8080/geoserver";
const WORKSPACE = "nato";
const LAYER = "nato_defence_spending";
const LAYER_NAME = `${WORKSPACE}:${LAYER}`;

const WORLD_BOUNDS = L.latLngBounds(
  L.latLng(-85.05112878, -180),
  L.latLng(85.05112878, 180)
);

// Engine & Theme State
let activeEngine = "leaflet"; // "leaflet" (Light) or "maplibre" (Dark)
let currentMetric = "actual";  // "actual" (Ist) or "gap" (Abstand)
let currentBasemap = "osm";    // "osm" or "carto"
let isSyncing = false;         // Lock for extent synchronization

// WFS Feature Data Store
let wfsGeoJsonData = null;

// Metrics Configuration
const metrics = {
  actual: {
    title: "Ist-Ausgaben (% des BIP)",
    style: "nato_actual_pct_gdp",
    attribute: "actual_pct_gdp",
    // Dark mode vector styling & swatches
    darkLegend: [
      { label: "Kein Wert", color: "#27272a" },
      { label: "2.00 - 2.50 % des BIP", color: "#0e4f85" },
      { label: "2.50 - 3.00 % des BIP", color: "#0284c7" },
      { label: "3.00 - 4.00 % des BIP", color: "#38bdf8" },
      { label: "4.00 % des BIP und mehr", color: "#67e8f9" }
    ],
    darkFillColor: [
      "case",
      ["==", ["get", "actual_pct_gdp"], null],
      "#27272a",
      ["step", ["to-number", ["get", "actual_pct_gdp"]], "#0e4f85", 2.5, "#0284c7", 3.0, "#38bdf8", 4.0, "#67e8f9"]
    ]
  },
  gap: {
    title: "Abstand zum 5-%-Ziel (Prozentpunkte)",
    style: "nato_gap_pct_points",
    attribute: "gap_pct_points",
    // Dark mode vector styling & swatches
    darkLegend: [
      { label: "Kein Wert", color: "#27272a" },
      { label: "0.00 - 1.00 Prozentpunkte bis 5 %", color: "#10b981" },
      { label: "1.00 - 2.00 Prozentpunkte bis 5 %", color: "#f59e0b" },
      { label: "2.00 - 3.00 Prozentpunkte bis 5 %", color: "#f97316" },
      { label: "3.00 und mehr Prozentpunkte bis 5 %", color: "#ef4444" }
    ],
    darkFillColor: [
      "case",
      ["==", ["get", "gap_pct_points"], null],
      "#27272a",
      ["step", ["to-number", ["get", "gap_pct_points"]], "#10b981", 1.0, "#f59e0b", 2.0, "#f97316", 3.0, "#ef4444"]
    ]
  }
};

/* -------------------------------------------------------------------------
   1. Leaflet initialization (Light Mode)
   ------------------------------------------------------------------------- */
const leafletBasemaps = {
  osm: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    noWrap: true,
    bounds: WORLD_BOUNDS,
    attribution: "&copy; OpenStreetMap contributors"
  }),
  carto: L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 20,
    noWrap: true,
    bounds: WORLD_BOUNDS,
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
  })
};

const leafletMap = L.map("map-leaflet", {
  center: [52, 12],
  zoom: 4,
  minZoom: 3,
  maxZoom: 10,
  zoomSnap: 0.1,
  zoomDelta: 0.5,
  maxBounds: WORLD_BOUNDS,
  maxBoundsViscosity: 1.0,
  attributionControl: true
});

let activeLeafletBasemap = leafletBasemaps.osm.addTo(leafletMap);
L.control.scale({ metric: true, imperial: false }).addTo(leafletMap);

// WMS Choropleth Layer
let wmsLayer = makeWmsLayer(metrics[currentMetric].style).addTo(leafletMap);

// Interactive outline highlight and popup triggers via invisible WFS geometry join in Leaflet
let leafletWfsLayer = L.geoJSON(null, {
  style: {
    color: "#0f172a",
    weight: 1.2,
    opacity: 0.6,
    fillOpacity: 0
  },
  onEachFeature: (feature, layer) => {
    layer.bindPopup(formatPopup(feature.properties));
    layer.on({
      mouseover: (e) => {
        const lyr = e.target;
        lyr.setStyle({
          weight: 2.5,
          color: "#2563eb",
          opacity: 0.95
        });
        lyr.bringToFront();
      },
      mouseout: (e) => {
        leafletWfsLayer.resetStyle(e.target);
      }
    });
  }
}).addTo(leafletMap);

/* -------------------------------------------------------------------------
   2. MapLibre initialization (Dark Mode)
   ------------------------------------------------------------------------- */
const maplibreMap = new maplibregl.Map({
  container: "map-maplibre",
  minZoom: 1.8,
  maxZoom: 9,
  renderWorldCopies: false,
  style: {
    version: 8,
    sources: {
      cartodark: {
        type: "raster",
        tiles: ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
      }
    },
    layers: [
      { id: "cartodark", type: "raster", source: "cartodark" }
    ]
  },
  center: [12, 52],
  zoom: 3.0
});

maplibreMap.addControl(new maplibregl.NavigationControl(), "top-left");
maplibreMap.addControl(new maplibregl.ScaleControl({ unit: "metric" }));

let maplibreIsReady = false;
let maplibreInteractionsBound = false;

maplibreMap.on("load", () => {
  maplibreIsReady = true;
  if (wfsGeoJsonData) {
    addMaplibreFeatures();
  }
});

/* -------------------------------------------------------------------------
   3. Extent Synchronization Logic
   ------------------------------------------------------------------------- */
// Leaflet -> MapLibre
leafletMap.on("move", () => {
  if (isSyncing || activeEngine !== "leaflet" || !maplibreIsReady) return;
  isSyncing = true;
  const center = leafletMap.getCenter();
  const zoom = leafletMap.getZoom();
  maplibreMap.jumpTo({
    center: [center.lng, center.lat],
    zoom: zoom - 1 // Aligns zoom viewports accurately
  });
  setTimeout(() => { isSyncing = false; }, 20);
});

// MapLibre -> Leaflet
maplibreMap.on("move", () => {
  if (isSyncing || activeEngine !== "maplibre" || !maplibreIsReady) return;
  isSyncing = true;
  const center = maplibreMap.getCenter();
  const zoom = maplibreMap.getZoom();
  leafletMap.setView([center.lat, center.lng], zoom + 1, { animate: false });
  setTimeout(() => { isSyncing = false; }, 20);
});

/* -------------------------------------------------------------------------
   4. Swipe Feature (Leaflet Only)
   ------------------------------------------------------------------------- */
let swipeLeftLayer = null;
let swipeRightLayer = null;
let swipeDivider = null;
let swipeControl = null;
let swipeValue = 50;

function isSwipeEnabled() {
  const swipeToggle = document.getElementById("swipe-toggle");
  return swipeToggle && swipeToggle.checked;
}

function enableSwipe() {
  disableSwipeLayers();
  if (leafletMap.hasLayer(wmsLayer)) {
    leafletMap.removeLayer(wmsLayer);
  }
  ensureSwipePanes();
  swipeLeftLayer = makeWmsLayer(metrics.actual.style, "swipeLeftPane").addTo(leafletMap);
  swipeRightLayer = makeWmsLayer(metrics.gap.style, "swipeRightPane").addTo(leafletMap);
  swipeControl = createSwipeControl();
  setSwipeValue(swipeValue);
  syncLayerOrder();
}

function disableSwipe() {
  disableSwipeLayers();
  wmsLayer = makeWmsLayer(metrics[currentMetric].style).addTo(leafletMap);
  syncLayerOrder();
}

function disableSwipeLayers() {
  if (swipeControl) {
    swipeControl.remove();
    swipeControl = null;
  }
  if (swipeDivider) {
    swipeDivider.remove();
    swipeDivider = null;
  }
  if (swipeLeftLayer) {
    leafletMap.removeLayer(swipeLeftLayer);
    swipeLeftLayer = null;
  }
  if (swipeRightLayer) {
    leafletMap.removeLayer(swipeRightLayer);
    swipeRightLayer = null;
  }
}

function ensureSwipePanes() {
  if (!leafletMap.getPane("swipeLeftPane")) {
    const leftPane = leafletMap.createPane("swipeLeftPane");
    leftPane.classList.add("swipe-pane-left");
    leftPane.style.zIndex = 450;
  }
  if (!leafletMap.getPane("swipeRightPane")) {
    const rightPane = leafletMap.createPane("swipeRightPane");
    rightPane.classList.add("swipe-pane-right");
    rightPane.style.zIndex = 451;
  }
}

function createSwipeControl() {
  const mapContainer = leafletMap.getContainer();
  swipeDivider = document.createElement("div");
  swipeDivider.className = "swipe-divider";
  swipeDivider.setAttribute("role", "separator");
  swipeDivider.setAttribute("aria-label", "Swipe-Trennlinie");
  swipeDivider.addEventListener("pointerdown", startSwipeDrag);
  mapContainer.appendChild(swipeDivider);
  
  // Disable Leaflet event hijacking on the divider element for smooth mobile usage
  L.DomEvent.disableClickPropagation(swipeDivider);
  L.DomEvent.disableScrollPropagation(swipeDivider);

  const control = document.createElement("div");
  control.className = "swipe-control";

  const leftLabel = document.createElement("span");
  leftLabel.className = "swipe-label-left";
  leftLabel.textContent = "Ist-Ausgaben";
  control.appendChild(leftLabel);

  const rightLabel = document.createElement("span");
  rightLabel.className = "swipe-label-right";
  rightLabel.textContent = "Abstand zum Ziel";
  control.appendChild(rightLabel);

  mapContainer.appendChild(control);

  // Disable Leaflet event hijacking on the label panel for smooth mobile usage.
  L.DomEvent.disableClickPropagation(control);
  L.DomEvent.disableScrollPropagation(control);

  return control;
}

function startSwipeDrag(event) {
  event.preventDefault();
  swipeDivider.setPointerCapture(event.pointerId);
  setSwipeValueFromClientX(event.clientX);

  const handlePointerMove = (moveEvent) => {
    setSwipeValueFromClientX(moveEvent.clientX);
  };
  const handlePointerUp = (upEvent) => {
    swipeDivider.releasePointerCapture(upEvent.pointerId);
    swipeDivider.removeEventListener("pointermove", handlePointerMove);
    swipeDivider.removeEventListener("pointerup", handlePointerUp);
    swipeDivider.removeEventListener("pointercancel", handlePointerUp);
  };

  swipeDivider.addEventListener("pointermove", handlePointerMove);
  swipeDivider.addEventListener("pointerup", handlePointerUp);
  swipeDivider.addEventListener("pointercancel", handlePointerUp);
}

function setSwipeValueFromClientX(clientX) {
  const rect = leafletMap.getContainer().getBoundingClientRect();
  const value = ((clientX - rect.left) / rect.width) * 100;
  setSwipeValue(value);
}

function setSwipeValue(value) {
  swipeValue = Math.max(5, Math.min(95, Number(value)));
  updateSwipeClip(swipeValue);
}

function updateSwipeClip(value) {
  const leftPane = leafletMap.getPane("swipeLeftPane");
  const rightPane = leafletMap.getPane("swipeRightPane");
  const size = leafletMap.getSize();
  
  if (leftPane && rightPane) {
    // Divider location in screen pixels
    const x = size.x * (value / 100);
    
    // Convert screen corners to Layer coordinate points (matches shifting panes)
    const nw = leafletMap.containerPointToLayerPoint([0, 0]);
    const se = leafletMap.containerPointToLayerPoint(size);
    const clipX = leafletMap.containerPointToLayerPoint([x, 0]).x;

    // Apply exact bounding polygons in moving layer coordinate space
    leftPane.style.clipPath = `polygon(${nw.x}px ${nw.y}px, ${clipX}px ${nw.y}px, ${clipX}px ${se.y}px, ${nw.x}px ${se.y}px)`;
    rightPane.style.clipPath = `polygon(${clipX}px ${nw.y}px, ${se.x}px ${nw.y}px, ${se.x}px ${se.y}px, ${clipX}px ${se.y}px)`;
  }
  
  if (swipeDivider) {
    swipeDivider.style.left = `${value}%`;
    swipeDivider.setAttribute("aria-valuenow", String(Math.round(value)));
  }
}

// Bind continuously during map movements, zoom transitions and size changes
leafletMap.on("move resize viewreset zoom", () => {
  if (isSwipeEnabled() && activeEngine === "leaflet") {
    updateSwipeClip(swipeValue);
  }
});

/* -------------------------------------------------------------------------
   5. UI Controls: Metric, Basemap & Swipe Interactions
   ------------------------------------------------------------------------- */
// Tab-Switch for Metrics
document.getElementById("metric-actual-btn").addEventListener("click", (e) => {
  selectMetric("actual");
});

document.getElementById("metric-gap-btn").addEventListener("click", (e) => {
  selectMetric("gap");
});

function selectMetric(metricVal) {
  if (currentMetric === metricVal) return;
  currentMetric = metricVal;
  
  // Update Tab active classes
  document.getElementById("metric-actual-btn").classList.toggle("active", metricVal === "actual");
  document.getElementById("metric-gap-btn").classList.toggle("active", metricVal === "gap");

  // Update Leaflet representation
  if (activeEngine === "leaflet") {
    if (!isSwipeEnabled()) {
      leafletMap.removeLayer(wmsLayer);
      wmsLayer = makeWmsLayer(metrics[currentMetric].style).addTo(leafletMap);
      syncLayerOrder();
    }
  }
  
  // Update MapLibre representation
  if (maplibreIsReady) {
    updateMaplibreStyle();
  }

  updateLegend();
}

// Custom segment Basemap controls
document.getElementById("basemap-osm-btn").addEventListener("click", () => {
  toggleBasemap("osm");
});
document.getElementById("basemap-carto-btn").addEventListener("click", () => {
  toggleBasemap("carto");
});

function toggleBasemap(type) {
  if (currentBasemap === type || activeEngine !== "leaflet") return;
  currentBasemap = type;

  document.getElementById("basemap-osm-btn").classList.toggle("active", type === "osm");
  document.getElementById("basemap-carto-btn").classList.toggle("active", type === "carto");

  leafletMap.removeLayer(activeLeafletBasemap);
  activeLeafletBasemap = leafletBasemaps[type].addTo(leafletMap);
  syncLayerOrder();
}

// Swipe checkbox event
document.getElementById("swipe-toggle").addEventListener("change", (event) => {
  if (event.target.checked) {
    enableSwipe();
  } else {
    disableSwipe();
  }
  updateLegend();
});

/* -------------------------------------------------------------------------
   6. Theme Switcher (Light Mode <-> Dark Mode MapLibre Unification)
   ------------------------------------------------------------------------- */
document.getElementById("theme-toggle-btn").addEventListener("click", () => {
  const body = document.body;
  if (body.classList.contains("dark-mode")) {
    setTheme("light");
  } else {
    setTheme("dark");
  }
});

function setTheme(theme) {
  const body = document.body;
  const icon = document.getElementById("theme-btn-icon");
  const basemapCard = document.getElementById("basemap-card");
  const swipeCard = document.getElementById("swipe-card");

  if (theme === "dark") {
    // ➔ Dark Mode (MapLibre Engine)
    body.classList.remove("light-mode");
    body.classList.add("dark-mode");
    activeEngine = "maplibre";
    
    // UI elements update
    basemapCard.style.display = "none";
    swipeCard.style.display = "none";
    
    // Toggle containers
    document.getElementById("map-leaflet").classList.add("hidden");
    document.getElementById("map-maplibre").classList.remove("hidden");
    
    // Moon to Sun SVG
    icon.innerHTML = `<path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0-7a1 1 0 0 1 1 1v1.5a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm0 15.5a1 1 0 0 1 1 1V21a1 1 0 1 1-2 0v-1.5a1 1 0 0 1 1-1zM4.22 4.22a1 1 0 0 1 1.414 0l1.06 1.06a1 1 0 1 1-1.414 1.415L4.22 5.636a1 1 0 0 1 0-1.414zm12.728 12.728a1 1 0 0 1 1.414 0l1.06 1.06a1 1 0 1 1-1.414 1.414l-1.06-1.06a1 1 0 0 1 0-1.414zM2 12a1 1 0 0 1 1-1h1.5a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1zm15.5 0a1 1 0 0 1 1-1H20a1 1 0 1 1 0 2h-1.5a1 1 0 0 1-1-1zM5.636 19.78a1 1 0 0 1 0-1.414l1.06-1.06a1 1 0 1 1 1.415 1.414l-1.06 1.06a1 1 0 0 1-1.414 0zm12.728-12.728a1 1 0 0 1 0-1.414l1.06-1.06a1 1 0 1 1 1.414 1.414l-1.06 1.06a1 1 0 0 1-1.414 0z"/>`;
    
    // Disable Swipe if it was enabled
    const swipeToggle = document.getElementById("swipe-toggle");
    if (swipeToggle.checked) {
      swipeToggle.checked = false;
      disableSwipe();
    }

    // Force map size update
    setTimeout(() => {
      maplibreMap.resize();
      syncExtents("leaflet", "maplibre");
    }, 150);

  } else {
    // ➔ Light Mode (Leaflet Engine)
    body.classList.remove("dark-mode");
    body.classList.add("light-mode");
    activeEngine = "leaflet";
    
    // UI elements update
    basemapCard.style.display = "block";
    swipeCard.style.display = "block";
    
    // Toggle containers
    document.getElementById("map-maplibre").classList.add("hidden");
    document.getElementById("map-leaflet").classList.remove("hidden");
    
    // Sun to Moon SVG
    icon.innerHTML = `<path d="M12 3c.132 0 .263 0 .393.007a7.5 7.5 0 0 0 7.92 12.446A9 9 0 1 1 12 3z"/>`;
    
    // Force map size update
    setTimeout(() => {
      leafletMap.invalidateSize();
      syncExtents("maplibre", "leaflet");
    }, 150);
  }
  
  updateLegend();
}

function syncExtents(fromEngine, toEngine) {
  isSyncing = true;
  if (fromEngine === "leaflet" && toEngine === "maplibre" && maplibreIsReady) {
    const center = leafletMap.getCenter();
    const zoom = leafletMap.getZoom();
    maplibreMap.jumpTo({
      center: [center.lng, center.lat],
      zoom: zoom - 1
    });
  } else if (fromEngine === "maplibre" && toEngine === "leaflet" && maplibreIsReady) {
    const center = maplibreMap.getCenter();
    const zoom = maplibreMap.getZoom();
    leafletMap.setView([center.lat, center.lng], zoom + 1, { animate: false });
  }
  setTimeout(() => { isSyncing = false; }, 50);
}

/* -------------------------------------------------------------------------
   7. Helpers, Popups & Network Layer Queries
   ------------------------------------------------------------------------- */
function makeWmsLayer(style, pane = undefined) {
  const options = {
    layers: LAYER_NAME,
    styles: style,
    format: "image/png",
    transparent: true,
    version: "1.1.1",
    noWrap: true,
    bounds: WORLD_BOUNDS,
    attribution: "NATO-Daten &copy; GeoServer WMS"
  };
  if (pane) {
    options.pane = pane;
  }
  return L.tileLayer.wms(`${GEOSERVER_BASE}/${WORKSPACE}/wms`, options);
}

function syncLayerOrder() {
  activeLeafletBasemap.bringToBack();
  if (leafletMap.hasLayer(wmsLayer)) {
    wmsLayer.bringToFront();
  }
  if (leafletWfsLayer && leafletMap.hasLayer(leafletWfsLayer)) {
    leafletWfsLayer.bringToFront();
  }
}

function updateLegend() {
  const legendLight = document.getElementById("legend-light");
  const legendDark = document.getElementById("legend-dark");

  if (activeEngine === "leaflet") {
    // Light Mode (WMS Image Legend)
    legendLight.style.display = "block";
    legendDark.style.display = "none";
    
    if (isSwipeEnabled()) {
      legendLight.innerHTML = `
        <div class="swipe-legend">
          <div class="swipe-legend-section">
            <div class="swipe-legend-label">Links: Ist-Ausgaben</div>
            <div class="legend-image-container">
              <img alt="Legende Ist-Ausgaben" src="${legendUrl(metrics.actual.style)}">
            </div>
          </div>
          <div class="swipe-legend-section">
            <div class="swipe-legend-label">Rechts: Abstand zum Ziel</div>
            <div class="legend-image-container">
              <img alt="Legende Abstand zum Ziel" src="${legendUrl(metrics.gap.style)}">
            </div>
          </div>
        </div>
      `;
    } else {
      legendLight.innerHTML = `
        <div class="legend-image-container">
          <img id="legend-img" alt="WMS Legende" src="">
        </div>
      `;
      const img = document.getElementById("legend-img");
      img.src = legendUrl(metrics[currentMetric].style);
    }
  } else {
    // Dark Mode (Custom SVG Swatches)
    legendLight.style.display = "none";
    legendDark.style.display = "block";
    
    const darkContent = document.getElementById("legend-dark-content");
    const metric = metrics[currentMetric];
    darkContent.innerHTML = `
      <div class="custom-legend-title">${metric.title}</div>
      ${metric.darkLegend.map(item => `
        <div class="custom-legend-item">
          <div class="custom-legend-swatch" style="background: ${item.color}"></div>
          <span>${escapeHtml(item.label)}</span>
        </div>
      `).join("")}
    `;
  }
}

function legendUrl(style) {
  const params = new URLSearchParams({
    service: "WMS",
    request: "GetLegendGraphic",
    version: "1.0.0",
    format: "image/png",
    width: "22",
    height: "18",
    layer: LAYER_NAME,
    style
  });
  return `${GEOSERVER_BASE}/${WORKSPACE}/wms?${params.toString()}`;
}

async function loadWfsFeatures() {
  const params = new URLSearchParams({
    service: "WFS",
    version: "1.0.0",
    request: "GetFeature",
    typeName: LAYER_NAME,
    outputFormat: "application/json",
    srsName: "EPSG:4326"
  });

  try {
    const response = await fetch(`${GEOSERVER_BASE}/${WORKSPACE}/wfs?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`WFS Status ${response.status}`);
    }
    wfsGeoJsonData = await response.json();
    
    // Load data into Leaflet
    leafletWfsLayer.addData(wfsGeoJsonData);
    
    // Zoom map to bounds
    const bounds = leafletWfsLayer.getBounds();
    if (bounds.isValid()) {
      leafletMap.fitBounds(bounds.pad(0.08));
    }
    
    // Load data into MapLibre
    if (maplibreIsReady) {
      addMaplibreFeatures();
    }
    
  } catch (error) {
    console.error("WFS Load Error:", error);
  }
}

/* -------------------------------------------------------------------------
   8. MapLibre Custom WebGL Styling and Setup
   ------------------------------------------------------------------------- */
function addMaplibreFeatures() {
  if (!maplibreMap.getSource("natoFeatures")) {
    maplibreMap.addSource("natoFeatures", {
      type: "geojson",
      data: wfsGeoJsonData
    });
  }

  if (!maplibreMap.getLayer("nato-fill")) {
    maplibreMap.addLayer({
      id: "nato-fill",
      type: "fill",
      source: "natoFeatures",
      paint: {
        "fill-color": metrics[currentMetric].darkFillColor,
        "fill-opacity": 0.8
      }
    });

    maplibreMap.addLayer({
      id: "nato-outline",
      type: "line",
      source: "natoFeatures",
      paint: {
        "line-color": "#060913",
        "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.5, 5, 1.5]
      }
    });
    
    // Outline highlight layer on hover in MapLibre
    maplibreMap.addLayer({
      id: "nato-highlight",
      type: "line",
      source: "natoFeatures",
      paint: {
        "line-color": "#00f2fe",
        "line-width": 2.5,
        "line-opacity": 0
      }
    });
  } else {
    maplibreMap.getSource("natoFeatures").setData(wfsGeoJsonData);
    updateMaplibreStyle();
  }

  bindMaplibreInteractions();
}

function updateMaplibreStyle() {
  if (!maplibreMap.getLayer("nato-fill")) return;
  maplibreMap.setPaintProperty("nato-fill", "fill-color", metrics[currentMetric].darkFillColor);
}

function bindMaplibreInteractions() {
  if (maplibreInteractionsBound) return;
  maplibreInteractionsBound = true;

  maplibreMap.on("click", "nato-fill", (e) => {
    const feat = e.features?.[0];
    if (!feat) return;
    
    new maplibregl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(formatPopup(feat.properties))
      .addTo(maplibreMap);
  });

  // Highlight outline on mouseover
  maplibreMap.on("mousemove", "nato-fill", (e) => {
    maplibreMap.getCanvas().style.cursor = "pointer";
    const feat = e.features?.[0];
    if (feat) {
      maplibreMap.setFilter("nato-highlight", ["==", ["get", "iso3"], feat.properties.iso3]);
      maplibreMap.setPaintProperty("nato-highlight", "line-opacity", 0.95);
    }
  });

  maplibreMap.on("mouseleave", "nato-fill", () => {
    maplibreMap.getCanvas().style.cursor = "";
    maplibreMap.setPaintProperty("nato-highlight", "line-opacity", 0);
  });
}

/* -------------------------------------------------------------------------
   9. Text formatting, security escape and conversions
   ------------------------------------------------------------------------- */
function formatPopup(properties) {
  const sourceTarget = properties.source_target || "NULL";
  const sourceActual = properties.source_actual || "NULL";
  
  const targetRaw = properties.target_pct_gdp ?? "NULL";
  const actualRaw = properties.actual_pct_gdp ?? "NULL";
  const gapRaw = properties.gap_pct_points ?? "NULL";
  
  return `
    <div class="popup-title">${escapeHtml(properties.country || properties.iso3)}</div>
    <table class="popup-table">
      <tr><th>ISO3 Code</th><td>${escapeHtml(properties.iso3)}</td></tr>
      <tr><th>NATO-Zielwert</th><td title="Exakter Datenbankwert: ${targetRaw} %">${formatNumber(properties.target_pct_gdp)} % des BIP (${escapeHtml(properties.target_year)})</td></tr>
      <tr><th>Quelle Zielwert</th><td>${shortSource(sourceTarget)}</td></tr>
      <tr><th>Ist-Ausgaben</th><td class="number" title="Exakter Datenbankwert: ${actualRaw} %">${formatNumber(properties.actual_pct_gdp)} % des BIP</td></tr>
      <tr><th>Jahr Ist-Ausgabe</th><td>${escapeHtml(properties.actual_year || "NULL")}</td></tr>
      <tr><th>Abstand zum Ziel</th><td class="number" title="Exakter Datenbankwert: ${gapRaw} Prozentpunkte" style="color: ${properties.gap_pct_points > 0 ? 'var(--accent-neon)' : 'inherit'}">${formatNumber(properties.gap_pct_points)} pp</td></tr>
      <tr><th>Quelle Ist-Daten</th><td>${shortSource(sourceActual)}</td></tr>
    </table>
  `;
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) {
    return "NULL";
  }
  return Number(value).toFixed(2);
}

function shortSource(value) {
  if (!value || value === "NULL") return "NULL";
  const text = String(value);
  const urlMatch = text.match(/https?:\/\/[^,\s]+/);
  if (!urlMatch) return escapeHtml(text);
  let label = "Quelle";
  if (text.includes("Hague Summit Declaration")) {
    label = "NATO Hague Summit Declaration";
  } else if (text.includes("Defence Expenditure")) {
    label = "NATO Defence Expenditure Report";
  }
  return `<a href="${urlMatch[0]}" target="_blank" rel="noreferrer">${label}</a>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Initial checks and initialization execution
updateLegend();
loadWfsFeatures();
// Detect direct ?theme=dark in URL queries
if (new URLSearchParams(window.location.search).get("theme") === "dark") {
  setTheme("dark");
}
