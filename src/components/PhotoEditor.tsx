"use client";

import { useEffect, useRef, useState } from "react";
import ReactCrop, { type PercentCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { exportCrop, renderRotated } from "@/lib/photo";

const FULL: PercentCrop = { unit: "%", x: 0, y: 0, width: 100, height: 100 };
// The selection shown by default is inset a few percent from the edges so
// every handle — including the top/bottom ones — starts clear of the image
// border and is easy to grab on a touchscreen. But if the rep never
// actually drags a handle, "Use photo" must still export the FULL photo,
// not this inset default — otherwise every untouched submission silently
// loses a sliver around the edges.
const DEFAULT_CROP: PercentCrop = { unit: "%", x: 3, y: 3, width: 94, height: 94 };

export function PhotoEditor({
  file,
  onDone,
  onCancel,
}: {
  file: File;
  onDone: (photo: File) => void;
  onCancel: () => void;
}) {
  const [turns, setTurns] = useState(0);
  const [rendered, setRendered] = useState<{ file: File; turns: number; url: string } | null>(null);
  const [crop, setCrop] = useState<PercentCrop>(DEFAULT_CROP);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let cancelled = false;
    let made: string | null = null;
    renderRotated(file, turns)
      .then((u) => {
        if (cancelled) return URL.revokeObjectURL(u);
        made = u;
        setRendered({ file, turns, url: u });
        setCrop(DEFAULT_CROP);
        setTouched(false);
      })
      .catch((err: Error) => setError(err.message));
    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [file, turns]);

  // Shows the spinner while a new rotation is being rendered.
  const url = rendered?.file === file && rendered.turns === turns ? rendered.url : null;

  async function usePhoto() {
    if (!imgRef.current) return;
    setBusy(true);
    setError(null);
    try {
      // Only export the inset selection once the rep has actually dragged a
      // handle — an untouched crop means "use the whole photo."
      onDone(await exportCrop(imgRef.current, touched ? crop : FULL));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const isDefault =
    crop.x === DEFAULT_CROP.x &&
    crop.y === DEFAULT_CROP.y &&
    crop.width === DEFAULT_CROP.width &&
    crop.height === DEFAULT_CROP.height;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <button type="button" onClick={onCancel} className="text-sm text-neutral-300 hover:text-white">
          Cancel
        </button>
        <span className="text-sm font-medium">Adjust photo</span>
        <button
          type="button"
          onClick={usePhoto}
          disabled={!url || busy}
          className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-neutral-900 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Use photo"}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
        {url ? (
          <ReactCrop
            crop={crop}
            onChange={(_, percent) => {
              setCrop(percent);
              setTouched(true);
            }}
            keepSelection
            ruleOfThirds
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={url}
              alt="Photo to crop"
              className="max-h-[calc(100dvh-11rem)] max-w-full object-contain"
            />
          </ReactCrop>
        ) : (
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        )}
      </div>

      {error && <p className="mx-4 mb-2 rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200">{error}</p>}

      <div className="flex items-center justify-center gap-2 px-4 pb-5 pt-2 text-sm">
        <button
          type="button"
          onClick={() => setTurns((t) => t - 1)}
          className="rounded-lg bg-white/10 px-3 py-2 hover:bg-white/20"
        >
          ⟲ Rotate left
        </button>
        <button
          type="button"
          onClick={() => setTurns((t) => t + 1)}
          className="rounded-lg bg-white/10 px-3 py-2 hover:bg-white/20"
        >
          ⟳ Rotate right
        </button>
        <button
          type="button"
          onClick={() => {
            setCrop(DEFAULT_CROP);
            setTouched(false);
          }}
          disabled={isDefault && !touched}
          className="rounded-lg bg-white/10 px-3 py-2 hover:bg-white/20 disabled:opacity-40"
        >
          Reset crop
        </button>
      </div>
      <p className="pb-4 text-center text-xs text-neutral-400">
        Drag the corners to crop to the shop front.
      </p>
    </div>
  );
}
