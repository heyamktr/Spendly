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
  return (
    <label className="block min-w-0 lg:w-[28rem]">
      <span className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
        Messenger user
      </span>
      <select
        value={selectedUserId ?? ""}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={isDisabled || isLoading}
        className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
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
  );
}
