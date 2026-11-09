import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { PasswordForm } from "./PasswordForm";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PageHeader title="Account" subtitle="Your sign-in details." />
      <Card>
        <dl className="divide-y divide-neutral-100 text-sm">
          {[
            ["Name", user.name],
            ["Email", user.email],
            ["Role", user.role === "ADMIN" ? "Admin: reviews scores, manages the matrix and users" : "Field user: submits audits"],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-4 px-4 py-3 sm:px-5">
              <dt className="w-16 shrink-0 font-bold text-neutral-500">{k}</dt>
              <dd className="min-w-0 break-words text-brand-950">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card>
        <CardHeader title="Change password" subtitle="At least 8 characters." />
        <PasswordForm />
      </Card>
    </div>
  );
}
