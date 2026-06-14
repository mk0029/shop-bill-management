"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp, Clock, RotateCcw, Search, Star } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import AdminBillingDefaultsSection from "@/components/settings/AdminBillingDefaultsSection";
import AdminFittingRatesSection from "@/components/settings/AdminFittingRatesSection";
import AdminNotificationsSection from "@/components/settings/AdminNotificationsSection";
import AdminSecuritySection from "@/components/settings/AdminSecuritySection";
import AdminShortcutsSection from "@/components/settings/AdminShortcutsSection";
import PersonalInformationSection from "@/components/settings/PersonalInformationSection";
import CustomerSettingsClient from "@/components/customer/customer-settings-client";
import { getDeviceInfo } from "@/lib/fcm/device";
import { APP_VERSION } from "@/lib/app-version";
import { setNotificationTone } from "@/lib/notification-sound";
import { useAuthStore } from "@/store/auth-store";
import { SettingsCategory, SettingsOption, SettingsSection } from "@/components/settings/SettingsRows";
import {
  findSetting,
  flattenSettings,
  settingBreadcrumbs,
  settingsTree,
  type SettingControl,
  type SettingNode,
} from "@/lib/settings/settings-config";

const FAVORITES_KEY = "settings:favorites";
const RECENT_KEY = "settings:recent";
const VALUES_KEY = "settings:values";
const HISTORY_KEY = "settings:history";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || "") as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function fullPath(path: string[]) {
  return path.join("/");
}

function hrefFor(basePath: string, path: string[]) {
  return `${basePath}/${path.map(encodeURIComponent).join("/")}`;
}

function defaultValue(control: SettingControl) {
  if (control.type === "toggle") return control.defaultValue ?? false;
  if (control.type === "number") return control.defaultValue ?? 0;
  if (control.type === "select") return control.defaultValue ?? control.options[0] ?? "";
  return "";
}

function valueLabel(control: SettingControl, value: unknown) {
  if (control.type === "toggle") return Boolean(value) ? "Enabled" : "Disabled";
  if (control.type === "number") return `${Number(value || 0)}${control.suffix ? ` ${control.suffix}` : ""}`;
  if (control.type === "select") return String(value ?? "");
  if (typeof value === "string" && value) return "Last used";
  return "Ready";
}

function describeControl(control: SettingControl, value: unknown, changed: boolean) {
  const status = valueLabel(control, value);
  return `${control.title}: ${status}${changed ? " (changed)" : " (default)"}`;
}

function findControlByKey(nodes: SettingNode[], key: string): { control: SettingControl; path: string[] } | null {
  for (const item of flattenSettings(nodes)) {
    const control = item.node.controls?.find((candidate) => candidate.key === key);
    if (control) return { control, path: item.path };
  }
  return null;
}

function categoryStatus(node: SettingNode, values: Record<string, unknown>) {
  const controls = flattenSettings([node]).flatMap((item) => item.node.controls || []);
  if (!controls.length) return "";
  const changed = controls.filter((control) => Object.prototype.hasOwnProperty.call(values, control.key));
  if (!changed.length) return `${controls.length} settings at default`;
  return `${changed.length} of ${controls.length} settings changed`;
}

function DetailComponent({ keyName }: { keyName: NonNullable<SettingNode["componentKey"]> }) {
  if (keyName === "profile") return <PersonalInformationSection mode="profile" />;
  if (keyName === "password") return <PersonalInformationSection mode="password" />;
  if (keyName === "version") {
    return (
      <SettingsSection title="Current Version">
        <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-4">
          <div>
            <div className="text-sm font-semibold text-slate-100">Jambh Electric</div>
            <div className="mt-1 text-xs text-slate-400">Installed app version</div>
          </div>
          <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-sm font-semibold text-blue-200">
            v{APP_VERSION}
          </span>
        </div>
      </SettingsSection>
    );
  }
  if (keyName === "notifications") return <AdminNotificationsSection />;
  if (keyName === "security") return <AdminSecuritySection />;
  if (keyName === "billingDefaults") return <AdminBillingDefaultsSection />;
  if (keyName === "fittingRates") return <AdminFittingRatesSection />;
  if (keyName === "shortcuts") return <AdminShortcutsSection />;
  return null;
}

function filterForRole(nodes: SettingNode[], role?: string): SettingNode[] {
  const activeRole = role || "admin";
  return nodes
    .filter((node) => {
      if (!node.roles?.length) return true;
      return node.roles.includes(activeRole as "admin" | "super_admin" | "technician" | "customer");
    })
    .map((node) => ({ ...node, children: node.children ? filterForRole(node.children, role) : undefined }))
    .filter((node) => node.componentKey || node.controls?.length || node.children?.length);
}

function SettingControlRow({
  control,
  value,
  changed,
  onChange,
  onAction,
}: {
  control: SettingControl;
  value: unknown;
  changed: boolean;
  onChange: (value: unknown) => void;
  onAction: (control: Extract<SettingControl, { type: "action" }>) => void;
}) {
  const status = valueLabel(control, value);
  const StatusBadge = (
    <span
      className={`whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-medium ${
        changed
          ? "border-blue-500/40 bg-blue-500/10 text-blue-200"
          : "border-slate-700 bg-slate-900 text-slate-400"
      }`}
      title={changed ? "Changed from default" : "Current default value"}
    >
      {status}
    </span>
  );

  if (control.type === "toggle") {
    return (
      <SettingsOption title={control.title} description={control.description}>
        <div className="flex items-center gap-3">
          {StatusBadge}
          <Switch checked={Boolean(value)} onCheckedChange={onChange} />
        </div>
      </SettingsOption>
    );
  }
  if (control.type === "number") {
    return (
      <SettingsOption title={control.title} description={control.description}>
        <div className="flex items-center gap-2">
          {StatusBadge}
          <Input
            inputMode="numeric"
            className="h-9 w-24 border-slate-700 bg-slate-900 text-right text-white"
            value={Number(value || 0)}
            onChange={(event) => onChange(Number(event.target.value) || 0)}
          />
          {control.suffix && <span className="text-xs text-slate-400">{control.suffix}</span>}
        </div>
      </SettingsOption>
    );
  }
  if (control.type === "select") {
    return (
      <SettingsOption title={control.title} description={control.description}>
        <div className="flex items-center gap-2">
          {StatusBadge}
          <select
            className="h-9 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-white"
            value={String(value ?? "")}
            onChange={(event) => onChange(event.target.value)}
          >
            {control.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </SettingsOption>
    );
  }
  return (
    <SettingsOption title={control.title} description={control.description}>
      <div className="flex items-center gap-2">
        {StatusBadge}
        <button
          type="button"
          onClick={() => onAction(control)}
          className="rounded-md border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
        >
          {control.label || "Run"}
        </button>
      </div>
    </SettingsOption>
  );
}

export default function SettingsBrowser({
  slug = [],
  basePath = "/admin/settings",
  role,
  customerUserId,
}: {
  slug?: string[];
  basePath?: string;
  role?: string;
  customerUserId?: string | null;
}) {
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [actionOutput, setActionOutput] = useState<string>("");
  const [recentExpanded, setRecentExpanded] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const tree = useMemo(() => filterForRole(settingsTree, role), [role]);
  const all = useMemo(() => flattenSettings(tree), [tree]);
  const node = slug.length ? all.find((item) => fullPath(item.path) === fullPath(slug))?.node : undefined;
  const crumbs = settingBreadcrumbs(slug, tree);

  const visibleHome = tree;
  const children = node?.children || [];
  const currentPath = fullPath(slug);
  const isFavorite = favorites.includes(currentPath);
  const recentDetails = useMemo(() => {
    return recent.flatMap((item) => {
      const key = item.replace(/\s+changed$/, "");
      const found = findControlByKey(tree, key);
      if (!found) return [];
      const value = values[key] ?? defaultValue(found.control);
      return {
        key,
        title: found.control.title,
        description: describeControl(found.control, value, Object.prototype.hasOwnProperty.call(values, key)),
        href: hrefFor(basePath, found.path),
      };
    });
  }, [basePath, recent, tree, values]);
  const visibleRecentDetails = recentExpanded ? recentDetails : recentDetails.slice(0, 4);

  useEffect(() => {
    setFavorites(readJson<string[]>(FAVORITES_KEY, []));
    setRecent(readJson<string[]>(RECENT_KEY, []));
    setValues(readJson<Record<string, unknown>>(VALUES_KEY, {}));
  }, []);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return all.filter(({ node }) => `${node.title} ${node.description}`.toLowerCase().includes(q)).slice(0, 30);
  }, [all, query]);

  const toggleFavorite = (path: string) => {
    const next = favorites.includes(path) ? favorites.filter((item) => item !== path) : [path, ...favorites].slice(0, 20);
    setFavorites(next);
    writeJson(FAVORITES_KEY, next);
  };

  const recordChange = (key: string, value: unknown) => {
    if (key === "sound.tone") {
      setNotificationTone(String(value || "Default"));
    }
    const nextValues = { ...values, [key]: value };
    setValues(nextValues);
    writeJson(VALUES_KEY, nextValues);
    const entry = `${key} changed`;
    const nextRecent = [entry, ...recent.filter((item) => item !== entry)].slice(0, 10);
    setRecent(nextRecent);
    writeJson(RECENT_KEY, nextRecent);
    const history = readJson<Array<{ key: string; value: unknown; at: string }>>(HISTORY_KEY, []);
    writeJson(HISTORY_KEY, [{ key, value, at: new Date().toISOString() }, ...history].slice(0, 50));
    toast.success("Setting saved");
  };

  const recordAction = (key: string, label: string, output?: string) => {
    recordChange(key, new Date().toISOString());
    setActionOutput(output || `${label} completed`);
  };

  const runAction = async (control: Extract<SettingControl, { type: "action" }>) => {
    if (control.href) {
      router.push(control.href);
      return;
    }

    if (control.key === "devices.review") {
      const device = getDeviceInfo();
      const userId = String(authUser?.id || authUser?._id || authUser?.customerId || "");
      let statusText = `${device.deviceName || "This device"} is registered locally.`;
      if (userId && device.deviceId) {
        try {
          const response = await fetch("/api/notifications/device-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, deviceId: device.deviceId }),
          });
          const json = await response.json();
          if (json?.success) {
            statusText = json.active === false
              ? `${device.deviceName || "This device"} is inactive.`
              : `${device.deviceName || "This device"} is active.`;
          }
        } catch {}
      }
      toast.success("Device status checked");
      recordAction(control.key, control.title, statusText);
      return;
    }

    if (control.key === "sessions.logoutAll") {
      logout();
      toast.success("Logged out from this device");
      router.push("/");
      return;
    }

    if (control.key === "storage.cache.clear") {
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
      recordAction(control.key, control.title, "Browser cache cleared");
      toast.success("Browser cache cleared");
      return;
    }

    if (control.key === "storage.usage") {
      const localBytes = Object.keys(localStorage).reduce((total, key) => {
        const value = localStorage.getItem(key) || "";
        return total + key.length + value.length;
      }, 0);
      const estimate = navigator.storage?.estimate ? await navigator.storage.estimate() : null;
      const used = estimate?.usage ? `${(estimate.usage / 1024 / 1024).toFixed(2)} MB` : `${(localBytes / 1024).toFixed(1)} KB`;
      recordAction(control.key, control.title, `Estimated browser storage used: ${used}`);
      return;
    }

    if (control.key === "storage.backup" || control.key === "storage.export") {
      const payload = {
        exportedAt: new Date().toISOString(),
        values,
        favorites,
        recent,
        userAgent: navigator.userAgent,
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `settings-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      recordAction(control.key, control.title, "Settings backup downloaded");
      return;
    }

    if (control.key === "storage.import") {
      importInputRef.current?.click();
      return;
    }

    if (control.key === "about.system") {
      const permission = typeof Notification === "undefined" ? "unsupported" : Notification.permission;
      const device = getDeviceInfo();
      recordAction(control.key, control.title, `${device.deviceName}. Notifications: ${permission}. PWA: ${window.matchMedia("(display-mode: standalone)").matches ? "installed" : "browser"}.`);
      return;
    }

    if (control.key === "about.support") {
      router.push(role === "customer" ? "/customer/chat" : "/admin/chat");
      return;
    }

    if (control.key === "chat.backup") {
      router.push(role === "customer" ? "/customer/chat" : "/admin/chat");
      return;
    }

    if (control.key === "work.categories") {
      router.push("/admin/specifications");
      return;
    }

    if (control.key === "billing.templates.edit") {
      router.push("/admin/billing");
      return;
    }

    if (control.key === "about.releaseNotes") {
      recordAction(control.key, control.title, `${control.title} is available as an internal settings page.`);
      return;
    }

    recordAction(control.key, control.title);
  };

  const importSettings = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as { values?: Record<string, unknown>; favorites?: string[]; recent?: string[] };
      if (parsed.values && typeof parsed.values === "object") {
        setValues(parsed.values);
        writeJson(VALUES_KEY, parsed.values);
      }
      if (Array.isArray(parsed.favorites)) {
        setFavorites(parsed.favorites);
        writeJson(FAVORITES_KEY, parsed.favorites);
      }
      if (Array.isArray(parsed.recent)) {
        setRecent(parsed.recent);
        writeJson(RECENT_KEY, parsed.recent);
      }
      toast.success("Settings imported");
      setActionOutput("Settings import completed");
    } catch {
      toast.error("Invalid settings backup file");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const resetNode = () => {
    const keys = (node?.controls || []).map((control) => control.key);
    if (!keys.length) {
      toast.info("This screen does not have local defaults to reset.");
      return;
    }
    const next = { ...values };
    for (const key of keys) delete next[key];
    setValues(next);
    writeJson(VALUES_KEY, next);
    toast.success("Settings reset to default");
  };

  const pageTitle = node?.title || "Settings";
  const pageDescription = node?.description || "Manage app behavior, security, notifications, billing, and data.";

  if (slug.length && !node) {
    return (
      <div className="mx-auto max-w-3xl px-0 py-4 sm:px-6">
        <button type="button" onClick={() => router.back()} className="mb-4 flex items-center gap-2 px-4 text-sm text-slate-300">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <SettingsSection>
          <div className="px-4 py-8 text-center">
            <div className="text-lg font-semibold text-white">Setting not found</div>
            <Link href={basePath} className="mt-3 inline-block text-sm text-blue-300">Return to Settings</Link>
          </div>
        </SettingsSection>
      </div>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl bg-slate-950 pb-8 text-white sm:bg-transparent sm:px-6 sm:py-6">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur sm:static sm:mb-4 sm:rounded-lg sm:border">
        <div className="flex items-center gap-3">
          {slug.length ? (
            <button type="button" onClick={() => router.back()} className="grid h-10 w-10 place-items-center rounded-md hover:bg-slate-900">
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{pageTitle}</h1>
            <p className="mt-0.5 text-xs leading-5 text-slate-400">{pageDescription}</p>
          </div>
          {slug.length ? (
            <button
              type="button"
              onClick={() => toggleFavorite(currentPath)}
              className="grid h-10 w-10 place-items-center rounded-md hover:bg-slate-900"
              aria-label="Pin setting"
            >
              <Star className={`h-5 w-5 ${isFavorite ? "fill-amber-300 text-amber-300" : "text-slate-400"}`} />
            </button>
          ) : null}
        </div>
        {crumbs.length ? (
          <nav className="mt-3 flex flex-wrap items-center gap-1 text-xs text-slate-400">
            <Link href={basePath} className="text-blue-300">Settings</Link>
            {crumbs.map((crumb) => (
              <span key={crumb.path.join("/")} className="flex items-center gap-1">
                <span>/</span>
                <Link href={hrefFor(basePath, crumb.path)} className="hover:text-blue-300">{crumb.title}</Link>
              </span>
            ))}
          </nav>
        ) : null}
        <div className="mt-3 flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-3">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search settings"
            className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
          />
        </div>
      </header>

      <div className="space-y-4 sm:space-y-5">
        {query.trim() ? (
          <SettingsSection title="Search Results">
            {searchResults.length ? searchResults.map(({ node, path }) => (
              <SettingsCategory key={path.join("/")} node={node} href={hrefFor(basePath, path)} />
            )) : <div className="px-4 py-6 text-sm text-slate-400">No settings found.</div>}
          </SettingsSection>
        ) : null}

        {!slug.length && !query.trim() ? (
          <>
            {favorites.length ? (
              <SettingsSection title="Pinned Settings">
                {favorites.map((path) => {
                  const parts = path.split("/").filter(Boolean);
                  const favNode = findSetting(parts, tree);
                  return favNode ? (
                    <SettingsCategory key={path} node={favNode} href={hrefFor(basePath, parts)} favorite onToggleFavorite={() => toggleFavorite(path)} />
                  ) : null;
                })}
              </SettingsSection>
            ) : null}
            {recentDetails.length ? (
              <SettingsSection
                title="Recently Changed"
                action={
                  recentDetails.length > 4 ? (
                    <button
                      type="button"
                      onClick={() => setRecentExpanded((current) => !current)}
                      className="flex items-center gap-1 text-xs font-medium text-blue-300 hover:text-blue-200"
                    >
                      {recentExpanded ? "Show less" : `Show all ${recentDetails.length}`}
                      {recentExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  ) : null
                }
              >
                {visibleRecentDetails.map((item) => (
                  <Link key={item.key} href={item.href} className="flex min-h-14 items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-900">
                    <Clock className="h-4 w-4 shrink-0 text-slate-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-slate-100">{item.title}</span>
                      <span className="mt-0.5 block text-xs text-slate-400">{item.description}</span>
                    </span>
                  </Link>
                ))}
              </SettingsSection>
            ) : null}
            <SettingsSection title="Categories">
              {visibleHome.map((item) => (
                <SettingsCategory key={item.id} node={item} href={hrefFor(basePath, [item.id])} status={categoryStatus(item, values)} />
              ))}
            </SettingsSection>
          </>
        ) : null}

        {slug.length && !query.trim() ? (
          <>
            {children.length ? (
              <SettingsSection title="Options">
                {children.map((child) => {
                  const path = [...slug, child.id];
                  const pathKey = fullPath(path);
                  return (
                    <SettingsCategory
                      key={child.id}
                      node={child}
                      href={hrefFor(basePath, path)}
                      favorite={favorites.includes(pathKey)}
                      onToggleFavorite={() => toggleFavorite(pathKey)}
                    />
                  );
                })}
              </SettingsSection>
            ) : null}

            {node?.componentKey && !(role === "customer" && node.componentKey === "notifications") ? (
              <div className="px-4 sm:px-0">
                <DetailComponent keyName={node.componentKey} />
              </div>
            ) : null}

            {role === "customer" && slug[0] === "notifications" && (slug.length === 1 || slug[1] === "in-app" || slug[1] === "push") ? (
              <div className="px-4 sm:px-0">
                <CustomerSettingsClient userId={customerUserId || null} />
              </div>
            ) : null}

            {node?.controls?.length ? (
              <SettingsSection
                title="Configuration"
                action={
                  <button type="button" onClick={resetNode} className="flex items-center gap-1 text-xs text-slate-300 hover:text-white">
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </button>
                }
              >
                {node.controls.map((control) => (
                  <SettingControlRow
                    key={control.key}
                    control={control}
                    value={values[control.key] ?? defaultValue(control)}
                    changed={Object.prototype.hasOwnProperty.call(values, control.key)}
                    onChange={(value) => recordChange(control.key, value)}
                    onAction={runAction}
                  />
                ))}
              </SettingsSection>
            ) : null}

            {actionOutput ? (
              <SettingsSection title="Result">
                <div className="px-4 py-4 text-sm text-slate-300">{actionOutput}</div>
              </SettingsSection>
            ) : null}
          </>
        ) : null}
      </div>
      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => importSettings(event.target.files?.[0])}
      />
    </main>
  );
}
