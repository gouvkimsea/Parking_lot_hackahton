import React, { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  APILoadingStatus,
  APIProvider,
  AdvancedMarker,
  Map as GoogleMap,
  useApiLoadingStatus,
  useMap,
} from '@vis.gl/react-google-maps';
import { Crosshair, Loader2, MapPin } from 'lucide-react';
import { PHNOM_PENH_CENTER } from '../data/parkingLots';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || '';

interface LocationPickerMapProps {
  position: { lat: number; lng: number };
  onChangePosition: (
    pos: { lat: number; lng: number },
    resolved?: { address?: string; districtHint?: string }
  ) => void;
}

const DISTRICT_KEYWORDS: Array<{ match: string[]; district: string }> = [
  { match: ['bkk 1', 'bkk1', 'boeung keng kang 1', 'បឹងកេងកងទី ១', 'បឹងកេងកងទី១'], district: 'BKK1' },
  { match: ['bkk 2', 'bkk2', 'boeung keng kang 2', 'បឹងកេងកងទី ២', 'បឹងកេងកងទី២'], district: 'BKK2' },
  { match: ['bkk 3', 'bkk3', 'boeung keng kang 3', 'បឹងកេងកងទី ៣', 'បឹងកេងកងទី៣'], district: 'BKK3' },
  { match: ['daun penh', 'doun penh', 'ដូនពេញ'], district: 'Daun Penh' },
  { match: ['chamkar mon', 'chamkarmon', 'ចំការមន'], district: 'Chamkar Mon' },
  { match: ['toul kork', 'tuol kork', 'ទួលគោក'], district: 'Toul Kork' },
  { match: ['sen sok', 'សែនសុខ'], district: 'Sen Sok' },
  { match: ['chroy changvar', 'ជ្រោយចង្វារ'], district: 'Chroy Changvar' },
  { match: ['russey keo', 'ឫស្សីកែវ'], district: 'Russey Keo' },
  { match: ['mean chey', 'មានជ័យ'], district: 'Mean Chey' },
  { match: ['7 makara', 'prampi makara', 'ប្រាំពីរមករា'], district: '7 Makara' },
  { match: ['chbar ampov', 'ច្បារអំពៅ'], district: 'Chbar Ampov' },
  { match: ['por sen chey', 'pou senchey', 'ពោធិ៍សែនជ័យ'], district: 'Por Sen Chey' },
  { match: ['dangkao', 'dangkor', 'ដង្កោ'], district: 'Dangkao' },
  { match: ['prek pnov', 'preaek pnov', 'ព្រែកព្នៅ'], district: 'Prek Pnov' },
  { match: ['kamboul', 'kambol', 'កំបូល'], district: 'Kamboul' },
];

function detectDistrictHint(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const item of DISTRICT_KEYWORDS) {
    if (item.match.some((k) => lower.includes(k))) {
      return item.district;
    }
  }
  return undefined;
}

async function reverseLookupAddress(
  lat: number,
  lng: number
): Promise<{ address?: string; districtHint?: string }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (!res.ok) return {};
    const data = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const road = data.address?.road || data.address?.neighbourhood || '';
    const suburb = data.address?.suburb || data.address?.village || '';
    const cityDistrict = data.address?.town || data.address?.city_district || '';
    const composed = [road, suburb, cityDistrict, 'Phnom Penh']
      .filter(Boolean)
      .join(', ');
    const fullText = `${data.display_name ?? ''} ${composed}`;
    return {
      address: composed || data.display_name,
      districtHint: detectDistrictHint(fullText),
    };
  } catch {
    return {};
  }
}

const GooglePickerInner: React.FC<{
  position: { lat: number; lng: number };
  onPick: (lat: number, lng: number) => void;
  onFallback: () => void;
}> = ({ position, onPick, onFallback }) => {
  const map = useMap();
  const status = useApiLoadingStatus();

  useEffect(() => {
    if (
      status === APILoadingStatus.FAILED ||
      status === APILoadingStatus.AUTH_FAILURE
    ) {
      onFallback();
    }
  }, [status, onFallback]);

  useEffect(() => {
    if (!map) return;
    map.panTo(position);
  }, [map, position]);

  if (
    status === APILoadingStatus.FAILED ||
    status === APILoadingStatus.AUTH_FAILURE
  ) {
    return null;
  }

  return (
    <GoogleMap
      mapId="DEMO_MAP_ID"
      defaultCenter={position}
      defaultZoom={14}
      gestureHandling="greedy"
      streetViewControl={false}
      mapTypeControl={false}
      fullscreenControl={false}
      style={{ width: '100%', height: '100%' }}
      onClick={(e) => {
        const latLng = e.detail?.latLng;
        if (latLng) {
          onPick(latLng.lat, latLng.lng);
        }
      }}
    >
      <AdvancedMarker
        position={position}
        draggable
        onDragEnd={(e) => {
          const latLng = e.latLng;
          if (latLng) {
            onPick(latLng.lat(), latLng.lng());
          }
        }}
      >
        <div className="w-8 h-8 rounded-full bg-[#141517] border-2 border-[#C5EC45] shadow-lg flex items-center justify-center">
          <MapPin className="w-4 h-4 text-[#C5EC45]" />
        </div>
      </AdvancedMarker>
    </GoogleMap>
  );
};

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  position,
  onChangePosition,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [useOsm, setUseOsm] = useState(!MAPS_API_KEY);
  const [locating, setLocating] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);

  const handlePickCoordinates = useCallback(
    async (lat: number, lng: number) => {
      const rounded = {
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
      };
      onChangePosition(rounded);
      setResolvingAddress(true);
      const resolved = await reverseLookupAddress(rounded.lat, rounded.lng);
      setResolvingAddress(false);
      if (resolved.address || resolved.districtHint) {
        onChangePosition(rounded, resolved);
      }
    },
    [onChangePosition]
  );

  // Initialize Leaflet interactive picker when using OpenStreetMap
  useEffect(() => {
    if (!useOsm || !containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [position.lat, position.lng],
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const pinIcon = L.divIcon({
      className: 'parkeasy-picker-pin',
      html: `<div style="width:30px;height:30px;border-radius:9999px;background:#141517;border:3px solid #C5EC45;box-shadow:0 6px 18px rgba(0,0,0,0.32);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:9999px;background:#C5EC45;"></div></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    const marker = L.marker([position.lat, position.lng], {
      draggable: true,
      icon: pinIcon,
    }).addTo(map);

    marker.on('dragend', () => {
      const next = marker.getLatLng();
      void handlePickCoordinates(next.lat, next.lng);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      void handlePickCoordinates(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    const timer = window.setTimeout(() => map.invalidateSize(), 180);

    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [useOsm]);

  // Sync external position updates into Leaflet marker
  useEffect(() => {
    if (!useOsm || !mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([position.lat, position.lng]);
    mapRef.current.panTo([position.lat, position.lng]);
  }, [position, useOsm]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // Clamp to Phnom Penh metro if simulator/IP is far outside Cambodia
        const inPhnomPenh =
          lat >= 11.3 && lat <= 11.75 && lng >= 104.7 && lng <= 105.1;
        void handlePickCoordinates(
          inPhnomPenh ? lat : PHNOM_PENH_CENTER.lat,
          inPhnomPenh ? lng : PHNOM_PENH_CENTER.lng
        );
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[12px] text-[#525760]">
          Click anywhere on the map or drag the pin to place the parking entrance.
        </p>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locating}
          className="min-h-[36px] px-3 py-1 rounded-full bg-[#F4F5F6] hover:bg-[#E7E9EC] text-[#141517] text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-60"
        >
          {locating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Crosshair className="w-3.5 h-3.5" />
          )}
          <span>Use Current Location</span>
        </button>
      </div>

      <div className="relative h-[220px] sm:h-[250px] w-full rounded-2xl overflow-hidden border border-black/10 bg-[#EEF2EB]">
        {!useOsm && MAPS_API_KEY ? (
          <APIProvider apiKey={MAPS_API_KEY} region="KH" language="en">
            <GooglePickerInner
              position={position}
              onPick={(lat, lng) => {
                void handlePickCoordinates(lat, lng);
              }}
              onFallback={() => setUseOsm(true)}
            />
          </APIProvider>
        ) : (
          <div ref={containerRef} className="w-full h-full" />
        )}

        <div className="absolute bottom-2.5 left-2.5 z-[400] px-2.5 py-1 rounded-full bg-white/95 shadow-sm border border-black/10 text-[11px] font-mono text-[#141517] flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-[#4D6A0A]" />
          <span>
            {position.lat.toFixed(5)}°N, {position.lng.toFixed(5)}°E
          </span>
          {resolvingAddress && (
            <Loader2 className="w-3 h-3 animate-spin text-[#767B84]" />
          )}
        </div>
      </div>
    </div>
  );
};
