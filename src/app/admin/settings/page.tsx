"use client";
import AdminBillingDefaultsSection from "@/components/settings/AdminBillingDefaultsSection";
import AdminNotificationsSection from "@/components/settings/AdminNotificationsSection";
import AdminSecuritySection from "@/components/settings/AdminSecuritySection";
import AdminShortcutsSection from "@/components/settings/AdminShortcutsSection";
import { AdminChatManagementSection } from "@/components/settings/AdminChatManagementSection";
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
          <AdminChatManagementSection />
        </div>
      </div>
    </div>
  );
}
