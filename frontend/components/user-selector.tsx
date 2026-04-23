import { getUserLabel, type UserListItem } from "@/lib/api";

type UserSelectorProps = {
  users: UserListItem[];
  selectedUserId: number | null;
  onChange: (userId: number) => void;
  isLoading: boolean;
  isDisabled: boolean;
};

export function UserSelector({
  users,
  selectedUserId,
  onChange,
  isLoading,
  isDisabled,
}: UserSelectorProps) {
  const selectedUser =
    users.find((user) => user.id === selectedUserId) ?? users[0] ?? null;

  return (
    <section className="surface-panel card-entrance p-5 [animation-delay:80ms]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            Active profile
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            Messenger workspace selector
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Switch between live Messenger users without leaving the dashboard.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MetricChip label="Users" value={String(users.length)} />
          <MetricChip
            label="Selected"
            value={selectedUser ? (selectedUser.display_name?.trim() || "Live profile") : "None"}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <label className="block min-w-0">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            Messenger user
          </span>
          <select
            value={selectedUserId ?? ""}
            onChange={(event) => onChange(Number(event.target.value))}
            disabled={isDisabled || isLoading}
            className="h-14 w-full rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_4px_var(--accent-ring)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {!users.length ? (
              <option value="">No users available</option>
            ) : null}

            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {getUserLabel(user)}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
            Live note
          </p>
          <p className="mt-2 max-w-xs leading-6">
            New expenses from the selected user will stream into the cards, chart,
            and activity feed automatically.
          </p>
        </div>
      </div>
    </section>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}
