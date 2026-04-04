import type {
  GeoJSONSourceSpecification,
  LayerSpecification,
} from "maplibre-gl";

export function getClusterSource(
  data: GeoJSONSourceSpecification["data"]
): GeoJSONSourceSpecification {
  return {
    type: "geojson",
    data,
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 60,
    clusterProperties: {
      max_severity: ["max", ["get", "severity"]],
      sum_severity: ["+", ["get", "severity"]],
    },
  };
}

export function getHeatmapSource(
  data: GeoJSONSourceSpecification["data"]
): GeoJSONSourceSpecification {
  return {
    type: "geojson",
    data,
  };
}

export const HEATMAP_LAYER: LayerSpecification = {
  id: "remediation-heatmap",
  type: "heatmap",
  source: "remediation-heatmap",
  maxzoom: 14,
  paint: {
    "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 5, 1],
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 9, 2, 14, 3],
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      "rgba(0,0,0,0)",
      0.1,
      "rgba(65,182,196,0.6)",
      0.3,
      "rgba(127,205,187,0.75)",
      0.5,
      "rgba(254,217,118,0.85)",
      0.7,
      "rgba(253,141,60,0.9)",
      1,
      "rgba(189,0,38,1)",
    ],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 4, 9, 20, 14, 40],
    "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 10, 1, 14, 0],
  },
};

export const CLUSTER_CIRCLE_LAYER: LayerSpecification = {
  id: "remediation-clusters",
  type: "circle",
  source: "remediation-clusters",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "max_severity"],
      "#94a3b8",
      1,
      "#86efac",
      2,
      "#fde047",
      3,
      "#fb923c",
      4,
      "#f87171",
      5,
      "#dc2626",
    ],
    "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 100, 32, 500, 42],
    "circle-stroke-width": 2,
    "circle-stroke-color": "rgba(255,255,255,0.7)",
    "circle-opacity": 0.9,
  },
};

export const CLUSTER_COUNT_LAYER: LayerSpecification = {
  id: "remediation-cluster-count",
  type: "symbol",
  source: "remediation-clusters",
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
    "text-size": 13,
  },
  paint: {
    "text-color": "#1e293b",
  },
};

export const UNCLUSTERED_POINT_LAYER: LayerSpecification = {
  id: "remediation-unclustered",
  type: "circle",
  source: "remediation-clusters",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": [
      "step",
      ["get", "severity"],
      "#94a3b8",
      1,
      "#86efac",
      2,
      "#fde047",
      3,
      "#fb923c",
      4,
      "#f87171",
      5,
      "#dc2626",
    ],
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 5, 18, 10],
    "circle-stroke-width": 1.5,
    "circle-stroke-color": "rgba(255,255,255,0.8)",
    "circle-opacity": 0.95,
  },
};
