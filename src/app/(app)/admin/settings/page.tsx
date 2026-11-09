import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getAiConfig, MODEL_CHOICES } from "@/lib/settings";
import { Card, CardHeader, Icon, PageHeader } from "@/components/ui";
import { AiSettingsForm } from "./AiSettingsForm";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdmin();
  const ai = await getAiConfig();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Settings" subtitle="Server-wide settings. Changes apply to everyone straight away." />

      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <Icon name="sparkles" className="h-4 w-4 text-zain-teal" /> AI scoring
            </span>
          }
          subtitle="The AI reads the shop name off the sign and counts every operator's branding. Without a key, admins score photos by hand."
          action={
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${
                ai.apiKey ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${ai.apiKey ? "bg-emerald-500" : "bg-amber-500"}`} />
              {ai.apiKey ? "On" : "Off"}
            </span>
          }
        />
        <AiSettingsForm
          keySource={ai.keySource}
          keyHint={ai.keyHint}
          model={MODEL_CHOICES.some((m) => m.id === ai.model) ? ai.model : MODEL_CHOICES[0].id}
          models={MODEL_CHOICES.map((m) => ({ ...m }))}
        />
      </Card>

      <Card className="p-4 text-sm text-neutral-600 sm:p-5">
        <h2 className="mb-2 font-bold text-brand-950">Getting an API key</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Sign in at{" "}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="font-bold text-brand-700 underline">
              console.anthropic.com
            </a>{" "}
            with the company account.
          </li>
          <li>Create a key (for example &quot;Visibility Evaluator&quot;) and copy it. It starts with sk-ant-.</li>
          <li>Paste it above and press Save. The app tests it straight away.</li>
        </ol>
        <p className="mt-3 text-xs text-neutral-500">
          The key is stored in this server&apos;s database and is never sent back to anyone&apos;s browser; only its last 4
          characters are shown. The server needs outbound HTTPS access to api.anthropic.com.
        </p>
      </Card>
    </div>
  );
}
