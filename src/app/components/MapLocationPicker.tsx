import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";

interface Props {
  latitude?: number;
  longitude?: number;
  onChange: (lat: number, lng: number) => void;
}

// Default center: Sousse, Tunisia
const DEFAULT_LAT = 35.8256;
const DEFAULT_LNG = 10.6084;
const DEFAULT_ZOOM = 13;

export default function MapLocationPicker({ latitude, longitude, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let L: typeof import("leaflet");

    async function init() {
      L = await import("leaflet");

      // Fix default icon paths broken by bundlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const lat = typeof latitude === "number" ? latitude : DEFAULT_LAT;
      const lng = typeof longitude === "number" ? longitude : DEFAULT_LNG;

      const map = L.map(containerRef.current!, { zoomControl: true }).setView([lat, lng], DEFAULT_ZOOM);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Place initial marker only if coords are provided
      if (typeof latitude === "number" && typeof longitude === "number") {
        markerRef.current = L.marker([latitude, longitude], { draggable: true }).addTo(map);
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current!.getLatLng();
          onChange(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)));
        });
      }

      map.on("click", (e) => {
        const lat = parseFloat(e.latlng.lat.toFixed(6));
        const lng = parseFloat(e.latlng.lng.toFixed(6));

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
          markerRef.current.on("dragend", () => {
            const pos = markerRef.current!.getLatLng();
            onChange(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)));
          });
        }

        onChange(lat, lng);
      });
    }

    init();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker when lat/lng props change externally (e.g. after search)
  useEffect(() => {
    if (!mapRef.current || typeof latitude !== "number" || typeof longitude !== "number") return;

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      import("leaflet").then((L) => {
        if (!mapRef.current) return;
        markerRef.current = L.marker([latitude!, longitude!], { draggable: true }).addTo(mapRef.current);
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current!.getLatLng();
          onChange(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)));
        });
      });
    }

    mapRef.current.setView([latitude, longitude], mapRef.current.getZoom());
  }, [latitude, longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    setSearchError("");

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search)}&format=json&limit=1`,
        { headers: { "Accept-Language": "fr" } },
      );
      const data = await res.json();
      if (!data.length) {
        setSearchError("Aucun résultat trouvé.");
        return;
      }
      const lat = parseFloat(parseFloat(data[0].lat).toFixed(6));
      const lng = parseFloat(parseFloat(data[0].lon).toFixed(6));
      onChange(lat, lng);
    } catch {
      setSearchError("Erreur de recherche, réessayez.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une adresse..."
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={searching}
          className="rounded-xl bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
        >
          {searching ? "..." : "Rechercher"}
        </button>
      </form>

      {searchError && <p className="text-xs text-rose-600">{searchError}</p>}

      <p className="text-xs text-slate-500">Cliquez sur la carte pour placer le marqueur, ou faites-le glisser après placement.</p>

      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      <div ref={containerRef} className="h-60 w-full overflow-hidden rounded-xl border border-slate-200" />

      {typeof latitude === "number" && typeof longitude === "number" && (
        <p className="text-xs text-slate-500">
          Position sélectionnée : <span className="font-mono font-semibold">{latitude}, {longitude}</span>
        </p>
      )}
    </div>
  );
}
