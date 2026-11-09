import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppMark } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { next } = await searchParams;

  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] lg:grid-cols-[1.1fr_1fr] lg:grid-rows-1">
      {/* Brand panel: full height on desktop, a header band on phones */}
      <div className="relative overflow-hidden bg-midnight px-6 pb-16 pt-[max(2.5rem,env(safe-area-inset-top))] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-16 h-80 w-80 bg-zain-pattern opacity-25 mix-blend-screen lg:-bottom-40 lg:-right-40 lg:top-auto lg:h-[36rem] lg:w-[36rem]" />
        <div className="relative flex items-center gap-3">
          <AppMark className="h-11 w-11" />
          <div className="leading-tight">
            <div className="text-lg font-extrabold tracking-tight">Visibility Evaluator</div>
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-zain-sky">Reseller audits</div>
          </div>
        </div>
        <div className="relative mt-10 max-w-md lg:mt-0">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight lg:text-5xl">
            Photograph the shop.
            <br />
            <span className="text-zain-lime">We&apos;ll do the scoring.</span>
          </h1>
          <p className="mt-4 hidden text-base text-white/75 sm:block">
            Every operator&apos;s branding is counted against the Visibility Matrix and ranked the same way, every
            time — no more subjective, manual scoring.
          </p>
        </div>
        <div className="relative mt-10 hidden gap-2 lg:flex">
          {["#c3d534", "#23aeb7", "#6fc7ea", "#9b4291", "#e27faf", "#f6eb69"].map((c) => (
            <span key={c} className="h-1.5 w-10 rounded-full" style={{ background: c }} />
          ))}
        </div>
      </div>

      <div className="relative -mt-8 flex items-start justify-center rounded-t-3xl bg-canvas px-6 py-10 lg:mt-0 lg:items-center lg:rounded-none">
        <div className="w-full max-w-sm animate-rise">
          <h2 className="text-2xl font-extrabold tracking-tight text-brand-950">Sign in</h2>
          <p className="mt-1 text-sm text-neutral-500">Use the account your admin set up for you.</p>
          <LoginForm next={next} />
          <p className="mt-8 text-center text-xs text-neutral-400">Forgot your password? Ask an admin to reset it.</p>
        </div>
      </div>
    </div>
  );
}
