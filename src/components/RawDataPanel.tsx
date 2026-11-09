export function RawDataPanel({ data }: { data: Record<string, unknown> }) {
  return (
    <details className="group rounded-2xl border border-neutral-200 bg-white">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-neutral-500 hover:text-brand-900">
        <span className="mr-1 inline-block transition group-open:rotate-90">›</span> Raw evaluation data
      </summary>
      <pre className="max-h-96 overflow-auto rounded-b-2xl bg-brand-950 p-4 text-xs text-brand-100">{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}
