import { useRef, useState, type ChangeEvent } from "react";
import { CheckCircle2, Cloud, Database, Download, GitBranch, HardDrive, KeyRound, LogOut, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import { B2_FREE_BYTES, B2_UPLOAD_BLOCK_BYTES, B2_WARNING_BYTES, getActiveStorageBytes } from "../lib/domain";
import { formatBytes } from "../lib/format";
import { useStudio } from "../state/studio-store";
import { Button, PageHeading } from "../components/ui";

export function SettingsPage() {
  const { data, isDemo, user, logout, resetDemo, exportWorkspace, importWorkspace } = useStudio();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const storage = getActiveStorageBytes(data);

  const restore = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    setError("");
    try { await importWorkspace(file); } catch (restoreError) { setError(restoreError instanceof Error ? restoreError.message : "The export could not be restored."); }
  };

  return (
    <div>
      <PageHeading eyebrow="Settings" title="Keep the studio safe." description="Environment status, free-tier guardrails, metadata exports, and account controls live here." />
      {error ? <div className="mb-4 rounded-xl border border-[rgb(240_125_118_/_0.35)] bg-[rgb(240_125_118_/_0.08)] p-3 text-sm text-[#ffb3ad]">{error}</div> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="panel panel-pad">
          <div className="flex items-center gap-2"><ShieldCheck size={18} color="var(--mint)" /><h2 className="section-title">Workspace access</h2></div>
          <div className="mt-4 grid gap-2"><SettingRow icon={<GitBranch size={16} />} label="Authentication" value={isDemo ? "Demo mode" : "GitHub OAuth"} /><SettingRow icon={<KeyRound size={16} />} label="Owner" value={isDemo ? "Fictional local owner" : user?.email ?? user?.user_metadata?.user_name ?? "Authenticated"} /><SettingRow icon={<Database size={16} />} label="Metadata" value={isDemo ? "Browser localStorage" : "Supabase PostgreSQL + RLS"} /><SettingRow icon={<HardDrive size={16} />} label="Media" value={isDemo ? "Browser IndexedDB" : "Private Backblaze B2"} /></div>
          {!isDemo ? <Button variant="danger" className="mt-4 w-full" onClick={() => void logout()}><LogOut size={16} />Sign out</Button> : null}
        </section>

        <section className="panel panel-pad">
          <div className="flex items-center gap-2"><Cloud size={18} color="var(--violet)" /><h2 className="section-title">Free-tier guardrails</h2></div>
          <div className="mt-5 progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, storage / B2_UPLOAD_BLOCK_BYTES * 100)}%` }} /></div>
          <div className="muted mt-2 flex justify-between text-xs"><span>{formatBytes(storage)} recorded</span><span>{formatBytes(B2_UPLOAD_BLOCK_BYTES)} app cap</span></div>
          <div className="mt-4 grid gap-2"><SettingRow icon={<CheckCircle2 size={16} />} label="Warning" value={`At ${formatBytes(B2_WARNING_BYTES)}`} /><SettingRow icon={<CheckCircle2 size={16} />} label="Upload block" value={`At ${formatBytes(B2_UPLOAD_BLOCK_BYTES)}`} /><SettingRow icon={<CheckCircle2 size={16} />} label="Provider allowance" value={`${formatBytes(B2_FREE_BYTES)} / month`} /></div>
          <p className="quiet mt-4 text-xs leading-5">StudioFlow never enables paid overages. Provider dashboards remain the final source of truth because hidden versions and incomplete uploads can temporarily differ from app totals.</p>
        </section>

        <section className="panel panel-pad">
          <div className="flex items-center gap-2"><Download size={18} color="var(--amber)" /><h2 className="section-title">Metadata backup</h2></div>
          <p className="muted mt-3 text-sm leading-6">Export every project, series, episode, script version, shot, prompt, cost, and media record. Media files remain in their private object store.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2"><Button onClick={exportWorkspace}><Download size={16} />Export JSON</Button><input ref={inputRef} className="hidden" type="file" accept="application/json,.json" onChange={(event) => void restore(event)} /><Button onClick={() => inputRef.current?.click()}><Upload size={16} />Restore export</Button></div>
        </section>

        <section className="panel panel-pad">
          <div className="flex items-center gap-2"><RotateCcw size={18} color="var(--rose)" /><h2 className="section-title">Demo workspace</h2></div>
          <p className="muted mt-3 text-sm leading-6">The fictional studio is safe to edit while learning. Reset restores Maya, the judgmental refrigerator, and the sample production history.</p>
          <Button variant="danger" className="mt-4 w-full" disabled={!isDemo} onClick={resetDemo}><RotateCcw size={16} />Reset fictional demo</Button>
        </section>
      </div>
      <section className="panel panel-pad mt-4"><div className="eyebrow">Production readiness</div><h2 className="section-title mt-1">External configuration checklist</h2><div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4"><Checklist label="Supabase project" ready={!isDemo} /><Checklist label="Owner UUID allowlisted" ready={!isDemo} /><Checklist label="Private B2 buckets" ready={!isDemo} /><Checklist label="Netlify production" ready={false} detail="Held for approval" /></div></section>
    </div>
  );
}

function SettingRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="list-row"><div className="muted flex items-center gap-2 text-xs">{icon}{label}</div><span className="text-right text-xs font-semibold">{value}</span></div>; }
function Checklist({ label, ready, detail }: { label: string; ready: boolean; detail?: string }) { return <div className="rounded-xl border border-[var(--line)] p-3"><div className="flex items-center gap-2 text-sm font-semibold"><span className="status-dot" style={{ color: ready ? "var(--mint)" : "var(--amber)" }} />{label}</div><div className="quiet mt-2 text-xs">{detail ?? (ready ? "Configured" : "Configuration pending")}</div></div>; }
