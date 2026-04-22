"use client";

import { Bell, BellOff, BellRing, Smartphone } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { cn } from "@/lib/utils/cn";

export function PushSubscribePanel() {
  const { permission, subscribed, subscribing, subscribe, unsubscribe } = usePushNotifications();

  if (permission === "unsupported") {
    return (
      <div className="flex items-start gap-3 p-4 bg-muted/20 rounded-xl border border-border">
        <BellOff className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Push notifications not supported</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your browser does not support Web Push. Use Chrome, Edge, or Firefox.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Smartphone className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Push Notifications</h3>
        <span className={cn(
          "ml-auto text-xs px-2 py-0.5 rounded-full font-medium",
          subscribed
            ? "bg-success/20 text-success"
            : permission === "denied"
              ? "bg-danger/20 text-danger"
              : "bg-muted text-muted-foreground"
        )}>
          {subscribed ? "Active" : permission === "denied" ? "Blocked" : "Inactive"}
        </span>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-sm text-muted-foreground">
          Receive real-time alerts on this device for fraud detections, shift reminders, and low stock warnings — even when the app is closed.
        </p>

        {permission === "denied" && (
          <div className="flex items-start gap-2 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5">
            <BellOff className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <p className="text-xs text-danger">
              Notifications are blocked. Open browser settings → Site permissions → Notifications → Allow for this site.
            </p>
          </div>
        )}

        {subscribed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-success">
              <BellRing className="w-4 h-4" />
              This device will receive push notifications
            </div>
            <button
              onClick={unsubscribe}
              disabled={subscribing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-60"
            >
              <BellOff className="w-4 h-4" />
              {subscribing ? "Unsubscribing…" : "Unsubscribe this device"}
            </button>
          </div>
        ) : (
          <button
            onClick={subscribe}
            disabled={subscribing || permission === "denied"}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            <Bell className="w-4 h-4" />
            {subscribing ? "Subscribing…" : "Enable push notifications"}
          </button>
        )}
      </div>
    </div>
  );
}
