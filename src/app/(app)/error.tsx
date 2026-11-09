"use client";

import { btn, Card, EmptyState } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card>
      <EmptyState
        icon="alert"
        title="Something went wrong"
        action={
          <button type="button" onClick={reset} className={btn.primary}>
            Try again
          </button>
        }
      >
        {error.digest ? `The server logged this as ${error.digest}. ` : ""}If it keeps happening, check that the database is reachable.
      </EmptyState>
    </Card>
  );
}
