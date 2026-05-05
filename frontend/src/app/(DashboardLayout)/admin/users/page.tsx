"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Role = { value: string; label: string; permissions: string[] };
type User = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_superuser: boolean;
  role: string | null;
  permissions: string[];
};

const empty = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  password: "",
  role: "member",
  is_active: true,
};

export default function UsersPage() {
  const { hasPerm } = useAuth();
  const canManage = hasPerm("users.manage");
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    const [u, r] = await Promise.all([api.listUsers(), api.listRoles()]);
    setUsers(u.results || u);
    setRoles(r);
  };

  useEffect(() => {
    load().catch((e) => setErr(String(e)));
  }, []);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      if (editing.id) {
        const body: any = { ...editing };
        if (!body.password) delete body.password;
        await api.updateUser(editing.id, body);
      } else {
        await api.createUser(editing);
      }
      setEditing(null);
      await load();
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (u: User) => {
    if (!confirm(`Delete user ${u.username}?`)) return;
    await api.deleteUser(u.id);
    await load();
  };

  if (!canManage) {
    return (
      <div className="bg-background rounded-xl p-6">
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="text-link mt-2">You do not have permission to manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-link">
            Manage user accounts and role-based permissions.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...empty })}>+ New user</Button>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="bg-background rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-lightgray dark:bg-dark">
            <tr className="text-left">
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-3 font-medium">
                  {u.username}
                  {u.is_superuser && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded bg-secondary/20 text-secondary">
                      super
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{u.email || "—"}</td>
                <td className="px-4 py-3 capitalize">{u.role || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      u.is_active
                        ? "bg-primary/15 text-primary"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {u.is_active ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setEditing({
                        id: u.id,
                        username: u.username,
                        email: u.email,
                        first_name: u.first_name,
                        last_name: u.last_name,
                        role: u.role || "member",
                        is_active: u.is_active,
                        password: "",
                      })
                    }
                  >
                    Edit
                  </Button>
                  {!u.is_superuser && (
                    <Button variant="destructive" onClick={() => remove(u)}>
                      Delete
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-link">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background w-full max-w-lg rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">
              {editing.id ? "Edit user" : "New user"}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Username">
                <Input
                  value={editing.username}
                  onChange={(e) =>
                    setEditing({ ...editing, username: e.target.value })
                  }
                />
              </Field>
              <Field label="Email">
                <Input
                  value={editing.email}
                  onChange={(e) =>
                    setEditing({ ...editing, email: e.target.value })
                  }
                />
              </Field>
              <Field label="First name">
                <Input
                  value={editing.first_name}
                  onChange={(e) =>
                    setEditing({ ...editing, first_name: e.target.value })
                  }
                />
              </Field>
              <Field label="Last name">
                <Input
                  value={editing.last_name}
                  onChange={(e) =>
                    setEditing({ ...editing, last_name: e.target.value })
                  }
                />
              </Field>
              <Field label="Role">
                <select
                  className="w-full border rounded-md h-9 px-2 bg-background"
                  value={editing.role}
                  onChange={(e) =>
                    setEditing({ ...editing, role: e.target.value })
                  }
                >
                  {roles.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label={
                  editing.id ? "New password (optional)" : "Password"
                }
              >
                <Input
                  type="password"
                  value={editing.password}
                  onChange={(e) =>
                    setEditing({ ...editing, password: e.target.value })
                  }
                />
              </Field>
              <label className="flex items-center gap-2 col-span-2">
                <input
                  type="checkbox"
                  checked={editing.is_active}
                  onChange={(e) =>
                    setEditing({ ...editing, is_active: e.target.checked })
                  }
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
            {editing.role && (
              <div className="text-xs text-link">
                <strong>Permissions:</strong>{" "}
                {(roles.find((r) => r.value === editing.role)?.permissions || []).join(", ")}
              </div>
            )}
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-link">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
