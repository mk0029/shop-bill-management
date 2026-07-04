export default function Loading() {
  return (
    <div className="flex h-[var(--app-vh,100dvh)] items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-400/20 border-t-sky-400" />
        <p className="text-xs text-white/40">Loading…</p>
      </div>
    </div>
  );
}
