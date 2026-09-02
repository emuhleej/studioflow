import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { recordClientError } from "../lib/error-logging";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    void recordClientError(error, `render:${info.componentStack?.slice(0, 160) ?? "unknown"}`);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <section className="panel max-w-lg text-center" role="alert">
          <AlertTriangle className="mx-auto text-amber-300" size={32} />
          <h1 className="mt-4 text-xl font-semibold text-white">StudioFlow hit an unexpected problem</h1>
          <p className="mt-2 text-sm text-slate-300">The error was recorded without your story, prompt, or media contents.</p>
          <button className="button button-primary mt-5" type="button" onClick={() => window.location.reload()}>
            Reload workspace
          </button>
        </section>
      </main>
    );
  }
}
