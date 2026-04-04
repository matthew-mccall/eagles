'use client';

import { RMap, RSource, RLayer, RNavigationControl } from 'maplibre-react-components';
import 'maplibre-gl/dist/maplibre-gl.css';
import { readingsToGeoJSON } from '../data/mock-readings';
import type { GasReading } from '../data/mock-readings';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import { useCallback, useMemo, useState } from 'react';

export type MapViewMode = 'clusters' | 'heatmap' | 'tracking';

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

// Hudson Valley center
const INITIAL_CENTER: [number, number] = [-73.97, 41.7];
const INITIAL_ZOOM = 9;

export default function HazardMap({ mode, readings = [] }: { mode: MapViewMode; readings?: GasReading[] }) {
  const [popup, setPopup] = useState<{ lng: number; lat: number; html: string } | null>(null);

  const geojson = useMemo(() => readingsToGeoJSON(readings), [readings]);

  const handleClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) { setPopup(null); return; }

    const props = feature.properties;
    const coords = (feature.geometry as GeoJSON.Point).coordinates;

    if (props?.cluster) {
      setPopup({
        lng: coords[0], lat: coords[1],
        html: `<strong>Cluster</strong><br/>${props.point_count} readings`,
      });
    } else {
      setPopup({
        lng: coords[0], lat: coords[1],
        html: `<strong>${props?.gasType}</strong><br/>${props?.ppm} ppm<br/>Severity: ${props?.severity}<br/>${new Date(props?.timestamp as string).toLocaleTimeString()}`,
      });
    }
  }, []);

  return (
    <div className="relative w-full h-full">
      <RMap
        mapStyle={OPENFREEMAP_STYLE}
        initialCenter={INITIAL_CENTER}
        initialZoom={INITIAL_ZOOM}
        style={{ width: '100%', height: '100%' }}
        onClick={() => setPopup(null)}
      >
        <RNavigationControl position="top-right" />

        {/* ========== CLUSTER MODE ========== */}
        {mode === 'clusters' && (
          <>
            <RSource
              id="readings-cluster"
              type="geojson"
              data={geojson}
              cluster={true}
              clusterMaxZoom={14}
              clusterRadius={50}
            />
            {/* Cluster circles */}
            <RLayer
              id="cluster-circles"
              type="circle"
              source="readings-cluster"
              filter={['has', 'point_count']}
              paint={{
                'circle-color': [
                  'step', ['get', 'point_count'],
                  '#22c55e', 5,
                  '#f59e0b', 10,
                  '#ef4444',
                ],
                'circle-radius': [
                  'step', ['get', 'point_count'],
                  20, 5, 30, 10, 40,
                ],
                'circle-opacity': 0.8,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff',
              }}
              onClick={handleClick}
            />
            {/* Cluster count labels */}
            <RLayer
              id="cluster-count"
              type="symbol"
              source="readings-cluster"
              filter={['has', 'point_count']}
              layout={{
                'text-field': ['get', 'point_count_abbreviated'],
                'text-size': 14,
              }}
              paint={{ 'text-color': '#fff' }}
            />
            {/* Individual points */}
            <RLayer
              id="unclustered-point"
              type="circle"
              source="readings-cluster"
              filter={['!', ['has', 'point_count']]}
              paint={{
                'circle-color': [
                  'match', ['get', 'severity'],
                  'high', '#ef4444',
                  'medium', '#f59e0b',
                  'low', '#22c55e',
                  '#6b7280',
                ],
                'circle-radius': 8,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff',
              }}
              onClick={handleClick}
            />
          </>
        )}

        {/* ========== HEATMAP MODE ========== */}
        {mode === 'heatmap' && (
          <>
            <RSource id="readings-heat" type="geojson" data={geojson} />
            <RLayer
              id="heatmap-layer"
              type="heatmap"
              source="readings-heat"
              paint={{
                'heatmap-weight': [
                  'interpolate', ['linear'], ['get', 'ppm'],
                  0, 0,
                  400, 1,
                ],
                'heatmap-intensity': [
                  'interpolate', ['linear'], ['zoom'],
                  0, 1, 15, 3,
                ],
                'heatmap-color': [
                  'interpolate', ['linear'], ['heatmap-density'],
                  0, 'rgba(0,0,0,0)',
                  0.2, '#22c55e',
                  0.4, '#84cc16',
                  0.6, '#f59e0b',
                  0.8, '#f97316',
                  1, '#ef4444',
                ],
                'heatmap-radius': [
                  'interpolate', ['linear'], ['zoom'],
                  0, 15, 15, 30,
                ],
                'heatmap-opacity': 0.8,
              }}
            />
          </>
        )}

        {/* ========== LIVE TRACKING MODE ========== */}
        {mode === 'tracking' && (
          <>
            <RSource id="readings-tracking" type="geojson" data={geojson} />
            {/* Outer glow ring */}
            <RLayer
              id="tracking-glow"
              type="circle"
              source="readings-tracking"
              paint={{
                'circle-color': [
                  'match', ['get', 'severity'],
                  'high', '#ef4444',
                  'medium', '#f59e0b',
                  'low', '#22c55e',
                  '#6b7280',
                ],
                'circle-radius': 14,
                'circle-opacity': 0.25,
              }}
            />
            {/* Core dot */}
            <RLayer
              id="tracking-dots"
              type="circle"
              source="readings-tracking"
              paint={{
                'circle-color': [
                  'match', ['get', 'severity'],
                  'high', '#ef4444',
                  'medium', '#f59e0b',
                  'low', '#22c55e',
                  '#6b7280',
                ],
                'circle-radius': 6,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff',
              }}
              onClick={handleClick}
            />
            {/* Gas type labels */}
            <RLayer
              id="tracking-labels"
              type="symbol"
              source="readings-tracking"
              layout={{
                'text-field': ['concat', ['get', 'gasType'], ' ', ['get', 'ppm'], 'ppm'],
                'text-size': 11,
                'text-offset': [0, 1.5],
                'text-anchor': 'top',
              }}
              paint={{
                'text-color': '#1f2937',
                'text-halo-color': '#fff',
                'text-halo-width': 1,
              }}
            />
          </>
        )}
      </RMap>

      {/* Floating popup */}
      {popup && (
        <div
          className="absolute z-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg shadow-lg px-3 py-2 text-sm pointer-events-none border border-gray-200 dark:border-gray-700"
          style={{ left: '50%', bottom: 16, transform: 'translateX(-50%)' }}
          dangerouslySetInnerHTML={{ __html: popup.html }}
        />
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded-lg shadow px-3 py-2 text-xs space-y-1 border border-gray-200 dark:border-gray-700">
        <div className="font-semibold text-gray-700 dark:text-gray-300">Severity</div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500" /> High
        </div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <span className="inline-block w-3 h-3 rounded-full bg-amber-500" /> Medium
        </div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <span className="inline-block w-3 h-3 rounded-full bg-green-500" /> Low
        </div>
      </div>
    </div>
  );
}
