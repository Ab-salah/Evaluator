"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { BackLink } from "@/components/BackLink";
import { PhotoEditor } from "@/components/PhotoEditor";
import { readJson } from "@/lib/read-json";

export function SubmitForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  // The photo as picked, kept so it can be re-cropped from the original.
  const [original, setOriginal] = useState<File | null>(null);
  const [editing, setEditing] = useState(false);
  const [shopName, setShopName] = useState("");
  const [nameTypedByUser, setNameTypedByUser] = useState(false);
  const [nameStatus, setNameStatus] = useState<"idle" | "reading" | "found" | "not-found" | "error">(
    "idle",
  );
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

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setOriginal(file);
    setEditing(true);
  }

  async function onEdited(edited: File) {
    const version = ++photoVersion.current;
    setEditing(false);
    setPhoto(edited);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(edited));

    if (nameTypedByUser) return;
    setNameStatus("reading");
    const body = new FormData();
    body.set("image", edited);
    try {
      const res = await fetch("/api/shop-name", { method: "POST", body });
      const data = await readJson(res);
      if (version !== photoVersion.current) return;
      if (!res.ok) {
        setNameStatus("error");
      } else if (data.shopName) {
        setShopName(data.shopName);
        setNameStatus("found");
      } else {
        setNameStatus("not-found");
      }
    } catch {
      if (version === photoVersion.current) setNameStatus("error");
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
      <BackLink href="/">Back to dashboard</BackLink>
      <h1 className="mb-1 text-xl font-semibold">New visibility submission</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Take a clear photo of the shop front. Every operator&apos;s branding in it — Zain, stc,
        Batelco or any other — is found and scored separately against the visibility matrix.
      </p>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <span className="mb-1 block text-sm font-medium">Shop photo</span>
          {preview ? (
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Shop photo"
                className="max-h-[28rem] w-full bg-neutral-100 object-contain"
              />
              <div className="flex divide-x divide-neutral-200 border-t border-neutral-200 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex-1 py-2.5 hover:bg-neutral-50"
                >
                  Edit / crop
                </button>
                <label className="flex-1 cursor-pointer py-2.5 text-center hover:bg-neutral-50">
                  Replace
                  <input type="file" accept="image/*" onChange={onPick} className="hidden" />
                </label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-neutral-300 bg-white px-3 py-6 text-center hover:border-neutral-400 hover:bg-neutral-50">
                <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
                <span className="text-sm font-medium">Take photo</span>
                <span className="text-xs text-neutral-500">Use the camera</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={onPick}
                  className="hidden"
                />
              </label>
              <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-neutral-300 bg-white px-3 py-6 text-center hover:border-neutral-400 hover:bg-neutral-50">
                <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m0 0L7 9m5-5 5 5" /><path d="M4 15v4h16v-4" /></svg>
                <span className="text-sm font-medium">Upload photo</span>
                <span className="text-xs text-neutral-500">From gallery or files</span>
                <input type="file" accept="image/*" onChange={onPick} className="hidden" />
              </label>
            </div>
          )}
          {editing && original && (
            <PhotoEditor file={original} onDone={onEdited} onCancel={() => setEditing(false)} />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
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
            {nameStatus === "error" && (
              <p className="mt-1 text-xs text-red-700">
                Automatic reading failed (AI service error) — please type the shop name in. This
                usually means scoring will fail too until it&apos;s fixed.
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
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
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
