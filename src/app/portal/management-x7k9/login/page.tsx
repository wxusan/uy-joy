"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const t = useTranslations("login");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/portal/management-x7k9");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--a-bg-subtle)" }}
    >
      <div className="w-full max-w-[360px]">
        {/* Brand mark */}
        <div className="flex items-center gap-2 mb-8">
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-[12px] font-semibold text-white"
            style={{ background: "var(--a-text)" }}
          >
            U
          </div>
          <span className="text-[14px] font-semibold" style={{ color: "var(--a-text)" }}>
            UyJoy
          </span>
        </div>

        <h1 className="text-[20px] font-semibold mb-1" style={{ color: "var(--a-text)" }}>
          Sign in
        </h1>
        <p className="text-[13px] mb-6" style={{ color: "var(--a-text-secondary)" }}>
          {t("subtitle")}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label
              className="text-[12px] font-medium block mb-1"
              style={{ color: "var(--a-text-secondary)" }}
            >
              {t("email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="a-input"
              placeholder="admin@navruz.uz"
              required
              style={{ height: 32, padding: "0 10px" }}
            />
          </div>

          <div>
            <label
              className="text-[12px] font-medium block mb-1"
              style={{ color: "var(--a-text-secondary)" }}
            >
              {t("password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="a-input"
              placeholder="••••••••"
              required
              style={{ height: 32, padding: "0 10px" }}
            />
          </div>

          {error && (
            <p
              className="text-[12px]"
              style={{ color: "var(--a-danger)" }}
            >
              {t("invalidCredentials")}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="a-btn a-btn-primary w-full justify-center mt-2"
            style={{ height: 34 }}
          >
            {loading ? t("signingIn") : t("signIn")}
          </button>
        </form>
      </div>
    </div>
  );
}
