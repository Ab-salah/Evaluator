"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { BackLink } from "@/components/BackLink";
import { compressImage } from "@/lib/compress-image";

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      res.status === 413
        ? "The photo is too large to upload."
        : `The server returned an unexpected response (${res.status}). Please try again.`,
    );
  }
}

export function SubmitForm({ knownBrands }: { knownBrands: string[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [shopName, setShopName] = useState("");
  const [nameTypedByUser, setNameTypedByUser] = useState(false);
  const [nameStatus, setNameStatus] = useState<"idle" | "reading" | "found" | "not-found">("idle");
  const photoVersion = useRef(0);

  function captureLocation() {
    if (!("geolocation" in navigator)) {
      setError("This browser does not support location capture.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setError(`Could not get location: ${err.message}`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const version = ++photoVersion.current;
    setError(null);
    setPhoto(null);
    setPreview(null);
    if (!file) return;

    setPreparing(true);
    let compressed: File;
    try {
      compressed = await compressImage(file);
    } catch (err) {
      setError((err as Error).message);
      setPreparing(false);
      return;
    }
    if (version !== photoVersion.current) return;
    setPhoto(compressed);
    setPreview(URL.createObjectURL(compressed));
    setPreparing(false);

    if (nameTypedByUser) return;
    setNameStatus("reading");
    const body = new FormData();
    body.set("image", compressed);
    try {
      const res = await fetch("/api/shop-name", { method: "POST", body });
      const data = await readJson(res);
      if (version !== photoVersion.current) return;
      if (res.ok && data.shopName) {
        setShopName(data.shopName);
        setNameStatus("found");
      } else {
        setNameStatus("not-found");
      }
    } catch {
      if (version === photoVersion.current) setNameStatus("not-found");
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!photo) {
      setError("Add a photo of the shop front before submitting.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("image", photo);
    if (coords) {
      formData.set("latitude", String(coords.lat));
      formData.set("longitude", String(coords.lng));
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", { method: "POST", body: formData });
      const data = await readJson(res);
      if (res.status >= 400) {
        throw new Error(data.error ?? "Submission failed");
      }
      router.push(`/submissions/${data.submission.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <BackLink href="/">Back to rankings</BackLink>
      <h1 className="mb-1 text-xl font-semibold">New visibility submission</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Take a clear photo of the shop front. It will be scored automatically against the
        visibility matrix.
      </p>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium">Shop photo</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onImageChange}
            className="block w-full rounded-md border border-neutral-300 bg-white text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-900 file:px-3 file:py-2 file:text-white"
          />
          {preparing && <p className="mt-2 text-xs text-neutral-500">Preparing photo…</p>}
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Preview" className="mt-3 h-48 w-full rounded-md object-cover" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">Brand being audited</label>
            <input
              name="brand"
              required
              list="known-brands"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="e.g. Zain"
            />
            <datalist id="known-brands">
              {knownBrands.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-neutral-500">
              Reseller shops carry several brands at once — the score is measured for this
              brand, and rival brands in the same photo are captured separately.
            </p>
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">Shop name</label>
            <input
              name="shopName"
              required
              value={shopName}
              onChange={(e) => {
                setShopName(e.target.value);
                setNameTypedByUser(e.target.value.trim() !== "");
                setNameStatus("idle");
              }}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder={nameStatus === "reading" ? "Reading the shop's sign…" : "e.g. Al Noor Mobiles"}
            />
            {nameStatus === "reading" && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
                Reading the shop name from the photo…
              </p>
            )}
            {nameStatus === "found" && (
              <p className="mt-1 text-xs text-emerald-700">
                Read from the shop&apos;s sign — edit it if it&apos;s wrong.
              </p>
            )}
            {nameStatus === "not-found" && (
              <p className="mt-1 text-xs text-amber-700">
                Couldn&apos;t read a name from the sign — please type it in.
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Shop code (optional)</label>
            <input
              name="shopCode"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="RSL-0042"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">City</label>
            <input
              name="city"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Region</label>
            <input
              name="region"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Location note</label>
            <input
              name="locationLabel"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Main St, near mall"
            />
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={captureLocation}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-100"
          >
            {locating ? "Locating…" : coords ? "Location captured ✓" : "Capture GPS location"}
          </button>
          {coords && (
            <span className="ml-2 font-mono text-xs text-neutral-500">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-neutral-200 pt-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Your name</label>
            <input
              name="submitterName"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Your email</label>
            <input
              name="submitterEmail"
              type="email"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || preparing}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          {submitting && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          {submitting ? "Scoring photo…" : "Submit for scoring"}
        </button>
        {submitting && (
          <p className="text-center text-xs text-neutral-400">
            Analyzing the photo against the visibility matrix — this can take a few seconds.
          </p>
        )}
      </form>
    </div>
  );
}
