import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

/** Approximate campus coordinates for Silverleaf network schools */
const SCHOOL_COORDS = {
  'sl-main': { lat: -3.3869, lng: 36.683, label: 'Silverleaf Academy (Arusha)' },
  'sl-usariver': { lat: -6.7924, lng: 39.2083, label: 'Usariver (Dar)' },
  'sl-arusha-modern': { lat: -3.4, lng: 36.69, label: 'Arusha Modern' },
  'sl-kijenge': { lat: -3.37, lng: 36.72, label: 'Kijenge' },
  'sl-ilboru': { lat: -3.35, lng: 36.7, label: 'Ilboru' },
  'sl-boma': { lat: -3.42, lng: 36.65, label: 'Boma' },
  'sl-mbegu': { lat: -3.41, lng: 36.75, label: 'Mbegu' },
  'sl-moshi': { lat: -3.35, lng: 37.34, label: 'Moshi' },
  'sl-dodoma': { lat: -6.17, lng: 35.74, label: 'Dodoma' },
  'sl-mwanza': { lat: -2.52, lng: 32.9, label: 'Mwanza' },
  'sl-zanzibar': { lat: -6.16, lng: 39.19, label: 'Zanzibar' },
  'sl-mbeya': { lat: -8.91, lng: 33.46, label: 'Mbeya' },
};

export default function CampusMap({ schoolId, height = 320 }) {
  const ref = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    let map;
    (async () => {
      const L = await import('leaflet');
      if (!ref.current || mapRef.current) return;

      const center = SCHOOL_COORDS[schoolId] || SCHOOL_COORDS['sl-main'];
      map = L.map(ref.current).setView([center.lat, center.lng], 11);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      Object.entries(SCHOOL_COORDS).forEach(([id, c]) => {
        const isActive = id === schoolId;
        L.circleMarker([c.lat, c.lng], {
          radius: isActive ? 10 : 6,
          color: isActive ? '#f59e0b' : '#002368',
          fillColor: isActive ? '#f59e0b' : '#002368',
          fillOpacity: 0.8,
        })
          .addTo(map)
          .bindPopup(c.label);
      });

      setTimeout(() => map.invalidateSize(), 100);
    })();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [schoolId]);

  return (
    <div
      ref={ref}
      style={{ height, borderRadius: 12, border: '1px solid #e5e7eb', zIndex: 0 }}
      className="campus-map"
    />
  );
}
