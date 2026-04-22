"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface CheckinResult {
  tokenNumber: number;
  patientName: string;
  vaccineType: string;
}

export function CheckinPanel() {
  const [ref, setRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const checkin = async (bookingRef: string) => {
    if (!bookingRef.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    const res = await fetch("/api/worker/queue/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingRef: bookingRef.trim() }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Check-in failed");
    } else {
      setResult(data);
      setRef("");
    }
  };

  const startScan = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setScanning(true);
    } catch {
      setError("Camera access denied");
    }
  };

  const stopScan = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    cancelAnimationFrame(rafRef.current);
    setScanning(false);
  };

  useEffect(() => {
    if (!scanning) return;

    let jsQR: ((data: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null = null;

    import("jsqr").then((mod) => {
      jsQR = mod.default;
      const tick = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR!(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          stopScan();
          checkin(code.data);
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(rafRef.current);
  }, [scanning]);

  useEffect(() => () => stopScan(), []);

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <ScanLine className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-foreground">Appointment Check-in</h2>
      </div>

      <div className="p-5 space-y-4">
        {/* Camera scanner */}
        {scanning ? (
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-primary rounded-lg opacity-70" />
            </div>
            <button
              onClick={stopScan}
              className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-lg"
            >
              <CameraOff className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={startScan}>
            <Camera className="w-4 h-4" />
            Scan QR Code
          </Button>
        )}

        {/* Manual entry */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter booking reference"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && checkin(ref)}
          />
          <Button onClick={() => checkin(ref)} loading={loading} disabled={!ref.trim()}>
            Check In
          </Button>
        </div>

        {error && (
          <p className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg">{error}</p>
        )}

        {result && (
          <div className="flex items-start gap-3 bg-accent/10 border border-accent/20 rounded-lg px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">
                Checked in — Token #{String(result.tokenNumber).padStart(3, "0")}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {result.patientName} · {result.vaccineType}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
