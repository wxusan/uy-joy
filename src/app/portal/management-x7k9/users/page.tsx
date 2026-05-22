"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { PLATFORM_ROLE_LABELS, PLATFORM_ROLES, V1_PLATFORM_ROLES, roleHasPlatformPermission } from "@/lib/platform-plans";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: keyof typeof PLATFORM_ROLE_LABELS;
};

export default function AdminUsers() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const { data: session } = useSession();
  const sessionUser = session?.user as { id?: string; role?: string } | undefined;
  const currentRole = sessionUser?.role;
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "sales_agent" });
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const canManageTechnicalSettings = roleHasPlatformPermission(currentRole, "technicalSettings");
  const creatableRoles = canManageTechnicalSettings ? PLATFORM_ROLES : V1_PLATFORM_ROLES;

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
    setForm({ name: "", email: "", password: "", role: "sales_agent" });
    setShowForm(false);
    loadUsers();
  };

  const deleteUser = async (id: string) => {
    if (!confirm(t("confirmDeleteUserMsg"))) return;
    await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    loadUsers();
  };

  const resetUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetStatus(null);
    const response = await fetch(`/api/users/${resetTarget.id}/password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPassword }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setResetStatus(data.error || "Password reset failed.");
      return;
    }
    setResetPassword("");
    setResetTarget(null);
    setResetStatus("Password reset.");
  };

  if (!roleHasPlatformPermission(currentRole, "manageUsers")) {
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
          <p className="a-page-sub">{users.length} {users.length === 1 ? t("memberSingular") : t("memberPlural")}</p>
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
              {creatableRoles.map((role) => (
                <option key={role} value={role}>
                  {PLATFORM_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button type="submit" className="a-btn a-btn-primary">
              {t("createUser")}
            </button>
          </div>
        </form>
      )}

      {resetTarget && (
        <form onSubmit={resetUserPassword} className="a-card p-4 flex flex-col gap-3">
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: "var(--a-text)" }}>
              Reset password
            </h2>
            <p className="text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>
              {resetTarget.name} will use this temporary password until they change it.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className="a-input"
              type="password"
              placeholder="Temporary password"
              value={resetPassword}
              minLength={10}
              onChange={(event) => setResetPassword(event.target.value)}
              required
            />
            <button className="a-btn a-btn-primary">Reset password</button>
            <button
              type="button"
              className="a-btn"
              onClick={() => {
                setResetTarget(null);
                setResetPassword("");
              }}
            >
              {tc("cancel")}
            </button>
          </div>
        </form>
      )}

      {resetStatus && (
        <p className="text-[12px]" style={{ color: "var(--a-accent)" }}>
          {resetStatus}
        </p>
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
                          user.role === "owner" || user.role === "developer"
                            ? "var(--a-accent)"
                            : "var(--a-text-tertiary)",
                      }}
                    />
                    {PLATFORM_ROLE_LABELS[user.role as keyof typeof PLATFORM_ROLE_LABELS] ?? user.role}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div className="inline-flex justify-end gap-2">
                    {(user.role !== "developer" || canManageTechnicalSettings) && (
                      <button
                        onClick={() => {
                          setResetTarget(user);
                          setResetStatus(null);
                        }}
                        className="a-btn"
                        style={{ height: 24, padding: "0 8px", fontSize: 12 }}
                      >
                        <KeyRound className="w-3 h-3" />
                        Reset
                      </button>
                    )}
                    {user.id !== sessionUser?.id && (user.role !== "developer" || canManageTechnicalSettings) && (
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="a-btn a-btn-danger"
                        style={{ height: 24, padding: "0 8px", fontSize: 12 }}
                      >
                        <Trash2 className="w-3 h-3" />
                        {tc("delete")}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
