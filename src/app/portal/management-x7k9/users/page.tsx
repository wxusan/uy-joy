"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";

export default function AdminUsers() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const { data: session } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin" });

  const loadUsers = () => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      });
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", email: "", password: "", role: "admin" });
    setShowForm(false);
    loadUsers();
  };

  const deleteUser = async (id: string) => {
    if (!confirm(t("confirmDeleteUserMsg"))) return;
    await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    loadUsers();
  };

  if ((session?.user as any)?.role !== "superadmin" && (session?.user as any)?.role !== "developer") {
    return (
      <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>
        {t("accessDenied")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="a-page-title">{t("users")}</h1>
          <p className="a-page-sub">{users.length} member{users.length === 1 ? "" : "s"}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={showForm ? "a-btn" : "a-btn a-btn-primary"}
        >
          {showForm ? (
            tc("cancel")
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              {t("addUser")}
            </>
          )}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={createUser}
          className="a-card p-4 flex flex-col gap-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder={t("name")}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="a-input"
              required
            />
            <input
              placeholder={t("email")}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="a-input"
              required
            />
            <input
              placeholder={t("password")}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="a-input"
              required
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="a-input"
            >
              <option value="admin">Admin</option>
              <option value="superadmin">{t("superadmin")}</option>
            </select>
          </div>
          <div>
            <button type="submit" className="a-btn a-btn-primary">
              {t("createUser")}
            </button>
          </div>
        </form>
      )}

      <div className="a-card overflow-hidden">
        <table className="a-table">
          <thead>
            <tr>
              <th>{t("name")}</th>
              <th>{t("email")}</th>
              <th>{t("role")}</th>
              <th style={{ textAlign: "right" }}>{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td style={{ fontWeight: 500 }}>{user.name}</td>
                <td style={{ color: "var(--a-text-secondary)" }}>{user.email}</td>
                <td>
                  <span
                    className="inline-flex items-center gap-1.5 text-[12px]"
                    style={{ color: "var(--a-text-secondary)" }}
                  >
                    <span
                      className="a-dot"
                      style={{
                        color:
                          user.role === "superadmin" || user.role === "developer"
                            ? "var(--a-accent)"
                            : "var(--a-text-tertiary)",
                      }}
                    />
                    {user.role === "superadmin"
                      ? t("superadmin")
                      : user.role === "developer"
                      ? "Developer"
                      : "Admin"}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  {user.id !== (session?.user as any)?.id && (
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="a-btn a-btn-danger"
                      style={{ height: 24, padding: "0 8px", fontSize: 12 }}
                    >
                      <Trash2 className="w-3 h-3" />
                      {tc("delete")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
