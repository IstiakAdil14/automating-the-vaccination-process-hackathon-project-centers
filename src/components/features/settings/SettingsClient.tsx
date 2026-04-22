"use client";

import { useState } from "react";
import { Settings, Building2, MapPin, Syringe, Clock, Bell } from "lucide-react";
import { CenterInfoEditor } from "./CenterInfoEditor";
import { GeoLocationPicker } from "./GeoLocationPicker";
import { VaccineTypesConfig } from "./VaccineTypesConfig";
import { OperatingHoursEditor } from "./OperatingHoursEditor";
import { NotificationPreferences } from "./NotificationPreferences";
import { PushSubscribePanel } from "./PushSubscribePanel";
import { cn } from "@/lib/utils/cn";

type Tab = "info" | "geo" | "vaccines" | "hours" | "notifications";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "info",          label: "Center Info",    icon: Building2 },
  { id: "geo",           label: "Location",       icon: MapPin },
  { id: "vaccines",      label: "Vaccines",       icon: Syringe },
  { id: "hours",         label: "Hours",          icon: Clock },
  { id: "notifications", label: "Notifications",  icon: Bell },
];

export function SettingsClient() {
  const [tab, setTab] = useState<Tab>("info");
  const [photoUrl, setPhotoUrl] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Center Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage center profile, location, vaccines, hours, and notification preferences
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border gap-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 py-2.5 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
              tab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "info"          && <CenterInfoEditor onPhotoChange={setPhotoUrl} />}
      {tab === "geo"           && <GeoLocationPicker />}
      {tab === "vaccines"      && <VaccineTypesConfig />}
      {tab === "hours"         && <OperatingHoursEditor />}
      {tab === "notifications" && (
        <div className="space-y-6">
          <NotificationPreferences />
          <PushSubscribePanel />
        </div>
      )}

      {/* Show updated photo preview if just uploaded */}
      {tab === "info" && photoUrl && (
        <p className="text-xs text-success">Photo updated — visible to citizens on the map listing</p>
      )}
    </div>
  );
}
