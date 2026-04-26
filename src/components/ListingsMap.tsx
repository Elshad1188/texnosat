import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import { getCityCenter, AZ_DEFAULT_CENTER, AZ_DEFAULT_ZOOM } from "@/lib/azCityCentroids";

// Fix default marker icons (Leaflet expects assets at specific paths)
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export type MapListing = {
  id: string;
  title: string;
  price: number | string;
  currency: string;
  location: string | null;
  latitude?: number | null;
  longitude?: number | null;
  image_urls?: string[] | null;
};

type Bounds = { north: number; south: number; east: number; west: number };

function BoundsTracker({ onChange }: { onChange: (b: Bounds) => void }) {
  const map = useMap();
  useEffect(() => {
    const emit = () => {
      const b = map.getBounds();
      onChange({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    };
    emit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onChange({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    },
  });
  return null;
}

export function getListingCoords(l: { latitude?: number | null; longitude?: number | null; location?: string | null }): [number, number] | null {
  if (l.latitude != null && l.longitude != null) return [Number(l.latitude), Number(l.longitude)];
  return getCityCenter(l.location);
}

interface Props {
  listings: MapListing[];
  height?: string;
  onBoundsChange?: (b: Bounds) => void;
}

const ListingsMap = ({ listings, height = "500px", onBoundsChange }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Slightly jitter coordinates for listings sharing the same city centroid so markers don't fully overlap
  const points = useMemo(() => {
    const cityBuckets: Record<string, number> = {};
    return listings
      .map((l) => {
        const coords = getListingCoords(l);
        if (!coords) return null;
        let [lat, lng] = coords;
        // If using city centroid (no precise coords), spread markers in a small ring
        if (l.latitude == null || l.longitude == null) {
          const key = `${lat.toFixed(3)}_${lng.toFixed(3)}`;
          const idx = (cityBuckets[key] = (cityBuckets[key] || 0) + 1) - 1;
          const r = 0.005 * (1 + Math.floor(idx / 8));
          const angle = (idx % 8) * (Math.PI / 4);
          lat += Math.cos(angle) * r;
          lng += Math.sin(angle) * r;
        }
        return { ...l, _lat: lat, _lng: lng } as MapListing & { _lat: number; _lng: number };
      })
      .filter(Boolean) as Array<MapListing & { _lat: number; _lng: number }>;
  }, [listings]);

  // Auto-fit bounds when listings change significantly (initial load)
  return (
    <div ref={containerRef} className="overflow-hidden rounded-xl border border-border" style={{ height }}>
      <MapContainer
        center={AZ_DEFAULT_CENTER}
        zoom={AZ_DEFAULT_ZOOM}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onBoundsChange && <BoundsTracker onChange={onBoundsChange} />}
        {points.map((p) => (
          <Marker key={p.id} position={[p._lat, p._lng]}>
            <Popup>
              <Link to={`/product/${p.id}`} className="block w-44 no-underline">
                {p.image_urls && p.image_urls[0] && (
                  <img src={p.image_urls[0]} alt={p.title} className="mb-2 h-24 w-full rounded object-cover" />
                )}
                <p className="line-clamp-2 text-sm font-semibold text-foreground">{p.title}</p>
                <p className="mt-1 text-sm font-bold text-primary">{Number(p.price).toLocaleString()} {p.currency}</p>
                {p.location && <p className="mt-0.5 text-xs text-muted-foreground">{p.location}</p>}
              </Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default ListingsMap;
