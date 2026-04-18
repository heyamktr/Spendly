import { getApiBaseUrl } from "@/lib/api";

const apiBaseUrl = getApiBaseUrl();

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-50">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/80 p-10 shadow-2xl shadow-slate-950/40">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
          Spendly
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Phase 1 frontend shell
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
          This minimal Next.js app confirms the frontend scaffolding is in
          place. Dashboard analytics and transaction views will be added in a
          later phase.
        </p>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
          <p className="text-sm text-slate-400">Configured backend base URL</p>
          <code className="mt-2 block text-sm text-cyan-200">{apiBaseUrl}</code>
        </div>
      </div>
    </main>
  );
}
