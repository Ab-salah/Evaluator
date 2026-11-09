"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PhotoEditor } from "@/components/PhotoEditor";
import { btn, Card, Icon, input, label, Notice, Spinner } from "@/components/ui";
import { readJson } from "@/lib/read-json";

type NameStatus = "idle" | "reading" | "found" | "not-found" | "error";
type Geo = { state: "idle" | "locating" | "ok" | "denied"; lat?: number; lng?: number; accuracy?: number };

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <Card className="animate-rise p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-extrabold ${
            done ? "bg-emerald-500 text-white" : "bg-brand-700 text-white"
          }`}
        >
          {done ? <Icon name="check-circle" className="h-4 w-4" /> : n}
        </span>
        <h2 className="text-lg font-extrabold text-brand-950">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

export function SubmitForm({ aiOn, knownShops }: { aiOn: boolean; knownShops: string[] }) {
  const router = useRouter();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [original, setOriginal] = useState<File | null>(null); // kept so it can be re-cropped
  const [editing, setEditing] = useState(false);

  const [shopName, setShopName] = useState("");
  const [nameTyped, setNameTyped] = useState(false);
  const [nameStatus, setNameStatus] = useState<NameStatus>("idle");
  const [nameError, setNameError] = useState<string | null>(null);
  const photoVersion = useRef(0);

  const [geo, setGeo] = useState<Geo>({ state: "idle" });
  const [moreOpen, setMoreOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function captureLocation() {
    if (!("geolocation" in navigator)) return setGeo({ state: "denied" });
    setGeo({ state: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ state: "ok", lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => setGeo({ state: "denied" }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setOriginal(file);
    setEditing(true);
    // Location is captured quietly while the rep is at the shop.
    if (geo.state === "idle") captureLocation();
  }

  async function readName(image: File) {
    const version = ++photoVersion.current;
    setNameStatus("reading");
    setNameError(null);
    const body = new FormData();
    body.set("image", image);
    try {
      const res = await fetch("/api/shop-name", { method: "POST", body });
      const data = await readJson(res);
      if (version !== photoVersion.current) return;
      if (!res.ok) {
        setNameStatus("error");
        setNameError(data.error ?? `Request failed (${res.status})`);
      } else if (data.shopName) {
        setShopName(data.shopName);
        setNameStatus("found");
      } else {
        setNameStatus(data.aiDisabled ? "idle" : "not-found");
      }
    } catch (err) {
      if (version === photoVersion.current) {
        setNameStatus("error");
        setNameError((err as Error).message);
      }
    }
  }

  function onEdited(edited: File) {
    setEditing(false);
    setPhoto(edited);
    setPreview(URL.createObjectURL(edited));
    if (aiOn && !nameTyped) void readName(edited);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!photo) return setError("Add a photo of the shop front first.");
    if (!aiOn && !shopName.trim()) return setError("Enter the shop's name.");

    const form = new FormData(e.currentTarget);
    form.set("image", photo);
    form.set("shopName", shopName.trim());
    if (geo.state === "ok") {
      form.set("latitude", String(geo.lat));
      form.set("longitude", String(geo.lng));
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", { method: "POST", body: form });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error ?? `Submission failed (${res.status})`);
      router.push(`/submissions/${data.submission.id}?new=1`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  const nameHint: Record<NameStatus, React.ReactNode> = {
    idle: aiOn ? "Leave blank and it will be read from the sign." : null,
    reading: (
      <span className="inline-flex items-center gap-1.5 text-brand-700">
        <Spinner className="h-3 w-3" /> Reading the name from the sign…
      </span>
    ),
    found: (
      <span className="inline-flex items-center gap-1.5 text-emerald-700">
        <Icon name="sparkles" className="h-3.5 w-3.5" /> Read from the sign — edit it if it&apos;s wrong.
      </span>
    ),
    "not-found": <span className="text-amber-700">No name is legible on the sign — type it in, or leave it for the admin.</span>,
    error: null,
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Step n={1} title="Shop photo" done={!!photo}>
        {preview ? (
          <div className="overflow-hidden rounded-2xl border border-neutral-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Shop front" className="max-h-[26rem] w-full bg-neutral-100 object-contain" />
            <div className="grid grid-cols-2 divide-x divide-neutral-200 border-t border-neutral-200">
              <button type="button" onClick={() => setEditing(true)} className="flex items-center justify-center gap-2 py-3 text-sm font-bold text-brand-800 hover:bg-brand-50">
                <Icon name="crop" className="h-4 w-4" /> Crop / rotate
              </button>
              <label className="flex cursor-pointer items-center justify-center gap-2 py-3 text-sm font-bold text-brand-800 hover:bg-brand-50">
                <Icon name="refresh" className="h-4 w-4" /> Retake
                <input type="file" accept="image/*" onChange={onPick} className="hidden" />
              </label>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="group flex cursor-pointer flex-col items-center gap-2 rounded-2xl bg-midnight px-4 py-8 text-center text-white shadow-lg shadow-brand-900/20 transition active:scale-[0.98]">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                <Icon name="camera" className="h-7 w-7" />
              </span>
              <span className="text-base font-extrabold">Take photo</span>
              <span className="text-xs text-white/70">Opens the camera</span>
              <input type="file" accept="image/*" capture="environment" onChange={onPick} className="hidden" />
            </label>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 px-4 py-8 text-center transition hover:border-brand-500 hover:bg-brand-50 active:scale-[0.98]">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm">
                <Icon name="upload" className="h-7 w-7" />
              </span>
              <span className="text-base font-extrabold text-brand-950">Upload photo</span>
              <span className="text-xs text-neutral-500">From gallery or files</span>
              <input type="file" accept="image/*" onChange={onPick} className="hidden" />
            </label>
          </div>
        )}
        {!photo && (
          <ul className="mt-4 grid gap-1.5 text-xs text-neutral-500 sm:grid-cols-3">
            <li className="flex items-center gap-1.5"><Icon name="check-circle" className="h-3.5 w-3.5 text-zain-teal" /> Whole storefront in frame</li>
            <li className="flex items-center gap-1.5"><Icon name="check-circle" className="h-3.5 w-3.5 text-zain-teal" /> Sign readable</li>
            <li className="flex items-center gap-1.5"><Icon name="check-circle" className="h-3.5 w-3.5 text-zain-teal" /> Daylight, no glare</li>
          </ul>
        )}
        {editing && original && <PhotoEditor file={original} onDone={onEdited} onCancel={() => setEditing(false)} />}
      </Step>

      <Step n={2} title="Shop details" done={!!shopName.trim()}>
        <div className="space-y-4">
          <div>
            <label htmlFor="shopName" className={label}>
              Shop name {aiOn && <span className="font-normal text-neutral-400">(optional)</span>}
            </label>
            <div className="relative">
              <input
                id="shopName"
                value={shopName}
                list="known-shops"
                autoComplete="off"
                onChange={(e) => {
                  setShopName(e.target.value);
                  setNameTyped(e.target.value.trim() !== "");
                  if (nameStatus !== "reading") setNameStatus("idle");
                }}
                className={`${input} ${nameStatus === "reading" ? "pr-10" : ""}`}
                placeholder={nameStatus === "reading" ? "Reading the sign…" : "e.g. Inventor Electronics"}
              />
              {nameStatus === "reading" && <Spinner className="absolute right-3.5 top-3.5 h-4 w-4 text-brand-700" />}
            </div>
            <datalist id="known-shops">
              {knownShops.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            {nameStatus === "error" ? (
              <div className="mt-2">
                <Notice
                  tone="warn"
                  title="Couldn't read the name automatically"
                  action={
                    photo && (
                      <button type="button" onClick={() => readName(photo)} className={btn.ghost}>
                        <Icon name="refresh" className="h-4 w-4" /> Retry
                      </button>
                    )
                  }
                >
                  {nameError} You can type it, or submit anyway — scoring reads the sign again.
                </Notice>
              </div>
            ) : (
              nameHint[nameStatus] && <p className="mt-1.5 text-xs text-neutral-500">{nameHint[nameStatus]}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                geo.state === "ok"
                  ? "bg-emerald-50 text-emerald-800"
                  : geo.state === "denied"
                    ? "bg-neutral-100 text-neutral-600"
                    : "bg-brand-50 text-brand-800"
              }`}
            >
              {geo.state === "locating" ? <Spinner className="h-3 w-3" /> : <Icon name="map-pin" className="h-3.5 w-3.5" />}
              {geo.state === "ok"
                ? `Location captured (±${Math.round(geo.accuracy ?? 0)} m)`
                : geo.state === "locating"
                  ? "Getting location…"
                  : geo.state === "denied"
                    ? "Location unavailable"
                    : "Location not captured"}
            </span>
            {(geo.state === "idle" || geo.state === "denied") && (
              <button type="button" onClick={captureLocation} className={btn.ghost}>
                Capture GPS
              </button>
            )}
          </div>

          <div className="rounded-xl border border-neutral-200">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              className="flex w-full items-center justify-between px-3.5 py-3 text-sm font-bold text-brand-900"
            >
              More details <span className="font-normal text-neutral-400">shop code, city, region, note</span>
              <Icon name="chevron-right" className={`h-4 w-4 transition ${moreOpen ? "rotate-90" : ""}`} />
            </button>
            <div className={`grid grid-cols-2 gap-3 border-t border-neutral-100 p-3.5 ${moreOpen ? "" : "hidden"}`}>
              <div>
                <label className={label} htmlFor="shopCode">Shop code</label>
                <input id="shopCode" name="shopCode" className={input} placeholder="RSL-0042" />
              </div>
              <div>
                <label className={label} htmlFor="city">City / area</label>
                <input id="city" name="city" className={input} placeholder="Manama" />
              </div>
              <div>
                <label className={label} htmlFor="region">Region</label>
                <input id="region" name="region" className={input} placeholder="Capital" />
              </div>
              <div>
                <label className={label} htmlFor="locationLabel">Location note</label>
                <input id="locationLabel" name="locationLabel" className={input} placeholder="Near the mall" />
              </div>
            </div>
          </div>
        </div>
      </Step>

      {error && <Notice tone="error">{error}</Notice>}

      <div className="sticky bottom-24 z-10 lg:static">
        <button type="submit" disabled={submitting || !photo} className={`${btn.primary} w-full py-3.5 text-base shadow-lg`}>
          {submitting ? <Spinner /> : <Icon name="sparkles" className="h-5 w-5" />}
          {submitting ? "Uploading…" : aiOn ? "Submit for scoring" : "Submit audit"}
        </button>
      </div>
      <p className="text-center text-xs text-neutral-400">
        {aiOn
          ? "Scoring runs in the background — you can start the next audit straight away."
          : "AI scoring is off on this server, so an admin will score this photo."}
      </p>
    </form>
  );
}
