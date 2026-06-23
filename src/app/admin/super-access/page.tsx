import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SuperAccessIndexPage() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) redirect("/");
  if (auth.role !== "super_admin") redirect("/unauthorized");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Super Access</h1>
      <div className="text-gray-300">
        Tools restricted to Super Admin only.
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/admin/super-access/update-bills"
          className="rounded-lg border border-gray-800 bg-gray-900 p-4 hover:bg-gray-800"
        >
          <div className="font-semibold text-white">Update Bills</div>
          <div className="text-sm text-gray-400">
            Edit any bill, add/remove items, and resend customer WhatsApp update message.
          </div>
        </Link>
        <Link
          href="/admin/super-access/blacklist-customer"
          className="rounded-lg border border-gray-800 bg-gray-900 p-4 hover:bg-gray-800"
        >
          <div className="font-semibold text-white">Blacklist Customer</div>
          <div className="text-sm text-gray-400">
            Block a customer from accessing the portal.
          </div>
        </Link>
        <Link
          href="/admin/super-access/delete-cashbook-entry"
          className="rounded-lg border border-gray-800 bg-gray-900 p-4 hover:bg-gray-800"
        >
          <div className="font-semibold text-white">Delete Cashbook Entry</div>
          <div className="text-sm text-gray-400">
            Delete an incorrect cashbook entry by ID.
          </div>
        </Link>
        <Link
          href="/admin/super-access/whatsapp-bot"
          className="rounded-lg border border-gray-800 bg-gray-900 p-4 hover:bg-gray-800"
        >
          <div className="font-semibold text-white">WhatsApp Bot Status</div>
          <div className="text-sm text-gray-400">
            Inspect bot health, status, event logs, wake/restart/test-send. All logs stored locally.
          </div>
        </Link>
      </div>
    </div>
  );
}
