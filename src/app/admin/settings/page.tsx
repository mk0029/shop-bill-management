"use client";
import AdminBillingDefaultsSection from "@/components/settings/AdminBillingDefaultsSection";
import AdminNotificationsSection from "@/components/settings/AdminNotificationsSection";
import AdminSecuritySection from "@/components/settings/AdminSecuritySection";
import AdminShortcutsSection from "@/components/settings/AdminShortcutsSection";
import AdminFittingRatesSection from "@/components/settings/AdminFittingRatesSection";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-md:space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Settings
          </h1>
          <p className="text-gray-400 mt-1">
            Configure your application preferences and business settings
          </p>
        </div>
        {/* Keep header minimal on mobile */}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href="/admin/settings/toolslist"
          className="rounded-lg border border-gray-800 bg-gray-900/70 p-4 text-white hover:bg-gray-800/70 transition-colors"
        >
          <p className="font-semibold">Tool List Settings</p>
          <p className="text-sm text-gray-400 mt-1">Manage rentable tools, prices, and availability</p>
        </a>
        <a
          href="/admin/rent-tools"
          className="rounded-lg border border-gray-800 bg-gray-900/70 p-4 text-white hover:bg-gray-800/70 transition-colors"
        >
          <p className="font-semibold">Rent Tools</p>
          <p className="text-sm text-gray-400 mt-1">Create rentals, track overdue, returns, and payments</p>
        </a>
      </div>

      {/* Sections: mobile-first stacked, enhance to two columns on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-4">
          <AdminNotificationsSection />
          <AdminSecuritySection />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <AdminBillingDefaultsSection />
          <AdminFittingRatesSection />
          <AdminShortcutsSection />
        </div>
      </div>
    </div>
  );
}
