export default function LoadingBills() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
        <p className="text-gray-300 text-sm">Loading your bills…</p>
      </div>
    </div>
  );
}
