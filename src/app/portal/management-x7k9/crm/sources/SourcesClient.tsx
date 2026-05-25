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
  const [newName, setNewName] = useState("");
  const [status, setStatus] = useState("");

  function sourceName(source: Source) {
    return source.labelJson?.uz || source.labelJson?.ru || source.labelJson?.en || source.key.replace(/[_-]+/g, " ");
  }

  function sourceKey(name: string) {
    return name
      .trim()
      .toLowerCase()
      .replace(/['’`]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80);
  }

  function sourceLink(key: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/?source=${encodeURIComponent(key)}`;
  }

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
    const name = newName.trim();
    const key = sourceKey(name);
    if (!name || !key) return;
    const res = await fetch("/api/crm/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, labelJson: { uz: name } }),
    });
    setStatus(res.ok ? t("created") : t("createFailed"));
    setNewName("");
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <div className="a-card p-4 flex gap-2 flex-wrap">
        <input
          className="a-input flex-1 min-w-[240px]"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t("sourceNamePlaceholder")}
        />
        <button className="a-btn" onClick={createSource}>{t("addSource")}</button>
      </div>
      <div className="a-card overflow-x-auto">
        <table className="a-table min-w-[860px]">
          <thead>
            <tr>
              <th>{t("sourceName")}</th>
              <th>{t("trackingLink")}</th>
              <th>{t("sourceInternalCode")}</th>
              <th>{t("activeLabel")}</th>
              <th style={{ textAlign: "right" }}>{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => {
              const draft = drafts[source.key];
              return (
                <tr key={source.key}>
                  <td>
                    <input
                      className="a-input"
                      value={sourceName(draft)}
                      onChange={(e) =>
                        setDrafts({
                          ...drafts,
                          [source.key]: {
                            ...draft,
                            labelJson: { ...(draft.labelJson || {}), uz: e.target.value },
                          },
                        })
                      }
                    />
                  </td>
                  <td>
                    <code className="text-[12px] break-all rounded bg-black/5 px-2 py-1">{sourceLink(source.key)}</code>
                  </td>
                  <td>
                    <span className="text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>
                      {source.key}{source.isSystem ? " · " + t("system").toLowerCase() : ""}
                    </span>
                  </td>
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
