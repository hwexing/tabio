"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Spot = {
  id: string;
  sort_order: number;
  start_time: string;
  name: string;
  category: string;
  memo: string;
  lat: number;
  lng: number;
  move_to_next: string;
};

type Props = {
  spots: Spot[];
  selectedSpotId: string | null;
  onPinClick: (spotId: string) => void;
};

function createNumberedIcon(num: number, isSelected: boolean) {
  const bg = isSelected ? "#7B61FF" : "#A66BFF";
  const size = isSelected ? 36 : 30;
  const fontSize = isSelected ? 14 : 12;
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:${size}px;height:${size}px;
        background:linear-gradient(135deg,#FF6FB5,${bg});
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:2px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,0.25);
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="
          transform:rotate(45deg);
          color:white;font-weight:bold;font-size:${fontSize}px;
          line-height:1;display:block;
        ">${num}</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

export default function MapView({ spots, selectedSpotId, onPinClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // 地図の初期化
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // スポットが変わったらマーカーを再描画 & fitBounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 既存マーカーを全削除
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    if (spots.length === 0) return;

    const bounds = L.latLngBounds([]);

    spots.forEach((spot, i) => {
      const isSelected = spot.id === selectedSpotId;
      const icon = createNumberedIcon(i + 1, isSelected);
      const marker = L.marker([spot.lat, spot.lng], { icon })
        .addTo(map)
        .on("click", () => onPinClick(spot.id));

      markersRef.current.set(spot.id, marker);
      bounds.extend([spot.lat, spot.lng]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots]);

  // 選択が変わったらアイコンを更新 & 中心移動
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    spots.forEach((spot, i) => {
      const marker = markersRef.current.get(spot.id);
      if (!marker) return;
      const isSelected = spot.id === selectedSpotId;
      marker.setIcon(createNumberedIcon(i + 1, isSelected));
    });

    if (selectedSpotId) {
      const spot = spots.find((s) => s.id === selectedSpotId);
      if (spot) {
        map.panTo([spot.lat, spot.lng], { animate: true });
      }
    }
  }, [selectedSpotId, spots]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
