import { countsFor, OPERATORS, operatorsIn, type DemoLook, type Layout, type Operator } from "./catalog";

// The wording the simulated AI uses: the same kind of notes, summary and
// rating reasons the real AI writes, built from what is in the photo.

const WORDS = ["no", "one", "two", "three", "four", "five", "six"];
const word = (n: number) => WORDS[n] ?? String(n);
const plural = (n: number, one: string, many = `${one}s`) => `${word(n)} ${n === 1 ? one : many}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const unique = (items: string[]) => [...new Set(items)];

const PLACE: Record<string, string> = {
  windowL: "the left window",
  windowR: "the right window",
  pillarL: "the left pillar",
  pillarR: "the right pillar",
};

export function listJoin(items: string[], last = "and"): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ${last} ${items[items.length - 1]}`;
}

/** One note per element the operator scored on, saying what was seen and where. */
export function notesFor(look: DemoLook, op: Operator, layout: Layout | null): Record<string, string> {
  const c = countsFor(look, op);
  const notes: Record<string, string> = {};

  if (c.signage) notes.signage = `${op} fascia sign across the full width of the shop front, carrying the shop's name.`;
  if (c.full_stickers) {
    const places = (layout?.stickers ?? [])
      .filter((s) => s.brand === op)
      .map((s) => (s.slot.startsWith("pillar") ? `a wrap on ${PLACE[s.slot]}` : `a panel covering ${PLACE[s.slot]}`));
    const what = cap(plural(c.full_stickers, `large ${op} sticker`));
    notes.full_stickers = places.length ? `${what}: ${listJoin(places)}.` : `${what} on the shop front.`;
  }
  if (c.generic_posters) {
    const where = unique(
      (layout?.posters ?? []).filter((p) => p.brand === op).map((p) => (p.slot === "door" ? "on the door" : `in ${PLACE[p.slot]}`)),
    );
    notes.generic_posters = `${cap(plural(c.generic_posters, `${op} poster`))} ${where.length ? listJoin(where) : "in the windows"}.`;
  }
  if (c.stripes) {
    const where = unique(
      (layout?.strips ?? []).filter((s) => s.brand === op).map((s) => (s.slot.startsWith("step") ? "the entrance steps" : "the door frame")),
    );
    notes.stripes = `${cap(plural(c.stripes, `${op} strip`))} on ${where.length ? listJoin(where) : "the entrance"}, each run counted once.`;
  }
  if (c.approved_reseller) notes.approved_reseller = `${op} Approved Reseller sticker on the door glass.`;
  if (c.push_pull) notes.push_pull = `${op} PUSH and PULL stickers next to the door handles.`;
  return notes;
}

function itemsFor(look: DemoLook, op: Operator): string[] {
  const c = countsFor(look, op);
  const items: string[] = [];
  if (c.signage) items.push("its fascia sign");
  if (c.full_stickers) items.push(c.full_stickers === 1 ? "a full sticker" : `${word(c.full_stickers)} full stickers`);
  if (c.generic_posters) items.push(c.generic_posters === 1 ? "a poster" : `${word(c.generic_posters)} posters`);
  if (c.stripes) items.push(c.stripes === 1 ? "a strip" : `${word(c.stripes)} strips`);
  if (c.approved_reseller) items.push("an Approved Reseller sticker");
  if (c.push_pull) items.push("PUSH/PULL stickers");
  return items;
}

/** A short overall summary, strongest operator first. */
export function summaryFor(look: DemoLook, scores: { brand: string; score: number }[]): string {
  const ranked = [...scores].sort((a, b) => b.score - a.score);
  if (ranked.length === 0) return "No operator branding is visible on this shop front.";
  const lines = ranked.map((s, i) => {
    const items = listJoin(itemsFor(look, s.brand as Operator));
    if (i === 0) return ranked.length > 1 && ranked[1].score === s.score ? `${s.brand} has ${items}.` : `${s.brand} leads with ${items}.`;
    return `${s.brand} has ${items}.`;
  });
  const absent = OPERATORS.filter((op) => !operatorsIn(look).includes(op));
  if (absent.length) lines.push(`No ${listJoin(absent, "or")} branding is visible.`);
  return lines.join(" ");
}

export function appealReason(score: number): string {
  if (score >= 9) return "Bright, spotless storefront with an open, inviting entrance and well spaced displays.";
  if (score >= 7) return "Clean and well lit with a clear entrance; the windows are busy but still tidy.";
  if (score >= 5) return "Acceptable, but crowded: posters compete for space and the entrance feels a little cluttered.";
  return "Cluttered windows and tired-looking materials make the shop look less inviting from the street.";
}

export function standardReason(score: number): string {
  if (score >= 9) return "On par with a well run operator store: consistent branding, clean glazing and a clear fascia.";
  if (score >= 7) return "Above the typical reseller standard, with mostly consistent and well kept branding.";
  if (score >= 5) return "Around the typical reseller standard; branding from several operators competes for attention.";
  return "Below the usual standard: uncoordinated branding and sparse, ageing materials.";
}
