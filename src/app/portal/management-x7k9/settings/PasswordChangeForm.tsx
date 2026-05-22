"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";

export default function PasswordChangeForm() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    if (form.newPassword !== form.confirmPassword) {
      setStatus("New passwords do not match.");
      return;
    }

    setBusy(true);
    const response = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setStatus(data.error || "Password change failed.");
      return;
    }

    setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setStatus("Password updated.");
  };

  return (
    <form onSubmit={submit} className="a-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <KeyRound className="w-4 h-4" style={{ color: "var(--a-text-tertiary)" }} />
        <h2 className="text-[15px] font-semibold" style={{ color: "var(--a-text)" }}>
          Password
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          className="a-input"
          type="password"
          autoComplete="current-password"
          placeholder="Current password"
          value={form.currentPassword}
          onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
          required
        />
        <input
          className="a-input"
          type="password"
          autoComplete="new-password"
          placeholder="New password"
          value={form.newPassword}
          onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
          required
          minLength={10}
        />
        <input
          className="a-input"
          type="password"
          autoComplete="new-password"
          placeholder="Confirm new password"
          value={form.confirmPassword}
          onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
          required
          minLength={10}
        />
      </div>
      <div className="flex items-center gap-3">
        <button className="a-btn a-btn-primary" disabled={busy}>
          {busy ? "Updating..." : "Update password"}
        </button>
        {status && (
          <span className="text-[12px]" style={{ color: status.includes("updated") ? "var(--a-accent)" : "#dc2626" }}>
            {status}
          </span>
        )}
      </div>
    </form>
  );
}

