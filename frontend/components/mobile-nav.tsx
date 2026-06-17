"use client";

import { AnalyticsIcon, CategoriesIcon, DashboardIcon, SettingsIcon } from "@/components/icons";
import type { AppSection } from "@/components/spendly-sidebar";

type MobileNavProps = {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
};

const NAV_ITEMS: ReadonlyArray<{
  id: AppSection;
  label: string;
  icon: typeof DashboardIcon;
}> = [
  { id: "dashboard", label: "Dashboard", icon: DashboardIcon },
  { id: "analytics", label: "Analytics", icon: AnalyticsIcon },
  { id: "categories", label: "Categories", icon: CategoriesIcon },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export function MobileNav({ activeSection, onSelectSection }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--app-bg)_92%,transparent)] px-2 pb-safe backdrop-blur xl:hidden">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeSection;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 px-2 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
                active
                  ? "text-[var(--accent-primary)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-2xl transition ${
                  active ? "bg-[var(--accent-soft)]" : ""
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
