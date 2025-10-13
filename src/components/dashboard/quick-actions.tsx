"use client";

import Link from "next/link";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ResponsiveAccordion from "@/components/ui/responsive-accordion";
import { CheckCircle, FileText, Users, Package } from "lucide-react";
import type { ReactElement } from "react";

export type QuickActionIcon = "file" | "users" | "package";

export interface QuickAction {
  iconName: QuickActionIcon;
  title: string;
  description: string;
  bg: string;
  hover: string;
  text: string;
  url: string;
}

export default function QuickActions({ actions = [] }: { actions: QuickAction[] }) {
  const iconMap: Record<QuickActionIcon, (props: { className?: string }) => ReactElement> = {
    file: (p) => <FileText {...p} />,
    users: (p) => <Users {...p} />,
    package: (p) => <Package {...p} />,
  };
  return (
    <ResponsiveAccordion
      defaultOpenMobile={true}
      removePX
      title={
        <CardHeader className="!p-0">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
      }
    >
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {actions.map((action, index) => {
            const Icon = iconMap[action.iconName] || ((p: { className?: string }) => <FileText {...p} />);
            return (
              <Link
                href={action.url}
                key={index}
                onClick={() => {
                  try {
                    if (action.url.startsWith("/admin/billing/create")) {
                      localStorage.setItem("bill_create_skip_restore", "1");
                    }
                  } catch {}
                }}
                aria-label={action.title}
                className={`w-full min-h-12 p-3 sm:p-4 rounded-lg transition-colors text-left flex items-center gap-x-4 md:block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/50 ring-offset-gray-900 ${action.bg} ${action.hover}`}
              >
                <Icon className="h-6 w-6 text-white mb-0.5 sm:mb-1 md:mb-2 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-white">{action.title}</h3>
                  <p className={`text-sm ${action.text}`}>{action.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </ResponsiveAccordion>
  );
}
