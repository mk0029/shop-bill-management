import type { ComponentType } from "react";
import {
  Bell,
  Shield,
  MessageCircle,
  ReceiptText,
  BriefcaseBusiness,
  Wrench,
  IndianRupee,
  Palette,
  Database,
  Info,
  Smartphone,
  Volume2,
  Moon,
  KeyRound,
  Clock,
  FileText,
  CreditCard,
  Calculator,
  Download,
  Upload,
  History,
  Star,
  Settings,
  UserRound,
  MapPin,
} from "lucide-react";

export type SettingControl =
  | { type: "toggle"; key: string; title: string; description?: string; defaultValue?: boolean }
  | { type: "number"; key: string; title: string; description?: string; defaultValue?: number; suffix?: string }
  | { type: "select"; key: string; title: string; description?: string; defaultValue?: string; options: string[] }
  | { type: "action"; key: string; title: string; description?: string; label?: string; href?: string };

export type SettingNode = {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  componentKey?: "profile" | "password" | "version" | "notifications" | "security" | "billingDefaults" | "fittingRates" | "shortcuts";
  roles?: Array<"admin" | "super_admin" | "technician" | "customer">;
  controls?: SettingControl[];
  children?: SettingNode[];
};

function option(
  id: string,
  title: string,
  description: string,
  controls?: SettingControl[],
  icon = Settings,
  roles?: SettingNode["roles"],
): SettingNode {
  return { id, title, description, icon, controls, roles };
}

export const settingsTree: SettingNode[] = [
  {
    id: "personal-information",
    title: "Personal Information",
    description: "Profile picture, location, home address, and password",
    icon: UserRound,
    children: [
      {
        id: "profile",
        title: "Profile & Address",
        description: "Update profile picture, location, and home address",
        icon: MapPin,
        componentKey: "profile",
      },
      {
        id: "password",
        title: "Update Password",
        description: "Verify email by OTP before changing login password",
        icon: KeyRound,
        componentKey: "password",
      },
    ],
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Configure alerts, sounds, popovers, and quiet hours",
    icon: Bell,
    children: [
      { id: "in-app", title: "In-App Notifications", description: "Popovers and app notification behavior", icon: Bell, componentKey: "notifications" },
      option("push", "Push Notifications", "OS notifications for background and closed app states", [
        { type: "toggle", key: "push.enabled", title: "Enable Push Notifications", defaultValue: true },
        { type: "toggle", key: "push.chat", title: "Message Notifications", defaultValue: true },
        { type: "toggle", key: "push.billing", title: "Billing Notifications", defaultValue: true },
        { type: "toggle", key: "push.work", title: "Work Notifications", defaultValue: true },
        { type: "toggle", key: "push.toolRent", title: "Tool Rental Notifications", defaultValue: true },
      ], Smartphone),
      option("sound", "Notification Sound", "Foreground sound and vibration preferences", [
        { type: "toggle", key: "sound.enabled", title: "Play Sound", defaultValue: false },
        { type: "select", key: "sound.tone", title: "Tone", defaultValue: "Default", options: ["Default", "Soft", "Alert", "Silent"] },
      ], Volume2),
      option("popovers", "Notification Popovers", "Control banners and popover display", [
        { type: "toggle", key: "popover.enabled", title: "Show Popovers", defaultValue: true },
        { type: "toggle", key: "popover.group", title: "Group Related Notifications", defaultValue: true },
      ]),
      option("messages", "Message Notifications", "Chat message rules", [
        { type: "toggle", key: "notify.messages.preview", title: "Show Message Preview", defaultValue: true },
        { type: "toggle", key: "notify.messages.skipActiveChat", title: "Skip Open Chat", defaultValue: true },
      ], MessageCircle),
      option("billing", "Billing Notifications", "Bill creation, payment, and update alerts", [{ type: "toggle", key: "notify.billing.enabled", title: "Enable Billing Alerts", defaultValue: true }], ReceiptText),
      option("work-tasks", "Work Task Notifications", "Task assignment and status alerts", [{ type: "toggle", key: "notify.work.enabled", title: "Enable Work Alerts", defaultValue: true }], BriefcaseBusiness),
      option("tool-rent", "Tool Rent Notifications", "Rental, payment, and return alerts", [{ type: "toggle", key: "notify.toolRent.enabled", title: "Enable Rental Alerts", defaultValue: true }], Wrench),
      option("reminders", "Reminder Notifications", "Due and overdue reminder behavior", [{ type: "toggle", key: "notify.reminders.enabled", title: "Enable Reminders", defaultValue: true }], Clock),
      option("quiet-hours", "Quiet Hours", "Mute non-urgent alerts during selected hours", [
        { type: "toggle", key: "quiet.enabled", title: "Enable Quiet Hours", defaultValue: false },
        { type: "select", key: "quiet.start", title: "Start", defaultValue: "10 PM", options: ["8 PM", "9 PM", "10 PM", "11 PM"] },
        { type: "select", key: "quiet.end", title: "End", defaultValue: "7 AM", options: ["6 AM", "7 AM", "8 AM", "9 AM"] },
      ], Moon),
    ],
  },
  {
    id: "security",
    title: "Security",
    description: "Manage sessions, devices, access, and secret keys",
    icon: Shield,
    children: [
      option("devices", "Active Devices", "Current allowed devices and FCM sessions", [{ type: "action", key: "devices.review", title: "Review Active Device", label: "Check device" }], Smartphone),
      option("sessions", "Login Sessions", "Session timeout and current login behavior", [{ type: "number", key: "sessions.timeout", title: "Session Timeout", defaultValue: 30, suffix: "days" }], Clock),
      option("device-management", "Device Management", "Allowed device count and auto logout rules", [
        { type: "select", key: "devices.allowed", title: "Allowed Devices", defaultValue: "1", options: ["1", "2"] },
        { type: "toggle", key: "devices.autoLogout", title: "Auto Logout Old Devices", defaultValue: true },
      ], Smartphone),
      option("change-password", "Change Password", "Password management placeholder", [{ type: "action", key: "password.change", title: "Change Password", label: "Change" }], KeyRound),
      { id: "admin-secret-key", title: "Admin Secret Key", description: "Regenerate the admin secret key", icon: KeyRound, componentKey: "security", roles: ["admin", "super_admin"] },
      option("api-access", "API Access", "API keys and integration access", [{ type: "toggle", key: "api.enabled", title: "Allow API Access", defaultValue: false }], KeyRound, ["admin", "super_admin"]),
      option("logout-all", "Logout From All Devices", "Force all sessions to sign in again", [{ type: "action", key: "sessions.logoutAll", title: "Logout From This Device", label: "Logout" }], Shield),
    ],
  },
  {
    id: "chat",
    title: "Chat Settings",
    description: "Message preview, receipts, media, and retention",
    icon: MessageCircle,
    children: [
      option("message-preview", "Message Preview", "Show text previews in notifications", [{ type: "toggle", key: "chat.preview", title: "Show Preview", defaultValue: true }]),
      option("read-receipts", "Read Receipts", "Show read status in chat", [{ type: "toggle", key: "chat.readReceipts", title: "Read Receipts", defaultValue: true }]),
      option("typing-indicators", "Typing Indicators", "Show typing status", [{ type: "toggle", key: "chat.typing", title: "Typing Indicators", defaultValue: true }]),
      option("media-download", "Media Auto Download", "Control image, video, and file downloads", [
        { type: "toggle", key: "chat.media.images", title: "Images", defaultValue: true },
        { type: "toggle", key: "chat.media.video", title: "Videos", defaultValue: false },
        { type: "toggle", key: "chat.media.files", title: "Files", defaultValue: false },
      ], Download),
      option("backup", "Chat Backup", "Backup and restore chat data", [{ type: "action", key: "chat.backup", title: "Create Backup", label: "Back up" }], Upload),
      option("archive", "Archive Settings", "Archive rules for old conversations", [{ type: "select", key: "chat.archiveAfter", title: "Archive After", defaultValue: "Never", options: ["Never", "30 days", "90 days", "1 year"] }]),
      option("notification-rules", "Notification Rules", "Rules for chat notification delivery", [{ type: "toggle", key: "chat.rules.skipForegroundSystem", title: "No System Notification In Foreground", defaultValue: true }]),
      option("retention", "Message Retention", "How long messages are retained", [{ type: "select", key: "chat.retention", title: "Keep Messages", defaultValue: "Forever", options: ["90 days", "1 year", "Forever"] }], History),
    ],
  },
  {
    id: "billing",
    title: "Billing Settings",
    description: "Default charges, invoice rules, payments, and templates",
    icon: ReceiptText,
    roles: ["admin", "super_admin", "technician"],
    children: [
      { id: "service-fees", title: "Default Service Fees", description: "Home visit and repair fee defaults", icon: IndianRupee, componentKey: "billingDefaults" },
      option("home-visit", "Home Visit Charges", "Default home visit charges", [{ type: "number", key: "billing.homeVisit", title: "Home Visit Charge", defaultValue: 0, suffix: "Rs" }], IndianRupee),
      option("repair", "Repair Charges", "Default repair charges", [{ type: "number", key: "billing.repair", title: "Repair Charge", defaultValue: 0, suffix: "Rs" }], IndianRupee),
      option("tax", "Tax Configuration", "Tax and discount behavior", [{ type: "number", key: "billing.tax", title: "Default Tax", defaultValue: 0, suffix: "%" }], Calculator),
      option("invoice", "Invoice Settings", "Invoice numbering and display options", [{ type: "toggle", key: "billing.invoice.showLogo", title: "Show Logo", defaultValue: true }], FileText),
      option("payments", "Payment Methods", "Cash, online, and partial payment settings", [{ type: "toggle", key: "billing.payments.online", title: "Online Payments", defaultValue: true }], CreditCard),
      option("auto-upload", "Auto Upload", "Offline billing upload behavior", [{ type: "toggle", key: "billing.autoUpload", title: "Auto Upload When Online", defaultValue: true }], Upload),
      option("templates", "Billing Templates", "Default message and invoice templates", [{ type: "action", key: "billing.templates.edit", title: "Edit Templates", label: "Open" }]),
    ],
  },
  {
    id: "work-management",
    title: "Work Management",
    description: "Task defaults, reminders, assignment rules, and categories",
    icon: BriefcaseBusiness,
    children: [
      option("task-defaults", "Task Defaults", "Priority and due date defaults", [{ type: "select", key: "work.priority", title: "Default Priority", defaultValue: "medium", options: ["low", "medium", "high", "urgent"] }], Settings, ["admin", "super_admin", "technician"]),
      option("task-notifications", "Task Notifications", "Task alert rules", [{ type: "toggle", key: "work.notifications", title: "Enable Task Alerts", defaultValue: true }]),
      option("reminder-rules", "Reminder Rules", "Task reminder schedule", [{ type: "select", key: "work.reminderBefore", title: "Remind Before", defaultValue: "1 hour", options: ["30 min", "1 hour", "1 day"] }], Clock),
      option("status-workflow", "Status Workflow", "Pending, hold, completed and cancelled rules", [{ type: "toggle", key: "work.workflow.hold", title: "Allow Hold Status", defaultValue: true }], Settings, ["admin", "super_admin", "technician"]),
      option("assignment-rules", "Assignment Rules", "Technician assignment behavior", [{ type: "toggle", key: "work.autoAssign", title: "Auto Assign", defaultValue: false }], Settings, ["admin", "super_admin", "technician"]),
      option("categories", "Work Categories", "Repair, fitting, wiring, and other categories", [{ type: "action", key: "work.categories", title: "Manage Categories", label: "Manage" }], Settings, ["admin", "super_admin", "technician"]),
    ],
  },
  {
    id: "tool-rental",
    title: "Tool Rental",
    description: "Rental rules, deposits, overdue rules, and payments",
    icon: Wrench,
    children: [
      option("rental-rules", "Rental Rules", "Rental duration and issue behavior", [{ type: "select", key: "rent.defaultDuration", title: "Default Duration", defaultValue: "1 day", options: ["1 hour", "1 day", "7 days"] }], Settings, ["admin", "super_admin", "technician"]),
      option("deposit", "Deposit Settings", "Deposit defaults and requirements", [{ type: "toggle", key: "rent.deposit.required", title: "Require Deposit", defaultValue: false }], Settings, ["admin", "super_admin", "technician"]),
      option("overdue", "Overdue Rules", "Late return and extra charge behavior", [{ type: "toggle", key: "rent.overdue.extraCharge", title: "Apply Extra Charge", defaultValue: true }], Settings, ["admin", "super_admin", "technician"]),
      option("return", "Return Settings", "Return workflow settings", [{ type: "toggle", key: "rent.return.autoBill", title: "Create Bill For Outstanding Amount", defaultValue: true }], Settings, ["admin", "super_admin", "technician"]),
      option("notifications", "Rental Notifications", "Customer/admin rental notification rules", [{ type: "toggle", key: "rent.notifications", title: "Enable Rental Notifications", defaultValue: true }]),
      option("payments", "Payment Rules", "Partial and final payment behavior", [{ type: "toggle", key: "rent.payments.partial", title: "Allow Partial Payments", defaultValue: true }], Settings, ["admin", "super_admin", "technician"]),
    ],
  },
  {
    id: "pricing-rates",
    title: "Pricing & Rates",
    description: "Wiring, fitting, service charges, and calculators",
    icon: IndianRupee,
    roles: ["admin", "super_admin", "technician"],
    children: [
      { id: "wiring-rates", title: "Wiring Rates", description: "Default wiring rate values", icon: Calculator, componentKey: "fittingRates" },
      { id: "fitting-rates", title: "Fitting Rates", description: "Calculator rates for fitting work", icon: Calculator, componentKey: "fittingRates" },
      option("service-charges", "Service Charges", "Default service charge rules", [{ type: "number", key: "pricing.serviceCharge", title: "Service Charge", defaultValue: 0, suffix: "Rs" }]),
      option("custom-pricing", "Custom Pricing", "Overrides and custom pricing behavior", [{ type: "toggle", key: "pricing.custom", title: "Allow Custom Pricing", defaultValue: true }]),
      option("calculator", "Calculator Settings", "Estimator and calculator defaults", [{ type: "toggle", key: "pricing.calculator.round", title: "Round Calculator Totals", defaultValue: true }]),
    ],
  },
  {
    id: "appearance",
    title: "Appearance",
    description: "Theme, language, density, and display preferences",
    icon: Palette,
    children: [
      option("theme", "Theme", "App color theme", [{ type: "select", key: "appearance.theme", title: "Theme", defaultValue: "System", options: ["System", "Dark", "Light"] }], Palette),
      option("dark-mode", "Dark Mode", "Dark interface preference", [{ type: "toggle", key: "appearance.dark", title: "Dark Mode", defaultValue: true }], Moon),
      option("font-size", "Font Size", "Text size across the app", [{ type: "select", key: "appearance.fontSize", title: "Font Size", defaultValue: "Default", options: ["Small", "Default", "Large"] }]),
      option("density", "Layout Density", "Compact or comfortable layouts", [{ type: "select", key: "appearance.density", title: "Density", defaultValue: "Comfortable", options: ["Compact", "Comfortable", "Spacious"] }]),
      option("language", "Language", "App language", [{ type: "select", key: "appearance.language", title: "Language", defaultValue: "English", options: ["English", "Hindi", "Urdu"] }]),
    ],
  },
  {
    id: "data-storage",
    title: "Data & Storage",
    description: "Offline data, cache, backup, export, and import",
    icon: Database,
    children: [
      option("offline", "Offline Storage", "Offline-first behavior and queued records", [{ type: "toggle", key: "storage.offline", title: "Enable Offline Storage", defaultValue: true }]),
      option("cache", "Cache Management", "Clear local cache and stale data", [{ type: "action", key: "storage.cache.clear", title: "Clear Cache", label: "Clear" }]),
      option("usage", "Storage Usage", "View local storage usage", [{ type: "action", key: "storage.usage", title: "Calculate Usage", label: "Check" }]),
      option("backup", "Backup", "Backup local app data", [{ type: "action", key: "storage.backup", title: "Create Backup", label: "Back up" }]),
      option("export", "Export Data", "Export business data", [{ type: "action", key: "storage.export", title: "Export Data", label: "Export" }], Download),
      option("import", "Import Data", "Import supported data files", [{ type: "action", key: "storage.import", title: "Import Data", label: "Import" }], Upload),
    ],
  },
  {
    id: "about",
    title: "About",
    description: "Version, release notes, policies, support, and system info",
    icon: Info,
    children: [
      { id: "version", title: "Version", description: "Current app version", icon: Info, componentKey: "version" },
      option("release-notes", "Release Notes", "What changed recently", [{ type: "action", key: "about.releaseNotes", title: "Release Notes", label: "Open" }]),
      option("support", "Contact Support", "Get help with the app", [{ type: "action", key: "about.support", title: "Contact Support", label: "Contact" }], MessageCircle),
      option("system", "System Information", "Browser, PWA, and notification state", [{ type: "action", key: "about.system", title: "System Information", label: "Inspect" }], Smartphone),
    ],
  },
  {
    id: "shortcuts",
    title: "Shortcuts",
    description: "Frequently used admin settings and tools",
    icon: Star,
    componentKey: "shortcuts",
    roles: ["admin", "super_admin", "technician"],
  },
];

export function flattenSettings(nodes = settingsTree, parentPath: string[] = []): Array<{ node: SettingNode; path: string[] }> {
  return nodes.flatMap((node) => {
    const path = [...parentPath, node.id];
    return [{ node, path }, ...flattenSettings(node.children || [], path)];
  });
}

export function findSetting(path: string[], nodes: SettingNode[] = settingsTree) {
  let found: SettingNode | undefined;
  for (const part of path) {
    found = nodes.find((node) => node.id === part);
    if (!found) return undefined;
    nodes = found.children || [];
  }
  return found;
}

export function settingBreadcrumbs(path: string[], rootNodes: SettingNode[] = settingsTree) {
  const crumbs: Array<{ title: string; path: string[] }> = [];
  let nodes = rootNodes;
  const walked: string[] = [];
  for (const part of path) {
    const node = nodes.find((item) => item.id === part);
    if (!node) break;
    walked.push(part);
    crumbs.push({ title: node.title, path: [...walked] });
    nodes = node.children || [];
  }
  return crumbs;
}
