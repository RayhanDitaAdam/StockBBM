'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SPBU {
  id: string;
  name: string;
  brand: 'Pertamina' | 'Shell' | 'BP' | 'Vivo';
  address: string;
  lat: number;
  lng: number;
  distanceKm: number | null;
  activeReport: {
    id: string;
    queueStatus: 'red' | 'yellow' | 'green';
    emptyBbm: string[];
    photoUrl: string;
    qrisUrl: string;
    createdAt: string;
    confirmsCount: number;
    deviceFingerprint: string;
  } | null;
}

interface MapComponentProps {
  spbus: SPBU[];
  center: [number, number]; // [lat, lng] of simulated user location
  onSelectSpbu?: (id: string) => void;
  selectedSpbuId?: string | null;
  height?: string;
  zoom?: number;
}

export default function MapComponent({
  spbus,
  center,
  onSelectSpbu,
  selectedSpbuId,
  height = '400px',
  zoom = 13
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Helper to map report status to color
  const getMarkerColor = (spbu: SPBU) => {
    if (!spbu.activeReport) return '#6b7280'; // gray (neutral)
    const status = spbu.activeReport.queueStatus;
    if (status === 'green') return '#10b981'; // green
    if (status === 'yellow') return '#f59e0b'; // yellow
    if (status === 'red') return '#ef4444'; // red
    return '#6b7280';
  };

  // Helper to create custom div-based gas pump icons
  const createCustomIcon = (spbu: SPBU, isSelected: boolean) => {
    const color = getMarkerColor(spbu);
    const size = isSelected ? 38 : 30;
    const border = isSelected ? 3 : 2;
    const shadow = isSelected ? '0 0 10px rgba(0, 216, 255, 0.6)' : '0 2px 4px rgba(0,0,0,0.3)';

    const html = `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: ${border}px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        box-shadow: ${shadow};
        transition: all 0.2s ease-in-out;
      ">
        <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="${isSelected ? 18 : 14}" width="${isSelected ? 18 : 14}" xmlns="http://www.w3.org/2000/svg">
          <path d="M304 48H128c-26.51 0-48 21.49-48 48v368c0 26.51 21.49 48 48 48h176c26.51 0 48-21.49 48-48V96c0-26.51-21.49-48-48-48zm-88 384c-17.67 0-32-14.33-32-32s14.33-32 32-32 32 14.33 32 32-14.33 32-32 32zm80-120H112V96h184v216z"></path>
        </svg>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-leaflet-marker',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  };

  // Helper to create pulsing user location icon with a visible street view person landmark
  const createUserIcon = () => {
    const html = `
      <div style="position: relative; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center;">
        <!-- Pulsing outer ring -->
        <div style="
          background-color: rgba(59, 130, 246, 0.4); 
          width: 54px; 
          height: 54px; 
          border-radius: 50%; 
          position: absolute; 
          animation: map-pulse 1.8s infinite ease-in-out;
          z-index: 1;
        "></div>
        <!-- Solid background circle -->
        <div style="
          background-color: #3b82f6; 
          width: 36px; 
          height: 36px; 
          border-radius: 50%; 
          border: 3px solid white; 
          box-shadow: 0 3px 8px rgba(0,0,0,0.5); 
          position: absolute; 
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <!-- Big 👤 Emoji inside as a distinct person landmark -->
          <span style="font-size: 20px; line-height: 1; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2));">👤</span>
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'user-leaflet-marker',
      iconSize: [60, 60],
      iconAnchor: [30, 30]
    });
  };

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Leaflet map instance
    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: true,
      scrollWheelZoom: true,
      minZoom: 3,
      maxZoom: 18
    });

    // Load OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    mapRef.current = map;

    // Clean up on unmount
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Handle Center changes (simulated GPS transitions)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Pan/Zoom to new center smoothly
    map.setView(center, zoom, { animate: true, duration: 1.0 });

    // Update user marker position
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(center);
    } else {
      const userMarker = L.marker(center, {
        icon: createUserIcon(),
        zIndexOffset: 1000 // Always render above SPBU markers
      }).addTo(map);
      userMarker.bindTooltip("<b>My Location</b>", { permanent: true, direction: 'top' });
      userMarkerRef.current = userMarker;
    }
  }, [center, zoom]);

  // 3. Render and Update SPBU markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Draw new markers
    spbus.forEach((spbu) => {
      const isSelected = spbu.id === selectedSpbuId;
      const marker = L.marker([spbu.lat, spbu.lng], {
        icon: createCustomIcon(spbu, isSelected)
      }).addTo(map);

      // Trigger selection on click
      if (onSelectSpbu) {
        marker.on('click', () => {
          onSelectSpbu(spbu.id);
        });
      }

      markersRef.current.push(marker);
    });
  }, [spbus, selectedSpbuId]);

  return (
    <div style={{ position: 'relative', width: '100%', height: height }}>
      {/* Container Element */}
      <div 
        ref={mapContainerRef} 
        style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--joy-palette-divider)' }} 
      />

      {/* Embedded keyframe animation for GPS pulse */}
      <style jsx global>{`
        @keyframes map-pulse {
          0% {
            transform: scale(0.6);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
