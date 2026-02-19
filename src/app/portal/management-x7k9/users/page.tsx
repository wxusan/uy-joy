"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

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
    if (!confirm(t("confirmDelete"))) return;
    await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    loadUsers();
  };

  if ((session?.user as any)?.role !== "superadmin") {
    return <p className="text-slate-500">{t("accessDenied")}</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("users")}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg transition"
        >
          {showForm ? tc("cancel") : "+ " + t("addUser")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createUser} className="bg-white rounded-xl shadow-sm border p-5 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder={t("name")}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
              required
            />
            <input
              placeholder={t("email")}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
              required
            />
            <input
              placeholder={t("password")}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
              required
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="admin">Admin</option>
              <option value="superadmin">{t("superadmin")}</option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            {t("createUser")}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b text-left">
              <th className="px-4 py-3 font-medium text-slate-600">{t("name")}</th>
              <th className="px-4 py-3 font-medium text-slate-600">{t("email")}</th>
              <th className="px-4 py-3 font-medium text-slate-600">{t("role")}</th>
              <th className="px-4 py-3 font-medium text-slate-600">{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b">
                <td className="px-4 py-3 font-medium">{user.name}</td>
                <td className="px-4 py-3 text-slate-500">{user.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      user.role === "superadmin" ? "bg-purple-100 text-purple-800" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {user.role === "superadmin" ? t("superadmin") : "Admin"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {user.id !== (session?.user as any)?.id && (
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="text-xs text-red-600 hover:text-red-800 transition"
                    >
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
