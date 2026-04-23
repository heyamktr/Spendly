import type { UserListItem } from "@/lib/api";
import { getUserLabel } from "@/lib/api";
import {
  AnalyticsIcon,
  CategoriesIcon,
  ChevronIcon,
  DashboardIcon,
  SettingsIcon,
  SidebarToggleIcon,
} from "@/components/icons";

type SpendlySidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  selectedUser: UserListItem | null;
};

const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    active: true,
    icon: DashboardIcon,
  },
  {
    id: "analytics",
    label: "Analytics",
    active: false,
    icon: AnalyticsIcon,
  },
  {
    id: "categories",
    label: "Categories",
    active: false,
    icon: CategoriesIcon,
  },
  {
    id: "settings",
    label: "Settings",
    active: false,
    icon: SettingsIcon,
  },
] as const;

export function SpendlySidebar({
  collapsed,
  onToggleCollapsed,
  selectedUser,
}: SpendlySidebarProps) {
  return (
    <aside
      className={`hidden min-h-screen shrink-0 border-r border-[var(--border-subtle)] bg-[var(--sidebar-bg)]/90 px-4 py-5 backdrop-blur xl:flex xl:flex-col xl:transition-[width,padding] xl:duration-300 ${
        collapsed ? "xl:w-[92px]" : "xl:w-[280px]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-gradient)] text-white shadow-[0_16px_32px_rgba(16,185,129,0.18)]">
            <span className="text-lg font-semibold">S</span>
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                Spendly
              </p>
              <p className="truncate text-xs text-[var(--text-tertiary)]">
                Fintech command center
              </p>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <SidebarToggleIcon className="h-4 w-4" />
        </button>
      </div>

      <nav className="mt-10 space-y-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                item.active
                  ? "bg-[var(--sidebar-active-bg)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  item.active
                    ? "bg-[var(--accent-soft)] text-[var(--accent-primary)]"
                    : "bg-transparent"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>

              {!collapsed ? (
                <>
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  <ChevronIcon className="h-4 w-4 opacity-40 transition group-hover:translate-x-0.5" />
                </>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/90 p-3 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent-primary)]">
              {selectedUser ? getUserInitials(selectedUser) : "AD"}
            </div>
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                  {selectedUser ? getUserLabel(selectedUser) : "Spendly operator"}
                </p>
                <p className="truncate text-xs text-[var(--text-tertiary)]">
                  {selectedUser ? "Live Messenger profile" : "Dashboard workspace"}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}

function getUserInitials(user: UserListItem): string {
  const label = user.display_name?.trim() || user.messenger_psid;

  return label
    .split(/\s+/)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join("");
}
