export function RawDataPanel({ data }: { data: Record<string, unknown> }) {
  return (
    <details className="rounded-lg border border-neutral-200 bg-white">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-neutral-600 hover:text-neutral-900">
        Raw evaluation data
      </summary>
      <pre className="overflow-x-auto border-t border-neutral-200 bg-neutral-900 p-4 text-xs text-neutral-100">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}
