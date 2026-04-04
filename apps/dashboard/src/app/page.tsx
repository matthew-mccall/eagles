"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type MapLayerMouseEvent, type MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  CLUSTER_CIRCLE_LAYER,
  CLUSTER_COUNT_LAYER,
  HEATMAP_LAYER,
  UNCLUSTERED_POINT_LAYER,
  getClusterSource,
  getHeatmapSource,
} from "@/lib/mapLayers";
import styles from "./page.module.css";

type RemediationPoint = {
  id: number | string;
  program_number: string | null;
  program_type: string | null;
  program_facility_name: string | null;
  site_class: string | null;
  locality: string | null;
  county: string | null;
  latitude: number;
  longitude: number;
};

type Bounds = {
  minLat: number;
  maxLat: number;
  minLong: number;
  maxLong: number;
};

type RoutePayload = {
  count: number;
  results: Array<RemediationPoint & { latitude: number | string; longitude: number | string }>;
};

type MapMode = "regular" | "heatmap" | "cluster";

type RemediationFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
    properties: {
      id: string;
      site_name: string;
      program_type: string;
      site_class: string;
      county: string;
      city: string;
      severity: number;
      weight: number;
    };
  }>;
};

const EMPTY_GEOJSON: RemediationFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const SITE_CLASS_SEVERITY: Record<string, number> = {
  "1": 5,
  "2": 4,
  "3": 3,
  "4": 2,
  "5": 1,
  A: 3,
  B: 2,
  C: 1,
  U: 0,
};

const REGULAR_COLORS = ["#94a3b8", "#86efac", "#fde047", "#fb923c", "#f87171", "#dc2626"];

export default function Index() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const mapModeRef = useRef<MapMode>("regular");
  const [points, setPoints] = useState<RemediationPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [mapMode, setMapMode] = useState<MapMode>("regular");
  const [mapReady, setMapReady] = useState(false);

  const pointCountLabel = useMemo(() => {
    if (loading) return "Loading points...";
    return `${points.length} remediation points in view`;
  }, [loading, points.length]);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
  }, []);

  const getSeverity = useCallback((siteClass: string | null): number => {
    const code = (siteClass ?? "U").trim().toUpperCase();
    return SITE_CLASS_SEVERITY[code] ?? 0;
  }, []);

  const normalizePoints = useCallback((rawPoints: RoutePayload["results"]): RemediationPoint[] => {
    return rawPoints
      .map((point) => {
        const latitude =
          typeof point.latitude === "number" ? point.latitude : Number.parseFloat(point.latitude);
        const longitude =
          typeof point.longitude === "number" ? point.longitude : Number.parseFloat(point.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return null;
        }

        return {
          ...point,
          latitude,
          longitude,
        };
      })
      .filter((point): point is RemediationPoint => point !== null);
  }, []);

  const toFeatureCollection = useCallback(
    (nextPoints: RemediationPoint[]): RemediationFeatureCollection => {
      return {
        type: "FeatureCollection",
        features: nextPoints.map((point) => {
          const severity = getSeverity(point.site_class);
          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [point.longitude, point.latitude],
            },
            properties: {
              id: String(point.id),
              site_name:
                point.program_facility_name ?? point.program_number ?? "Environmental remediation site",
              program_type: point.program_type ?? "Unknown",
              site_class: point.site_class ?? "U",
              county: point.county ?? "Unknown",
              city: point.locality ?? "Unknown",
              severity,
              weight: Math.max(1, severity),
            },
          };
        }),
      };
    },
    [getSeverity]
  );

  const applyMapMode = useCallback(
    (mode: MapMode) => {
      const map = mapRef.current;
      if (!map) return;

      if (!map.isStyleLoaded()) {
        return;
      }

      const showRegular = mode === "regular";
      const showHeatmap = mode === "heatmap";
      const showCluster = mode === "cluster";

      if (map.getLayer("remediation-heatmap")) {
        map.setLayoutProperty("remediation-heatmap", "visibility", showHeatmap ? "visible" : "none");
      }
      if (map.getLayer("remediation-clusters")) {
        map.setLayoutProperty("remediation-clusters", "visibility", showCluster ? "visible" : "none");
      }
      if (map.getLayer("remediation-cluster-count")) {
        map.setLayoutProperty(
          "remediation-cluster-count",
          "visibility",
          showCluster ? "visible" : "none"
        );
      }
      if (map.getLayer("remediation-unclustered")) {
        map.setLayoutProperty(
          "remediation-unclustered",
          "visibility",
          showCluster ? "visible" : "none"
        );
      }

      if (!showRegular) {
        clearMarkers();
      }
    },
    [clearMarkers]
  );

  const renderRegularMarkers = useCallback(
    (nextPoints: RemediationPoint[]) => {
      if (!mapRef.current) return;

      clearMarkers();

      nextPoints.forEach((point) => {
        const severity = getSeverity(point.site_class);
        const markerNode = document.createElement("div");
        markerNode.className = "remediation-marker";
        markerNode.style.cssText = [
          "width: 16px",
          "height: 16px",
          `background: ${REGULAR_COLORS[severity]}`,
          "border: 2px solid #ffffff",
          "border-radius: 50%",
          "box-shadow: 0 2px 8px rgba(0,0,0,0.25)",
        ].join(";");

        const popup = new maplibregl.Popup({ offset: 20 }).setHTML(
          `<div style="padding:8px;line-height:1.35;">
            <strong>${point.program_facility_name ?? point.program_number ?? "Site"}</strong><br/>
            ${point.program_number ? `Program: ${point.program_number}<br/>` : ""}
            ${point.program_type ? `Type: ${point.program_type}<br/>` : ""}
            ${point.site_class ? `Class: ${point.site_class}<br/>` : ""}
            ${point.locality ? `Locality: ${point.locality}<br/>` : ""}
            ${point.county ? `County: ${point.county}<br/>` : ""}
            Lat: ${point.latitude.toFixed(5)}<br/>
            Lng: ${point.longitude.toFixed(5)}
          </div>`
        );

        const marker = new maplibregl.Marker(markerNode)
          .setLngLat([point.longitude, point.latitude])
          .setPopup(popup)
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
      });
    },
    [clearMarkers, getSeverity]
  );

  const syncSources = useCallback(
    (nextPoints: RemediationPoint[]) => {
      const map = mapRef.current;
      if (!map) return;

      if (!map.isStyleLoaded()) {
        return;
      }

      const featureCollection = toFeatureCollection(nextPoints);
      const heatmapSource = map.getSource("remediation-heatmap") as GeoJSONSource | undefined;
      const clusterSource = map.getSource("remediation-clusters") as GeoJSONSource | undefined;

      heatmapSource?.setData(featureCollection);
      clusterSource?.setData(featureCollection);
    },
    [toFeatureCollection]
  );

  const loadPointsForBounds = useCallback(
    async (bounds: Bounds) => {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          min_long: bounds.minLong.toString(),
          max_long: bounds.maxLong.toString(),
          min_lat: bounds.minLat.toString(),
          max_lat: bounds.maxLat.toString(),
          limit: "1200",
        });

        const response = await fetch(`/api/get/env-remediation-sites?${params.toString()}`);
        if (!response.ok) {
          setPoints([]);
          syncSources([]);
          clearMarkers();
          return;
        }

        const payload = (await response.json()) as RoutePayload;
        const nextPoints = Array.isArray(payload.results) ? normalizePoints(payload.results) : [];

        setPoints(nextPoints);
        syncSources(nextPoints);

        if (mapModeRef.current === "regular") {
          renderRegularMarkers(nextPoints);
        }
      } catch {
        setPoints([]);
        syncSources([]);
        clearMarkers();
      } finally {
        setLoading(false);
      }
    },
    [clearMarkers, normalizePoints, renderRegularMarkers, syncSources]
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [-73.689, 42.7282],
      zoom: 12.5,
      minZoom: 10,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl(), "bottom-left");

    map.on("load", () => {
      map.addSource("remediation-heatmap", getHeatmapSource(EMPTY_GEOJSON));
      map.addSource("remediation-clusters", getClusterSource(EMPTY_GEOJSON));

      map.addLayer(HEATMAP_LAYER);
      map.addLayer(CLUSTER_CIRCLE_LAYER);
      map.addLayer(CLUSTER_COUNT_LAYER);
      map.addLayer(UNCLUSTERED_POINT_LAYER);

      map.on("click", "remediation-clusters", async (e: MapMouseEvent) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["remediation-clusters"],
        });
        const first = features[0];
        if (!first) return;

        const clusterId = first.properties?.cluster_id;
        const source = map.getSource("remediation-clusters") as GeoJSONSource;
        if (clusterId === undefined || clusterId === null) return;

        try {
          const zoom = await source.getClusterExpansionZoom(clusterId as number);
          const geometry = first.geometry as GeoJSON.Point;
          map.easeTo({
            center: geometry.coordinates as [number, number],
            zoom,
          });
        } catch {
          // Ignore cluster expansion errors to keep interaction smooth.
        }
      });

      map.on("click", "remediation-unclustered", (e: MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) return;

        const geometry = feature.geometry as GeoJSON.Point;
        const properties = feature.properties as {
          site_name?: string;
          program_type?: string;
          site_class?: string;
          county?: string;
          city?: string;
        };

        const popup = new maplibregl.Popup({ offset: 16 }).setHTML(
          `<div style="padding:8px;line-height:1.35;">
            <strong>${properties.site_name ?? "Site"}</strong><br/>
            ${properties.program_type ? `Type: ${properties.program_type}<br/>` : ""}
            ${properties.site_class ? `Class: ${properties.site_class}<br/>` : ""}
            ${properties.city ? `Locality: ${properties.city}<br/>` : ""}
            ${properties.county ? `County: ${properties.county}<br/>` : ""}
          </div>`
        );

        popup.setLngLat(geometry.coordinates as [number, number]).addTo(map);
      });

      map.on("mouseenter", "remediation-clusters", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "remediation-clusters", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "remediation-unclustered", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "remediation-unclustered", () => {
        map.getCanvas().style.cursor = "";
      });

      setMapReady(true);
      applyMapMode(mapModeRef.current);

      const mapBounds = map.getBounds();
      void loadPointsForBounds({
        minLat: mapBounds.getSouth(),
        maxLat: mapBounds.getNorth(),
        minLong: mapBounds.getWest(),
        maxLong: mapBounds.getEast(),
      });
    });

    const handleMoveEnd = async () => {
      if (!mapRef.current) return;
      const mapBounds = mapRef.current.getBounds();
      await loadPointsForBounds({
        minLat: mapBounds.getSouth(),
        maxLat: mapBounds.getNorth(),
        minLong: mapBounds.getWest(),
        maxLong: mapBounds.getEast(),
      });
    };

    map.on("moveend", handleMoveEnd);

    return () => {
      if (mapRef.current) {
        mapRef.current.off("moveend", handleMoveEnd);
      }
      clearMarkers();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [applyMapMode, clearMarkers, loadPointsForBounds]);

  useEffect(() => {
    mapModeRef.current = mapMode;
    if (!mapReady) return;

    applyMapMode(mapMode);
    if (mapMode === "regular") {
      renderRegularMarkers(points);
    }
  }, [applyMapMode, mapMode, mapReady, points, renderRegularMarkers]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchText.trim()) return;

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        searchText + ", New York, USA"
      )}&format=json&limit=1`
    );

    if (!response.ok) return;

    const results = (await response.json()) as Array<{ lat: string; lon: string }>;
    const first = results[0];
    if (!first) return;

    mapRef.current?.flyTo({
      center: [Number.parseFloat(first.lon), Number.parseFloat(first.lat)],
      zoom: 12.5,
      duration: 850,
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Environmental Remediation Sites</h1>
        <p className={styles.subtext}>
          Pulling points from /api/get/env-remediation-sites with regular, heatmap, and cluster views.
        </p>

        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            className={styles.searchInput}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search location in NY"
          />
          <button className={styles.searchButton} type="submit">
            Find
          </button>
        </form>

        <div className={styles.modeRow}>
          <button
            type="button"
            className={mapMode === "regular" ? styles.modeButtonActive : styles.modeButton}
            onClick={() => setMapMode("regular")}
          >
            Regular
          </button>
          <button
            type="button"
            className={mapMode === "heatmap" ? styles.modeButtonActive : styles.modeButton}
            onClick={() => setMapMode("heatmap")}
          >
            Heatmap
          </button>
          <button
            type="button"
            className={mapMode === "cluster" ? styles.modeButtonActive : styles.modeButton}
            onClick={() => setMapMode("cluster")}
          >
            Cluster
          </button>
        </div>

        <div className={styles.statusRow}>
          <span className={styles.badge}>Min zoom 10</span>
          <span className={styles.statusText}>{pointCountLabel}</span>
        </div>
      </header>

      <main className={styles.mapShell}>
        <div ref={mapContainerRef} className={styles.mapContainer} />
      </main>
    </div>
  );
}
