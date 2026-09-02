import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/app-shell";
import { AuthGate } from "./components/auth-gate";
import { CreatorHQPage } from "./pages/creator-hq";
import { EpisodePage } from "./pages/episode";
import { LibraryPage } from "./pages/library";
import { MediaPage } from "./pages/media";
import { ProjectPage } from "./pages/project";
import { ProjectsPage } from "./pages/projects";
import { SeriesPage } from "./pages/series";
import { SettingsPage } from "./pages/settings";

export function App() {
  return (
    <AuthGate>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<CreatorHQPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectPage />} />
          <Route path="series/:seriesId" element={<SeriesPage />} />
          <Route path="episodes/:episodeId" element={<EpisodePage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthGate>
  );
}
