import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="h-[var(--app-vh,100dvh)] bg-gray-950 text-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md border border-gray-800 rounded-lg bg-gray-900 p-6">
        <h1 className="text-2xl font-bold">403 — Unauthorized</h1>
        <p className="text-gray-300 mt-2">
          You don&apos;t have permission to access this page.
        </p>
        <div className="mt-5 flex gap-3">
          <Link
            href="/"
            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white"
          >
            Go Home
          </Link>
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 rounded-md border border-gray-700 hover:bg-gray-800"
          >
            Admin Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
