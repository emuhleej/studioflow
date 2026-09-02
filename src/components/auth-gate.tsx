import { LoaderCircle, LockKeyhole, ShieldX, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useStudio } from "../state/studio-store";
import { Button } from "./ui";

export function AuthGate({ children }: { children: ReactNode }) {
  const { isDemo, user, ownerAuthorized, authLoading, dataLoading, login, logout } = useStudio();

  if (isDemo) return children;
  if (authLoading || dataLoading || (user && ownerAuthorized === null)) {
    return <div className="grid min-h-screen place-items-center"><div className="grid justify-items-center gap-3 muted"><LoaderCircle className="animate-spin" /><span className="text-sm">Opening your studio…</span></div></div>;
  }
  if (user && ownerAuthorized) return children;
  if (user && ownerAuthorized === false) {
    return (
      <main className="grid min-h-screen place-items-center p-5">
        <section className="panel w-full max-w-md p-7 text-center" role="alert">
          <ShieldX className="mx-auto text-[var(--rose)]" size={34} />
          <h1 className="mt-4 text-2xl font-semibold text-white">This account is not the StudioFlow owner.</h1>
          <p className="muted mt-3 text-sm leading-6">The page is public, but the workspace only opens for the single UUID stored in the owner allowlist.</p>
          <Button className="mt-5 w-full" onClick={() => void logout()}>Sign out</Button>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center p-5">
      <section className="panel w-full max-w-md overflow-hidden">
        <div className="border-b border-[var(--line)] p-7">
          <div className="brand-mark mb-5"><Sparkles size={19} /></div>
          <div className="eyebrow">Private production workspace</div>
          <h1 className="display-title !text-[2.5rem]">Welcome to StudioFlow.</h1>
          <p className="muted mt-3 text-sm leading-6">Your stories, production memory, media, and costs stay behind an owner-only GitHub sign-in.</p>
        </div>
        <div className="grid gap-4 p-7">
          <div className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-black/10 p-3">
            <LockKeyhole size={18} color="var(--mint)" className="mt-0.5 shrink-0" />
            <p className="muted text-xs leading-5">Authentication is handled by Supabase. Database policies and private media URLs enforce access even if someone discovers this page.</p>
          </div>
          <Button variant="primary" onClick={() => void login()}>Continue with GitHub</Button>
        </div>
      </section>
    </main>
  );
}
