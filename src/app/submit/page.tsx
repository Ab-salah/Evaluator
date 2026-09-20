"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SubmitPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

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

  function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return setPreview(null);
    setPreview(URL.createObjectURL(file));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    if (coords) {
      formData.set("latitude", String(coords.lat));
      formData.set("longitude", String(coords.lng));
    }

    if (!(formData.get("image") as File)?.size) {
      setError("Add a photo of the shop front before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", { method: "POST", body: formData });
      const data = await res.json();
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
            name="image"
            accept="image/*"
            capture="environment"
            required
            onChange={onImageChange}
            className="block w-full rounded-md border border-neutral-300 bg-white text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-900 file:px-3 file:py-2 file:text-white"
          />
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Preview" className="mt-3 h-48 w-full rounded-md object-cover" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">Shop name</label>
            <input
              name="shopName"
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="e.g. Al Noor Mobiles"
            />
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {submitting ? "Scoring photo…" : "Submit for scoring"}
        </button>
      </form>
    </div>
  );
}
