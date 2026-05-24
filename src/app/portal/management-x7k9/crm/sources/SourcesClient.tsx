"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type Source = {
  key: string;
  labelJson: Partial<Record<"uz" | "ru" | "en", string>> | null;
  isSystem: boolean;
  isActive: boolean;
  defaultAssignedAgentId: string | null;
  defaultPipelineStageKey: string | null;
};

export default function SourcesClient({ sources }: { sources: Source[] }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [drafts, setDrafts] = useState<Record<string, Source>>(
    Object.fromEntries(sources.map((source) => [source.key, source]))
  );
  const [newKey, setNewKey] = useState("");
  const [status, setStatus] = useState("");

  async function save(key: string) {
    setStatus(t("saving"));
    const draft = drafts[key];
    const res = await fetch(`/api/crm/sources/${encodeURIComponent(key)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setStatus(res.ok ? t("saved") : t("saveFailed"));
    router.refresh();
  }

  async function createSource() {
    if (!newKey.trim()) return;
    const res = await fetch("/api/crm/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: newKey.trim(), labelJson: { uz: newKey.trim(), ru: newKey.trim(), en: newKey.trim() } }),
    });
    setStatus(res.ok ? t("created") : t("createFailed"));
    setNewKey("");
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <div className="a-card p-4 flex gap-2">
        <input className="a-input" value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="new_source_key" />
        <button className="a-btn" onClick={createSource}>{t("addSource")}</button>
      </div>
      <div className="a-card overflow-x-auto">
        <table className="a-table min-w-[860px]">
          <thead>
            <tr>
              <th>{t("sourceKey")}</th>
              <th>{t("labelUz")}</th>
              <th>{t("labelRu")}</th>
              <th>{t("labelEn")}</th>
              <th>{t("activeLabel")}</th>
              <th style={{ textAlign: "right" }}>{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => {
              const draft = drafts[source.key];
              return (
                <tr key={source.key}>
                  <td>{source.key}{source.isSystem ? " · " + t("system").toLowerCase() : ""}</td>
                  {(["uz", "ru", "en"] as const).map((locale) => (
                    <td key={locale}>
                      <input
                        className="a-input"
                        value={draft.labelJson?.[locale] || ""}
                        onChange={(e) =>
                          setDrafts({
                            ...drafts,
                            [source.key]: {
                              ...draft,
                              labelJson: { ...(draft.labelJson || {}), [locale]: e.target.value },
                            },
                          })
                        }
                      />
                    </td>
                  ))}
                  <td>
                    <input
                      type="checkbox"
                      checked={draft.isActive}
                      onChange={(e) => setDrafts({ ...drafts, [source.key]: { ...draft, isActive: e.target.checked } })}
                    />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="a-btn" onClick={() => save(source.key)}>{tc("save")}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {status ? <p className="text-[13px]" style={{ color: "var(--a-text-secondary)" }}>{status}</p> : null}
    </div>
  );
}
