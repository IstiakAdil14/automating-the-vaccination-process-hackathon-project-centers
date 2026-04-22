"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface Props {
  onDetected: (text: string) => void;
  active: boolean;
}

export function QrScanner({ onDetected, active }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        tick();
      }
    } catch {
      setError("Camera access denied or unavailable");
    }
  };

  const tick = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code?.data) {
      onDetected(code.data);
      stop();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (!active) stop();
    return () => stop();
  }, [active]);

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "relative rounded-xl overflow-hidden bg-black aspect-video w-full max-w-sm mx-auto",
          !scanning && "flex items-center justify-center"
        )}
      >
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        {!scanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/60">
            <CameraOff className="w-10 h-10" />
            <span className="text-sm">Camera off</span>
          </div>
        )}
        {scanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Scan overlay */}
            <div className="absolute inset-8 border-2 border-primary rounded-lg opacity-70" />
            <div className="absolute top-8 left-8 w-5 h-5 border-t-2 border-l-2 border-primary rounded-tl" />
            <div className="absolute top-8 right-8 w-5 h-5 border-t-2 border-r-2 border-primary rounded-tr" />
            <div className="absolute bottom-8 left-8 w-5 h-5 border-b-2 border-l-2 border-primary rounded-bl" />
            <div className="absolute bottom-8 right-8 w-5 h-5 border-b-2 border-r-2 border-primary rounded-br" />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-danger text-center">{error}</p>}

      <div className="flex justify-center">
        {scanning ? (
          <Button variant="outline" size="sm" onClick={stop}>
            <CameraOff className="w-4 h-4" /> Stop Camera
          </Button>
        ) : (
          <Button size="sm" onClick={start}>
            <Camera className="w-4 h-4" /> Start Camera
          </Button>
        )}
      </div>
    </div>
  );
}
