import React, { useCallback, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PHNOM_PENH_CENTER, buildStandardDemoFloors } from '../data/parkingLots';
import type { MarkerColorVariant, ParkingLot } from '../types/parking';
import {
  AVAILABILITY_LABELS,
  FACILITY_TYPE_LABELS,
  VEHICLE_TYPE_LABELS,
  calculateDistanceKm,
  getCompactPriceDisplay,
  getMarkerColorVariant,
} from '../utils/parkingLogic';

interface SearchedPlaceResult {
  name: string;
  address: string;
  position: { lat: number; lng: number };
}

interface RouteSummary {
  distanceText: string;
  durationText: string;
  lotId: string;
}

interface LeafletPhnomPenhMapProps {
  lots: ParkingLot[];
  selectedLot: ParkingLot | null;
  focusLotTrigger: { lot: ParkingLot; seq: number } | null;
  mapType: 'roadmap' | 'hybrid';
  userPosition: { lat: number; lng: number } | null;
  searchedPlace: SearchedPlaceResult | null;
  routeTrigger: {
    lot: ParkingLot;
    origin: { lat: number; lng: number };
    seq: number;
  } | null;
  placeSearchTrigger: { query: string; seq: number } | null;
  osmDiscoverySeq: number;
  recenterSeq: number;
  onSelectLotFromMarker: (lotId: string) => void;
  onOpenDetails: (lotId: string) => void;
  onRequestDirections: (lot: ParkingLot) => void;
  onSearchedPlace: (place: SearchedPlaceResult | null, statusMsg: string | null) => void;
  onRouteComputed: (summary: RouteSummary | null, errorMsg: string | null) => void;
  onPlacesDiscovered: (places: ParkingLot[], msg: string) => void;
}

const VARIANT_HEX: Record<
  MarkerColorVariant,
  { bg: string; text: string; ring: string }
> = {
  blue: { bg: '#2563EB', text: '#FFFFFF', ring: 'rgba(37, 99, 235, 0.35)' },
  purple: { bg: '#9333EA', text: '#FFFFFF', ring: 'rgba(147, 51, 234, 0.35)' },
  green: { bg: '#059669', text: '#FFFFFF', ring: 'rgba(5, 150, 105, 0.35)' },
  orange: { bg: '#F97316', text: '#FFFFFF', ring: 'rgba(249, 115, 22, 0.35)' },
  red: { bg: '#DC2626', text: '#FFFFFF', ring: 'rgba(220, 38, 38, 0.35)' },
  cyan: { bg: '#06B6D4', text: '#083344', ring: 'rgba(6, 182, 212, 0.38)' },
};

function createMarkerIcon(lot: ParkingLot, isSelected: boolean): L.DivIcon {
  const variant = getMarkerColorVariant(lot);
  const colors = VARIANT_HEX[variant];

  const label =
    lot.facilityType === 'ev_station'
      ? lot.evCharging?.maxPowerKw
        ? `${lot.evCharging.maxPowerKw}kW`
        : 'EV'
      : lot.pricing.isFree && lot.pricePerHourKhr === 0
        ? 'Free'
        : lot.pricing.carHourly?.khr
          ? `${(lot.pricing.carHourly.khr / 1000).toFixed(
              lot.pricing.carHourly.khr % 1000 === 0 ? 0 : 1
            )}k`
          : lot.pricing.motorcycle?.khr
            ? `${(lot.pricing.motorcycle.khr / 1000).toFixed(0)}k`
            : 'P';

  const zapSvg =
    lot.facilityType === 'ev_station'
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
      : '';

  const scale = isSelected ? 'transform:scale(1.16);' : '';
  const ring = isSelected ? `box-shadow:0 0 0 4px ${colors.ring},0 8px 18px rgba(20,21,23,0.28);` : 'box-shadow:0 4px 12px rgba(20,21,23,0.22);';

  return L.divIcon({
    className: 'parkeasy-leaflet-marker',
    html: `<div style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:9999px;background:${colors.bg};color:${colors.text};font-family:'Plus Jakarta Sans',sans-serif;font-size:11.5px;font-weight:700;border:1.5px solid rgba(255,255,255,0.92);white-space:nowrap;cursor:pointer;${scale}${ring}">${zapSvg}<span>${label}</span></div>`,
    iconSize: [0, 0],
    iconAnchor: [24, 14],
    popupAnchor: [0, -14],
  });
}

function buildPopupElement(
  lot: ParkingLot,
  userPosition: { lat: number; lng: number } | null,
  onDirections: () => void,
  onViewDetails: () => void
): HTMLElement {
  const priceDisplay = getCompactPriceDisplay(lot);
  const distanceKm = userPosition
    ? calculateDistanceKm(userPosition, lot.position)
    : null;

  const root = document.createElement('div');
  root.style.fontFamily = "'Plus Jakarta Sans', sans-serif";
  root.style.minWidth = '230px';
  root.style.maxWidth = '270px';
  root.style.color = '#141517';

  const headerRow = document.createElement('div');
  headerRow.style.display = 'flex';
  headerRow.style.justifyContent = 'space-between';
  headerRow.style.alignItems = 'center';
  headerRow.style.gap = '6px';

  const typeSpan = document.createElement('span');
  typeSpan.textContent = FACILITY_TYPE_LABELS[lot.facilityType].toUpperCase();
  typeSpan.style.fontSize = '10px';
  typeSpan.style.fontWeight = '700';
  typeSpan.style.color = '#525760';

  const availSpan = document.createElement('span');
  availSpan.textContent =
    lot.availability.availableSpaces !== null
      ? `${AVAILABILITY_LABELS[lot.availability.status]} (${lot.availability.availableSpaces})`
      : AVAILABILITY_LABELS[lot.availability.status];
  availSpan.style.fontSize = '10px';
  availSpan.style.fontWeight = '600';
  availSpan.style.padding = '2px 8px';
  availSpan.style.borderRadius = '9999px';
  availSpan.style.background = '#F3F4F6';
  availSpan.style.color = '#4B5563';

  headerRow.append(typeSpan, availSpan);
  root.appendChild(headerRow);

  const title = document.createElement('div');
  title.textContent = lot.name;
  title.style.fontSize = '14px';
  title.style.fontWeight = '700';
  title.style.marginTop = '4px';
  title.style.lineHeight = '1.3';
  root.appendChild(title);

  const sub = document.createElement('div');
  sub.textContent = `${lot.district}, Phnom Penh`;
  sub.style.fontSize = '11.5px';
  sub.style.color = '#6B7280';
  sub.style.marginTop = '2px';
  root.appendChild(sub);

  const box = document.createElement('div');
  box.style.background = '#F6F7F8';
  box.style.borderRadius = '12px';
  box.style.padding = '8px 10px';
  box.style.marginTop = '8px';
  box.style.fontSize = '11.5px';
  box.style.display = 'flex';
  box.style.flexDirection = 'column';
  box.style.gap = '4px';

  const addInfoRow = (k: string, v: string, boldValue = false) => {
    const r = document.createElement('div');
    r.style.display = 'flex';
    r.style.justifyContent = 'space-between';
    r.style.gap = '8px';
    const kEl = document.createElement('span');
    kEl.textContent = k;
    kEl.style.color = '#6B7280';
    const vEl = document.createElement('span');
    vEl.textContent = v;
    vEl.style.fontWeight = boldValue ? '700' : '600';
    vEl.style.textAlign = 'right';
    r.append(kEl, vEl);
    box.appendChild(r);
  };

  addInfoRow(
    'Price',
    priceDisplay.secondaryUsd
      ? `${priceDisplay.primaryText} (${priceDisplay.secondaryUsd})`
      : priceDisplay.primaryText,
    true
  );
  if (distanceKm !== null) {
    addInfoRow('Distance', `${distanceKm.toFixed(1)} km away`);
  }
  addInfoRow(
    'Vehicles',
    lot.categories.map((c) => VEHICLE_TYPE_LABELS[c]).join(', ')
  );
  if (lot.rating !== null) {
    addInfoRow(
      'Rating',
      `${lot.rating.toFixed(1)}★${lot.reviewCount ? ` (${lot.reviewCount})` : ''}`
    );
  }

  root.appendChild(box);

  const btnRow = document.createElement('div');
  btnRow.style.display = 'grid';
  btnRow.style.gridTemplateColumns = '1fr 1fr';
  btnRow.style.gap = '8px';
  btnRow.style.marginTop = '8px';

  const dirBtn = document.createElement('button');
  dirBtn.type = 'button';
  dirBtn.textContent = 'Directions';
  dirBtn.style.padding = '6px 10px';
  dirBtn.style.borderRadius = '9999px';
  dirBtn.style.border = 'none';
  dirBtn.style.background = '#F4F5F6';
  dirBtn.style.color = '#141517';
  dirBtn.style.fontSize = '11.5px';
  dirBtn.style.fontWeight = '600';
  dirBtn.style.cursor = 'pointer';
  dirBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onDirections();
  });

  const detBtn = document.createElement('button');
  detBtn.type = 'button';
  detBtn.textContent = 'View Details';
  detBtn.style.padding = '6px 10px';
  detBtn.style.borderRadius = '9999px';
  detBtn.style.border = 'none';
  detBtn.style.background = '#C5EC45';
  detBtn.style.color = '#141517';
  detBtn.style.fontSize = '11.5px';
  detBtn.style.fontWeight = '700';
  detBtn.style.cursor = 'pointer';
  detBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onViewDetails();
  });

  btnRow.append(dirBtn, detBtn);
  root.appendChild(btnRow);

  return root;
}

export const LeafletPhnomPenhMap: React.FC<LeafletPhnomPenhMapProps> = ({
  lots,
  selectedLot,
  focusLotTrigger,
  mapType,
  userPosition,
  searchedPlace,
  routeTrigger,
  placeSearchTrigger,
  osmDiscoverySeq,
  recenterSeq,
  onSelectLotFromMarker,
  onOpenDetails,
  onRequestDirections,
  onSearchedPlace,
  onRouteComputed,
  onPlacesDiscovered,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markerByIdRef = useRef<Record<string, L.Marker>>({});
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  const clearRoute = useCallback(() => {
    if (routePolylineRef.current && mapRef.current) {
      mapRef.current.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }
  }, []);

  // Initialize Leaflet map centered on Phnom Penh
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [PHNOM_PENH_CENTER.lat, PHNOM_PENH_CENTER.lng],
      zoom: 13,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const osmLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }
    ).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    tileLayerRef.current = osmLayer;
    markersLayerRef.current = markersLayer;

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Switch between OSM Road and Esri World Imagery Satellite tiles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const url =
      mapType === 'hybrid'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attribution =
      mapType === 'hybrid'
        ? 'Tiles &copy; Esri'
        : '&copy; OpenStreetMap contributors';

    tileLayerRef.current = L.tileLayer(url, {
      attribution,
      maxZoom: 19,
    }).addTo(map);
  }, [mapType]);

  // Render & synchronize color-coded markers
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;

    layer.clearLayers();
    markerByIdRef.current = {};

    for (const lot of lots) {
      const isSelected = lot.id === selectedLot?.id;
      const marker = L.marker([lot.position.lat, lot.position.lng], {
        icon: createMarkerIcon(lot, isSelected),
        zIndexOffset: isSelected ? 1000 : 0,
      });

      marker.bindPopup(
        () =>
          buildPopupElement(
            lot,
            userPosition,
            () => onRequestDirections(lot),
            () => onOpenDetails(lot.id)
          ),
        { maxWidth: 290, offset: [0, -6] }
      );

      marker.on('click', () => {
        onSelectLotFromMarker(lot.id);
      });

      marker.addTo(layer);
      markerByIdRef.current[lot.id] = marker;
    }
  }, [
    lots,
    selectedLot?.id,
    userPosition,
    onSelectLotFromMarker,
    onRequestDirections,
    onOpenDetails,
  ]);

  // Focus map and open popup when selecting from left list
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusLotTrigger) return;
    const { lot } = focusLotTrigger;
    const targetZoom = Math.max(map.getZoom(), 15);
    map.flyTo([lot.position.lat, lot.position.lng], targetZoom, {
      duration: 0.45,
    });
    const marker = markerByIdRef.current[lot.id];
    if (marker) {
      marker.openPopup();
    }
  }, [focusLotTrigger]);

  // Render user location blue dot
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    if (userPosition) {
      userMarkerRef.current = L.circleMarker(
        [userPosition.lat, userPosition.lng],
        {
          radius: 8,
          color: '#FFFFFF',
          weight: 3,
          fillColor: '#2563EB',
          fillOpacity: 1,
        }
      )
        .bindTooltip('Your current location')
        .addTo(map);
    }
  }, [userPosition]);

  // Render searched place marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (searchMarkerRef.current) {
      map.removeLayer(searchMarkerRef.current);
      searchMarkerRef.current = null;
    }

    if (searchedPlace) {
      const icon = L.divIcon({
        className: 'parkeasy-search-pin',
        html: `<div style="padding:5px 11px;border-radius:9999px;background:#141517;color:#FFFFFF;font-family:'Plus Jakarta Sans',sans-serif;font-size:11.5px;font-weight:600;box-shadow:0 6px 16px rgba(0,0,0,0.28);white-space:nowrap;">📍 ${searchedPlace.name.replace(/</g, '&lt;')}</div>`,
        iconSize: [0, 0],
        iconAnchor: [24, 14],
      });
      searchMarkerRef.current = L.marker(
        [searchedPlace.position.lat, searchedPlace.position.lng],
        { icon }
      ).addTo(map);
    }
  }, [searchedPlace]);

  // Recenter to user or Phnom Penh center
  useEffect(() => {
    const map = mapRef.current;
    if (!map || recenterSeq === 0) return;
    clearRoute();
    onRouteComputed(null, null);
    const target = userPosition ?? PHNOM_PENH_CENTER;
    map.flyTo([target.lat, target.lng], userPosition ? 15 : 13, {
      duration: 0.45,
    });
  }, [recenterSeq, userPosition, clearRoute, onRouteComputed]);

  // Nominatim free Phnom Penh location search (no API key or credit card needed)
  useEffect(() => {
    if (!placeSearchTrigger || !mapRef.current) return;
    const query = placeSearchTrigger.query.trim();
    if (!query) return;

    let cancelled = false;
    (async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          `${query}, Phnom Penh`
        )}&viewbox=104.78,11.72,105.02,11.42&bounded=1&countrycodes=kh&limit=1`;
        const res = await fetch(url, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error('Nominatim unavailable');
        const data = (await res.json()) as Array<{
          display_name: string;
          lat: string;
          lon: string;
        }>;
        if (cancelled) return;
        const first = data[0];
        if (!first) {
          onSearchedPlace(
            null,
            `No OpenStreetMap location found in Phnom Penh for "${query}".`
          );
          return;
        }
        const pos = { lat: Number(first.lat), lng: Number(first.lon) };
        mapRef.current?.flyTo([pos.lat, pos.lng], 15, { duration: 0.5 });
        onSearchedPlace(
          {
            name: query,
            address: first.display_name,
            position: pos,
          },
          null
        );
      } catch {
        if (cancelled) return;
        onSearchedPlace(
          null,
          'OpenStreetMap search temporarily unavailable; filtering local directory.'
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [placeSearchTrigger, onSearchedPlace]);

  // Overpass API free live discovery of OSM parking & EV stations in Phnom Penh
  useEffect(() => {
    if (osmDiscoverySeq === 0 || !mapRef.current) return;

    let cancelled = false;
    (async () => {
      try {
        const center = mapRef.current!.getCenter();
        const query = `[out:json][timeout:12];(node["amenity"="parking"](around:3500,${center.lat},${center.lng});way["amenity"="parking"](around:3500,${center.lat},${center.lng});node["amenity"="charging_station"](around:5000,${center.lat},${center.lng}););out center 25;`;
        const res = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: `data=${encodeURIComponent(query)}`,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        if (!res.ok) throw new Error('Overpass failed');
        const json = (await res.json()) as {
          elements?: Array<{
            id: number;
            type: string;
            lat?: number;
            lon?: number;
            center?: { lat: number; lon: number };
            tags?: Record<string, string>;
          }>;
        };

        if (cancelled) return;

        const mapped: ParkingLot[] = [];
        for (const el of json.elements ?? []) {
          const lat = el.lat ?? el.center?.lat;
          const lng = el.lon ?? el.center?.lon;
          if (lat === undefined || lng === undefined) continue;
          const tags = el.tags ?? {};
          const isEv = tags.amenity === 'charging_station';
          const name =
            tags.name ||
            tags['name:en'] ||
            (isEv ? 'OSM EV Charging Station' : 'OSM Parking Facility');
          const isFree = tags.fee === 'no';

          mapped.push({
            id: `osm-${el.type}-${el.id}`,
            name,
            tagline: isEv
              ? 'Community-mapped EV charging station on OpenStreetMap.'
              : 'Community-mapped parking area on OpenStreetMap.',
            address:
              tags['addr:street'] ||
              tags['addr:full'] ||
              'Phnom Penh, Cambodia (OpenStreetMap)',
            district: tags['addr:suburb'] || 'Phnom Penh',
            facilityType: isEv
              ? 'ev_station'
              : tags.parking === 'street_side'
                ? 'street'
                : 'public',
            openHours: tags.opening_hours || 'Hours unverified on OSM',
            pricePerHourKhr: isFree ? 0 : null,
            pricePerHour: isFree ? 0 : 2000,
            pricing: {
              verificationStatus: isFree ? 'confirmed' : 'unavailable',
              sourceLabel: 'OpenStreetMap Tagging',
              isFree,
              freeRule: isFree ? 'Marked fee=no on OpenStreetMap' : undefined,
              carHourly: isFree ? { khr: 0, usd: 0, unit: 'hour' } : { khr: null, unit: 'hour' },
            },
            availability: {
              status: 'unknown',
              source: 'unverified',
              availableSpaces: null,
              totalSpaces: tags.capacity ? Number(tags.capacity) || null : null,
              note: 'Live availability not tracked on OpenStreetMap',
            },
            evCharging: isEv
              ? {
                  provider: tags.operator || null,
                  connectorTypes: ['Check on site'],
                  maxPowerKw: null,
                  speedTier: 'unknown',
                  pricePerKwhKhr: null,
                  priceStatus: 'unavailable',
                  operatingHours: tags.opening_hours || 'Unverified',
                  portCount: tags.capacity ? Number(tags.capacity) || null : null,
                  liveStatus: 'unknown',
                }
              : undefined,
            categories: isEv ? ['ev', 'car'] : ['car', 'motorcycle'],
            images: ['/src/assets/images/central_plaza_garage_1795607312182.jpg'],
            description:
              'Discovered live from OpenStreetMap Overpass API in Phnom Penh.',
            facilities: ['OpenStreetMap Verified Location'],
            distanceKm: null,
            rating: null,
            reviewCount: null,
            dataSource: 'osm_overpass',
            priceConfidence: isFree ? 'medium' : 'unknown',
            locationConfidence: 'high',
            sourceUrls: ['https://www.openstreetmap.org/'],
            lastVerifiedDate: new Date().toISOString().slice(0, 10),
            coordinates: { x: 50, y: 50 },
            position: { lat, lng },
            floors: buildStandardDemoFloors(isEv),
          });
        }

        onPlacesDiscovered(
          mapped,
          mapped.length > 0
            ? `Discovered ${mapped.length} OpenStreetMap locations in this area.`
            : 'No additional OpenStreetMap parking tags found here.'
        );
      } catch {
        if (cancelled) return;
        onPlacesDiscovered(
          [],
          'OpenStreetMap scan timed out. Showing verified Phnom Penh dataset.'
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [osmDiscoverySeq, onPlacesDiscovered]);

  // OSRM free driving directions (no API key or credit card needed)
  useEffect(() => {
    if (!routeTrigger || !mapRef.current) return;

    let cancelled = false;
    (async () => {
      clearRoute();
      try {
        const { origin, lot } = routeTrigger;
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${lot.position.lng},${lot.position.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('OSRM failed');
        const data = (await res.json()) as {
          routes?: Array<{
            distance: number;
            duration: number;
            geometry: { coordinates: Array<[number, number]> };
          }>;
        };
        if (cancelled) return;
        const route = data.routes?.[0];
        if (!route) {
          onRouteComputed(null, 'No driving route found to this location.');
          return;
        }

        const latLngs: L.LatLngExpression[] = route.geometry.coordinates.map(
          ([lng, lat]) => [lat, lng]
        );
        const poly = L.polyline(latLngs, {
          color: '#141517',
          weight: 5,
          opacity: 0.9,
        }).addTo(mapRef.current!);
        routePolylineRef.current = poly;
        mapRef.current!.fitBounds(poly.getBounds(), { padding: [50, 50] });

        onRouteComputed(
          {
            distanceText: `${(route.distance / 1000).toFixed(1)} km`,
            durationText: `${Math.max(1, Math.round(route.duration / 60))} min`,
            lotId: lot.id,
          },
          null
        );
      } catch {
        if (cancelled) return;
        onRouteComputed(
          null,
          'Unable to calculate OSRM driving route right now.'
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [routeTrigger, clearRoute, onRouteComputed]);

  return <div ref={containerRef} className="w-full h-full z-0" />;
};
