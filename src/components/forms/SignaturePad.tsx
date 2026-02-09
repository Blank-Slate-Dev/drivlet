// src/components/forms/SignaturePad.tsx
"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Eraser, Check } from "lucide-react";

interface SignaturePadProps {
  /** Unique ID for this pad (e.g. "customer", "driver") */
  id: string;
  /** Label shown above the pad */
  label: string;
  /** Callback with base64 PNG data URI when signature changes */
  onChange: (dataUrl: string) => void;
  /** Current signature data (base64 PNG) */
  value?: string;
  /** Whether the pad is disabled */
  disabled?: boolean;
  /** Optional height override (default 160) */
  height?: number;
}

export default function SignaturePad({
  id,
  label,
  onChange,
  value,
  disabled = false,
  height = 160,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const hasDrawnRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  // ── Resize canvas to match container (retina-aware) ──────────────
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    // Preserve existing drawing
    const existingData = hasDrawnRef.current
      ? canvas.toDataURL("image/png")
      : null;

    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#1e293b"; // slate-800

    // Restore existing drawing
    if (existingData && hasDrawnRef.current) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, height);
      };
      img.src = existingData;
    }
  }, [height]);

  // ── Init and resize listener ─────────────────────────────────────
  useEffect(() => {
    resizeCanvas();
    const handler = () => resizeCanvas();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [resizeCanvas]);

  // ── Restore value from prop (e.g. when loading saved signature) ──
  useEffect(() => {
    if (!value || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
      ctx.drawImage(
        img,
        0,
        0,
        canvas.width / ratio,
        canvas.height / ratio
      );
      hasDrawnRef.current = true;
      setIsEmpty(false);
    };
    img.src = value;
  }, [value]);

  // ── Coordinate helpers ───────────────────────────────────────────
  const getCoords = (
    e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent
  ): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // ── Drawing handlers ─────────────────────────────────────────────
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    isDrawingRef.current = true;
    const point = getCoords(e);
    lastPointRef.current = point;

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    // Draw a dot for single taps
    ctx.lineTo(point.x + 0.1, point.y + 0.1);
    ctx.stroke();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || disabled) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !lastPointRef.current) return;

    const point = getCoords(e);

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    lastPointRef.current = point;
    hasDrawnRef.current = true;
    setIsEmpty(false);
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;

    // Emit signature data
    const canvas = canvasRef.current;
    if (canvas && hasDrawnRef.current) {
      try {
        onChange(canvas.toDataURL("image/png"));
      } catch {
        // Canvas tainted or unavailable
      }
    }
  };

  // ── Clear ────────────────────────────────────────────────────────
  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    hasDrawnRef.current = false;
    setIsEmpty(true);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {!isEmpty && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <Check className="h-3 w-3" />
            Signed
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-xl border-2 ${
          disabled
            ? "border-slate-200 bg-slate-100 opacity-60"
            : isEmpty
            ? "border-dashed border-slate-300 bg-white"
            : "border-emerald-400 bg-white"
        }`}
      >
        <canvas
          ref={canvasRef}
          id={`sig-${id}`}
          aria-label={`${label} signature pad`}
          className={`block w-full ${
            disabled ? "cursor-not-allowed" : "cursor-crosshair"
          }`}
          style={{ height: `${height}px`, touchAction: "none" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
        />

        {/* Signature line */}
        <div
          className="pointer-events-none absolute left-4 right-4 border-b border-slate-200"
          style={{ bottom: "30%" }}
        />

        {/* Placeholder text */}
        {isEmpty && !disabled && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-slate-400">Sign here</p>
          </div>
        )}
      </div>

      {/* Clear button */}
      {!disabled && !isEmpty && (
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <Eraser className="h-3.5 w-3.5" />
          Clear signature
        </button>
      )}
    </div>
  );
}
