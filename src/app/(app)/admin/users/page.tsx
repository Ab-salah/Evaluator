import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { NewUserForm, UserRow } from "./UserForms";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
    include: { _count: { select: { submissions: true } } },
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Users" subtitle="Field users submit audits. Admins also review scores and manage the matrix and users." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Card>
          <CardHeader title={`${users.length} account${users.length === 1 ? "" : "s"}`} subtitle="Tap a person to change their role, reset their password or deactivate them." />
          <ul className="divide-y divide-neutral-100">
            {users.map((u) => (
              <UserRow
                key={u.id}
                isMe={u.id === me.id}
                user={{
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  role: u.role,
                  active: u.active,
                  hasPassword: !!u.passwordHash,
                  audits: u._count.submissions,
                  lastLogin: u.lastLoginAt?.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) ?? null,
                }}
              />
            ))}
          </ul>
        </Card>
        <Card className="self-start">
          <CardHeader title="Add a user" subtitle="Give them a temporary password; they can change it under Account." />
          <NewUserForm />
        </Card>
      </div>
    </div>
  );
}
