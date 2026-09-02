import { useState, type FormEvent } from "react";
import { Archive, Clapperboard, FolderKanban, Gauge, Library, Plus, Settings, Sparkles } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useStudio } from "../state/studio-store";
import { Button, Field, Modal, NoticeToast, SubmitButton } from "./ui";

const navigation = [
  { to: "/", label: "Creator HQ", icon: Gauge, end: true },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/library", label: "Production Memory", icon: Library },
  { to: "/media", label: "Media", icon: Clapperboard },
  { to: "/settings", label: "Settings", icon: Settings },
];

function Navigation({ mobile = false }: { mobile?: boolean }) {
  return (
    <nav className={mobile ? "mobile-nav" : "grid gap-1"} aria-label={mobile ? "Mobile navigation" : "Primary navigation"}>
      {navigation.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} aria-label={label} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <Icon size={mobile ? 19 : 18} />
          <span className={mobile ? "" : "nav-copy"}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell() {
  const { data, isDemo, quickCapture } = useStudio();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [capture, setCapture] = useState("");
  const location = useLocation();
  const activeProject = data.projects.find((project) => !project.archivedAt);

  const submitCapture = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!capture.trim()) return;
    quickCapture(capture.trim());
    setCapture("");
    setCaptureOpen(false);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row flex items-center gap-3 px-1">
          <div className="brand-mark"><Sparkles size={19} strokeWidth={2.5} /></div>
          <div className="brand-copy min-w-0">
            <div className="font-semibold tracking-tight">StudioFlow</div>
            <div className="quiet text-[0.68rem]">Production core</div>
          </div>
        </div>
        <Navigation />
        <div className="mt-auto grid gap-3">
          <Button variant="primary" aria-label="Quick capture" onClick={() => setCaptureOpen(true)}><Plus size={17} /><span className="sidebar-copy">Quick capture</span></Button>
          <div className="sidebar-copy rounded-xl border border-[var(--line)] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold"><Archive size={14} color="var(--violet)" />Current studio</div>
            <div className="muted mt-2 truncate text-xs">{activeProject?.title ?? "No active project"}</div>
            <div className="quiet mt-1 text-[0.65rem]">{isDemo ? "Fictional demo workspace" : "Private cloud workspace"}</div>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="mobile-topbar">
          <div className="flex items-center gap-2"><div className="brand-mark !h-9 !w-9"><Sparkles size={17} /></div><strong className="text-sm">StudioFlow</strong></div>
          <Button className="icon-button" variant="primary" aria-label="Quick capture" onClick={() => setCaptureOpen(true)}><Plus size={18} /></Button>
        </header>
        <main className="main-frame">
          <div className="page-wrap">
            <header className="topbar">
              <div className="flex min-w-0 items-center gap-2 text-xs">
                <span className="muted">StudioFlow</span><span className="quiet">/</span><span className="truncate font-semibold">{location.pathname === "/" ? "Creator HQ" : location.pathname.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge"><span className="status-dot" style={{ color: isDemo ? "var(--amber)" : "var(--mint)" }} />{isDemo ? "Demo data" : "Owner protected"}</span>
                <Button variant="primary" onClick={() => setCaptureOpen(true)}><Plus size={16} />Quick capture</Button>
              </div>
            </header>
            <Outlet />
          </div>
        </main>
        <Navigation mobile />
      </div>

      <Modal open={captureOpen} onClose={() => setCaptureOpen(false)} title="Quick capture" description="Save the thought now; shape it into an episode later.">
        <form className="grid gap-4" onSubmit={submitCapture}>
          <Field label="Idea, line, visual, or production note">
            <textarea autoFocus className="textarea" value={capture} onChange={(event) => setCapture(event.target.value)} placeholder="A smart vacuum files a workplace complaint…" />
          </Field>
          <div className="flex justify-end gap-2"><Button type="button" onClick={() => setCaptureOpen(false)}>Cancel</Button><SubmitButton>Save capture</SubmitButton></div>
        </form>
      </Modal>
      <NoticeToast />
    </div>
  );
}
