// Sample data for demo mode (DEMO_MODE=true): accounts, shops with an audit
// history, and "try it" photos. The shop-front illustrations in public/demo/
// are drawn from this same data by scripts/generate-demo-photos.mjs, so
// every photo shows exactly what its scores say.
//
// This file must stay free of runtime imports: the photo script loads it
// directly with Node.

export type Operator = "Zain" | "stc" | "Batelco";
export const OPERATORS: Operator[] = ["Zain", "stc", "Batelco"];

/** Matrix element counts, without signage (that comes from who owns the fascia). */
export type Counts = {
  full_stickers?: number;
  generic_posters?: number;
  stripes?: number;
  approved_reseller?: number;
  push_pull?: number;
};

export type DemoLook = {
  /** Operator that owns the fascia sign (scores Signage), or null for the shop's own sign. */
  fascia: Operator | null;
  brands: Partial<Record<Operator, Counts>>;
  confidence: "low" | "medium" | "high";
  appeal: number;
  standard: number;
};

export type DemoAudit = DemoLook & {
  daysAgo: number;
  by: DemoUserKey;
  status: "REVIEWED" | "SCORED";
  /** What the AI counted differently, to show an admin correction on a confirmed audit. */
  aiCounted?: Partial<Record<Operator, Counts>>;
  note?: string;
};

export type DemoShop = {
  slug: string;
  name: string;
  arabic: string;
  code: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  landmark: string;
  audits: DemoAudit[];
};

export type DemoSample = DemoLook & { slug: string; name: string; arabic: string };

export type DemoUserKey = "noor" | "ali" | "fatima" | "hussain";
export const DEMO_PASSWORD = "demo1234";
export const DEMO_USERS: Record<DemoUserKey, { email: string; name: string; role: "ADMIN" | "USER"; title: string }> = {
  noor: { email: "admin@demo.local", name: "Noor Hassan", role: "ADMIN", title: "Channel manager (admin)" },
  ali: { email: "rep@demo.local", name: "Ali Ahmed", role: "USER", title: "Field rep" },
  fatima: { email: "fatima@demo.local", name: "Fatima Yusuf", role: "USER", title: "Field rep" },
  hussain: { email: "hussain@demo.local", name: "Hussain Abbas", role: "USER", title: "Field rep" },
};

export const DEMO_SHOPS: DemoShop[] = [
  {
    slug: "al-noor-mobile",
    name: "Al Noor Mobile",
    arabic: "النور للهواتف",
    code: "RSL-1001",
    city: "Manama",
    region: "Capital",
    lat: 26.2361,
    lng: 50.5765,
    landmark: "Near Bab Al Bahrain",
    audits: [
      {
        daysAgo: 45, by: "ali", status: "REVIEWED", confidence: "high", fascia: null, appeal: 6, standard: 6,
        brands: { Zain: { full_stickers: 1, generic_posters: 2, approved_reseller: 1 }, stc: { full_stickers: 1, generic_posters: 1 }, Batelco: { generic_posters: 1 } },
      },
      {
        daysAgo: 8, by: "ali", status: "REVIEWED", confidence: "high", fascia: "Zain", appeal: 8, standard: 8,
        brands: { Zain: { full_stickers: 2, generic_posters: 2, approved_reseller: 1, push_pull: 1 }, stc: { generic_posters: 1 } },
        aiCounted: { Zain: { full_stickers: 2, generic_posters: 1, approved_reseller: 1, push_pull: 1 } },
        note: "New Zain fascia since the last visit. The AI missed one poster on the door, corrected.",
      },
    ],
  },
  {
    slug: "golden-city-phones",
    name: "Golden City Phones",
    arabic: "المدينة الذهبية للهواتف",
    code: "RSL-1002",
    city: "Muharraq",
    region: "Muharraq",
    lat: 26.2557,
    lng: 50.6119,
    landmark: "Muharraq souq",
    audits: [
      {
        daysAgo: 38, by: "fatima", status: "REVIEWED", confidence: "high", fascia: "stc", appeal: 7, standard: 7,
        brands: { stc: { full_stickers: 1, generic_posters: 2 }, Zain: { generic_posters: 2, stripes: 2 }, Batelco: { approved_reseller: 1 } },
      },
      {
        daysAgo: 5, by: "fatima", status: "REVIEWED", confidence: "high", fascia: "stc", appeal: 7, standard: 7,
        brands: { stc: { full_stickers: 1, generic_posters: 1, approved_reseller: 1 }, Zain: { full_stickers: 1, generic_posters: 1, stripes: 1 } },
      },
    ],
  },
  {
    slug: "star-mobile-center",
    name: "Star Mobile Center",
    arabic: "مركز النجمة للهواتف",
    code: "RSL-1003",
    city: "Riffa",
    region: "Southern",
    lat: 26.1302,
    lng: 50.5551,
    landmark: "Riffa main road",
    audits: [
      {
        daysAgo: 50, by: "hussain", status: "REVIEWED", confidence: "medium", fascia: null, appeal: 5, standard: 5,
        brands: { Batelco: { full_stickers: 2, generic_posters: 1 }, Zain: { full_stickers: 1, generic_posters: 1, stripes: 3 }, stc: { generic_posters: 2 } },
      },
      {
        daysAgo: 12, by: "hussain", status: "REVIEWED", confidence: "high", fascia: null, appeal: 7, standard: 7,
        brands: { Zain: { full_stickers: 2, generic_posters: 1, stripes: 3, approved_reseller: 1, push_pull: 1 }, Batelco: { full_stickers: 1, generic_posters: 1, approved_reseller: 1 }, stc: { generic_posters: 2 } },
      },
    ],
  },
  {
    slug: "seef-connect",
    name: "Seef Connect",
    arabic: "سيف كونكت",
    code: "RSL-1004",
    city: "Seef",
    region: "Capital",
    lat: 26.2346,
    lng: 50.5331,
    landmark: "Opposite Seef Mall",
    audits: [
      {
        daysAgo: 30, by: "ali", status: "REVIEWED", confidence: "high", fascia: "Batelco", appeal: 8, standard: 8,
        brands: { Batelco: { full_stickers: 1, generic_posters: 2 }, Zain: { generic_posters: 1, approved_reseller: 1, push_pull: 1 }, stc: { generic_posters: 1 } },
      },
    ],
  },
  {
    slug: "pearl-telecom",
    name: "Pearl Telecom",
    arabic: "اللؤلؤة للاتصالات",
    code: "RSL-1005",
    city: "Hidd",
    region: "Muharraq",
    lat: 26.2467,
    lng: 50.6532,
    landmark: "Hidd high street",
    audits: [
      {
        daysAgo: 55, by: "fatima", status: "REVIEWED", confidence: "high", fascia: "Zain", appeal: 8, standard: 8,
        brands: { Zain: { full_stickers: 1, generic_posters: 3, stripes: 2, approved_reseller: 1 }, stc: { generic_posters: 1 } },
      },
      {
        daysAgo: 19, by: "fatima", status: "REVIEWED", confidence: "high", fascia: "Zain", appeal: 9, standard: 9,
        brands: { Zain: { full_stickers: 2, generic_posters: 3, stripes: 3, approved_reseller: 1, push_pull: 1 }, stc: { generic_posters: 1 } },
        note: "Full Zain set, every element at its cap.",
      },
    ],
  },
  {
    slug: "riffa-phone-house",
    name: "Riffa Phone House",
    arabic: "بيت الهاتف",
    code: "RSL-1006",
    city: "Riffa",
    region: "Southern",
    lat: 26.1227,
    lng: 50.5643,
    landmark: "East Riffa",
    audits: [
      {
        daysAgo: 26, by: "hussain", status: "REVIEWED", confidence: "medium", fascia: null, appeal: 4, standard: 4,
        brands: { Zain: { generic_posters: 1 }, stc: { generic_posters: 1, approved_reseller: 1 }, Batelco: { generic_posters: 1 } },
      },
    ],
  },
  {
    slug: "juffair-smart-store",
    name: "Juffair Smart Store",
    arabic: "جفير سمارت ستور",
    code: "RSL-1007",
    city: "Juffair",
    region: "Capital",
    lat: 26.2131,
    lng: 50.6052,
    landmark: "Juffair Avenue",
    audits: [
      {
        daysAgo: 33, by: "ali", status: "REVIEWED", confidence: "high", fascia: null, appeal: 6, standard: 6,
        brands: { stc: { full_stickers: 2, generic_posters: 1 }, Zain: { full_stickers: 1, generic_posters: 2 }, Batelco: { generic_posters: 1, stripes: 2 } },
      },
      {
        daysAgo: 3, by: "ali", status: "SCORED", confidence: "medium", fascia: null, appeal: 7, standard: 7,
        brands: { Zain: { full_stickers: 2, generic_posters: 2, approved_reseller: 1 }, stc: { full_stickers: 1, generic_posters: 1 }, Batelco: { generic_posters: 1 } },
      },
    ],
  },
  {
    slug: "hamad-town-telecom",
    name: "Hamad Town Telecom",
    arabic: "مدينة حمد للاتصالات",
    code: "RSL-1008",
    city: "Hamad Town",
    region: "Northern",
    lat: 26.1153,
    lng: 50.5064,
    landmark: "Roundabout 1",
    audits: [
      {
        daysAgo: 21, by: "hussain", status: "REVIEWED", confidence: "high", fascia: "stc", appeal: 8, standard: 8,
        brands: { stc: { full_stickers: 2, generic_posters: 2, approved_reseller: 1, push_pull: 1 }, Zain: { generic_posters: 1 } },
      },
    ],
  },
  {
    slug: "budaiya-digital",
    name: "Budaiya Digital",
    arabic: "البديع ديجيتال",
    code: "RSL-1009",
    city: "Budaiya",
    region: "Northern",
    lat: 26.2174,
    lng: 50.4498,
    landmark: "Budaiya Highway",
    audits: [
      {
        daysAgo: 16, by: "fatima", status: "REVIEWED", confidence: "high", fascia: "Zain", appeal: 7, standard: 8,
        brands: { Zain: { generic_posters: 2, stripes: 1, approved_reseller: 1 }, Batelco: { full_stickers: 1, generic_posters: 1 }, stc: { generic_posters: 2 } },
      },
    ],
  },
  {
    slug: "isa-town-mobile",
    name: "Isa Town Mobile",
    arabic: "مدينة عيسى موبايل",
    code: "RSL-1010",
    city: "Isa Town",
    region: "Southern",
    lat: 26.1736,
    lng: 50.5478,
    landmark: "Isa Town market",
    audits: [
      {
        daysAgo: 47, by: "hussain", status: "REVIEWED", confidence: "high", fascia: null, appeal: 6, standard: 5,
        brands: { stc: { full_stickers: 1, generic_posters: 2, stripes: 1 }, Zain: { full_stickers: 1, generic_posters: 1 }, Batelco: { generic_posters: 1, approved_reseller: 1 } },
      },
      {
        daysAgo: 2, by: "hussain", status: "SCORED", confidence: "low", fascia: null, appeal: 6, standard: 6,
        brands: { Zain: { full_stickers: 1, generic_posters: 2, stripes: 2 }, stc: { full_stickers: 1, generic_posters: 2, stripes: 1, approved_reseller: 1 }, Batelco: { generic_posters: 1 } },
      },
    ],
  },
  {
    slug: "arad-mobile-corner",
    name: "Arad Mobile Corner",
    arabic: "ركن عراد للهواتف",
    code: "RSL-1011",
    city: "Arad",
    region: "Muharraq",
    lat: 26.2503,
    lng: 50.6338,
    landmark: "Arad Fort road",
    audits: [
      {
        daysAgo: 10, by: "ali", status: "REVIEWED", confidence: "high", fascia: "Batelco", appeal: 7, standard: 7,
        brands: { Batelco: { full_stickers: 1, generic_posters: 1 }, Zain: { full_stickers: 1, generic_posters: 2, stripes: 2, approved_reseller: 1, push_pull: 1 } },
      },
    ],
  },
  {
    slug: "saar-gadgets",
    name: "Saar Gadgets",
    arabic: "سار للأجهزة",
    code: "RSL-1012",
    city: "Saar",
    region: "Northern",
    lat: 26.1897,
    lng: 50.4893,
    landmark: "Saar shopping strip",
    audits: [
      {
        daysAgo: 6, by: "noor", status: "REVIEWED", confidence: "high", fascia: null, appeal: 8, standard: 8,
        brands: { Zain: { full_stickers: 2, generic_posters: 3, stripes: 2, approved_reseller: 1, push_pull: 1 }, stc: { generic_posters: 1 }, Batelco: { generic_posters: 2 } },
      },
    ],
  },
  {
    slug: "adliya-mobile-lounge",
    name: "Adliya Mobile Lounge",
    arabic: "العدلية موبايل لاونج",
    code: "RSL-1013",
    city: "Adliya",
    region: "Capital",
    lat: 26.2109,
    lng: 50.5893,
    landmark: "Block 338",
    audits: [
      {
        daysAgo: 1, by: "fatima", status: "SCORED", confidence: "high", fascia: "stc", appeal: 8, standard: 7,
        brands: { stc: { generic_posters: 2, approved_reseller: 1 }, Zain: { full_stickers: 1, generic_posters: 1, stripes: 1, approved_reseller: 1 }, Batelco: { generic_posters: 1 } },
      },
    ],
  },
];

/** Photos offered on the New audit page in demo mode. Their shops are not in the sample data yet. */
export const DEMO_SAMPLES: DemoSample[] = [
  {
    slug: "al-waha-mobile", name: "Al Waha Mobile", arabic: "الواحة موبايل",
    fascia: "Zain", confidence: "high", appeal: 8, standard: 8,
    brands: { Zain: { full_stickers: 1, generic_posters: 2, stripes: 2, approved_reseller: 1, push_pull: 1 }, stc: { generic_posters: 1 }, Batelco: { generic_posters: 1 } },
  },
  {
    slug: "diamond-phones", name: "Diamond Phones", arabic: "دايموند للهواتف",
    fascia: "stc", confidence: "high", appeal: 7, standard: 7,
    brands: { stc: { full_stickers: 2, generic_posters: 1 }, Zain: { generic_posters: 2, stripes: 1, approved_reseller: 1 } },
  },
  {
    slug: "city-center-telecom", name: "City Center Telecom", arabic: "سيتي سنتر للاتصالات",
    fascia: null, confidence: "medium", appeal: 6, standard: 6,
    brands: { Zain: { full_stickers: 1, generic_posters: 2 }, Batelco: { full_stickers: 1, generic_posters: 1, approved_reseller: 1 }, stc: { generic_posters: 2, stripes: 2 } },
  },
  {
    slug: "smart-zone", name: "Smart Zone", arabic: "سمارت زون",
    fascia: "Batelco", confidence: "high", appeal: 8, standard: 7,
    brands: { Batelco: { generic_posters: 2 }, Zain: { full_stickers: 2, generic_posters: 1, approved_reseller: 1, push_pull: 1 }, stc: { generic_posters: 1 } },
  },
];

export const auditPhoto = (shop: DemoShop, index: number) => `${shop.slug}-${index + 1}.jpg`;
export const samplePhoto = (sample: DemoSample) => `sample-${sample.slug}.jpg`;

/** Full matrix counts for one operator, signage included. */
export function countsFor(look: DemoLook, op: Operator, source: Partial<Record<Operator, Counts>> = look.brands): Record<string, number> {
  const c = source[op] ?? {};
  return {
    signage: look.fascia === op ? 1 : 0,
    full_stickers: c.full_stickers ?? 0,
    generic_posters: c.generic_posters ?? 0,
    stripes: c.stripes ?? 0,
    approved_reseller: c.approved_reseller ?? 0,
    push_pull: c.push_pull ?? 0,
  };
}

/** Operators that appear in the photo at all. */
export function operatorsIn(look: DemoLook): Operator[] {
  return OPERATORS.filter((op) => look.fascia === op || Object.values(look.brands[op] ?? {}).some((n) => (n ?? 0) > 0));
}

// ── Where each element sits on the shop front ───────────────────────────

export type StickerSlot = "windowL" | "windowR" | "pillarL" | "pillarR";
export type PosterSlot = "windowL" | "windowR" | "door";
export type StripSlot = "step1" | "step2" | "step3" | "frameL" | "frameR";

export type Layout = {
  fascia: Operator | null;
  stickers: { slot: StickerSlot; brand: Operator }[];
  posters: { slot: PosterSlot; index: number; brand: Operator }[];
  strips: { slot: StripSlot; brand: Operator }[];
  badges: { index: number; brand: Operator }[];
  pushPull: Operator | null;
};

/**
 * Places every counted element on a standard shop front: two windows, a
 * door, two pillars and three entrance steps. Throws when the counts would
 * not fit, so a bad catalog entry fails loudly while drawing the photos.
 */
export function layoutFor(look: DemoLook): Layout {
  const ops = operatorsIn(look);
  const total = (k: keyof Counts) => ops.reduce((n, op) => n + (look.brands[op]?.[k] ?? 0), 0);
  const stickerCount = total("full_stickers");
  const posterCount = total("generic_posters");

  // Full stickers prefer the windows; move them to the pillars when the
  // posters need the window space.
  let onWindows = Math.min(stickerCount, 2);
  while (onWindows > 0 && posterCount > 3 * (2 - onWindows) + 1 && stickerCount - onWindows < 2) onWindows--;
  if (stickerCount - onWindows > 2 || posterCount > 3 * (2 - onWindows) + 1) {
    throw new Error(`Too many stickers/posters to draw (${stickerCount} stickers, ${posterCount} posters)`);
  }
  const stickerSlots: StickerSlot[] = [
    ...(["windowL", "windowR"] as const).slice(0, onWindows),
    ...(["pillarL", "pillarR"] as const).slice(0, stickerCount - onWindows),
  ];
  const covered = new Set<string>(stickerSlots);
  const posterSlots: { slot: PosterSlot; index: number }[] = [];
  for (const w of ["windowL", "windowR"] as const) {
    if (!covered.has(w)) for (let i = 0; i < 3; i++) posterSlots.push({ slot: w, index: i });
  }
  posterSlots.push({ slot: "door", index: 0 });

  const stripSlots: StripSlot[] = ["step1", "step2", "step3", "frameL", "frameR"];
  if (total("stripes") > stripSlots.length) throw new Error("Too many strips to draw");
  const badgeCount = total("approved_reseller");
  if (badgeCount > 3) throw new Error("Too many reseller badges to draw");
  const pushPullOps = ops.filter((op) => (look.brands[op]?.push_pull ?? 0) > 0);
  if (pushPullOps.length > 1) throw new Error("Only one operator can have PUSH/PULL stickers");

  const layout: Layout = { fascia: look.fascia, stickers: [], posters: [], strips: [], badges: [], pushPull: pushPullOps[0] ?? null };
  for (const op of ops) {
    const c = look.brands[op] ?? {};
    for (let i = 0; i < (c.full_stickers ?? 0); i++) layout.stickers.push({ slot: stickerSlots[layout.stickers.length], brand: op });
    for (let i = 0; i < (c.generic_posters ?? 0); i++) layout.posters.push({ ...posterSlots[layout.posters.length], brand: op });
    for (let i = 0; i < (c.stripes ?? 0); i++) layout.strips.push({ slot: stripSlots[layout.strips.length], brand: op });
    if ((c.approved_reseller ?? 0) > 0) layout.badges.push({ index: layout.badges.length, brand: op });
  }
  return layout;
}
