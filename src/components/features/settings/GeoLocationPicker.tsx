"use client";

import { useState, useCallback, useEffect } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { MapPin, Save } from "lucide-react";

const MAP_CONTAINER = { width: "100%", height: "320px" };
const DEFAULT_CENTER = { lat: 23.8103, lng: 90.4125 }; // Dhaka

export function GeoLocationPicker() {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  });

  // Load current center location
  useEffect(() => {
    fetch("/api/worker/settings/center")
      .then((r) => r.json())
      .then((d) => {
        if (d.center?.geoLat && d.center?.geoLng) {
          setPos({ lat: d.center.geoLat, lng: d.center.geoLng });
        }
      });
  }, []);

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) setPos({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  }, []);

  async function save() {
    if (!pos) return;
    setSaving(true); setMsg("");
    const res = await fetch("/api/worker/settings/geolocation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pos),
    });
    setMsg(res.ok ? "Location saved" : "Save failed");
    setSaving(false);
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <MapPin className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Geo-Location</h2>
        <span className="text-xs text-muted-foreground ml-1">Click map to move pin</span>
      </div>
      <div className="p-5 space-y-4">
        {pos && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Lat: <span className="text-foreground font-mono">{pos.lat.toFixed(6)}</span></span>
            <span>Lng: <span className="text-foreground font-mono">{pos.lng.toFixed(6)}</span></span>
          </div>
        )}

        {!isLoaded ? (
          <div className="h-80 bg-muted/30 rounded-xl flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden border border-border">
            <GoogleMap
              mapContainerStyle={MAP_CONTAINER}
              center={pos ?? DEFAULT_CENTER}
              zoom={pos ? 15 : 12}
              onClick={onMapClick}
              options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
            >
              {pos && <Marker position={pos} />}
            </GoogleMap>
          </div>
        )}

        {msg && <p className={`text-xs ${msg.includes("fail") ? "text-danger" : "text-success"}`}>{msg}</p>}

        <button
          onClick={save}
          disabled={saving || !pos}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save Location"}
        </button>
      </div>
    </div>
  );
}
