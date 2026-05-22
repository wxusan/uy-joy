"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { capturePublicEvent, collectLeadTracking } from "@/lib/public-lead-client";

export type EmbedLeadFormStrings = {
  title: string;
  namePlaceholder: string;
  phonePlaceholder: string;
  errorRetry: string;
  sending: string;
  send: string;
};

export default function EmbedLeadFormClient({
  projectId,
  projectName,
  source,
  thankYouMessage,
  strings,
}: {
  projectId: string;
  projectName: string;
  source: string;
  thankYouMessage: string;
  strings: EmbedLeadFormStrings;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const hasStartedRef = useRef(false);

  // Fire lead_form_view once on mount
  useEffect(() => {
    capturePublicEvent("lead_form_view", { source, projectId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sendHeight = () => window.parent?.postMessage({ type: "uyjoy:lead-form-height", height: ref.current?.scrollHeight || 360 }, "*");
    sendHeight();
    const observer = new ResizeObserver(sendHeight);
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [status]);

  function handleInput(field: "name" | "phone", value: string) {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      capturePublicEvent("lead_form_start", { source, projectId });
    }
    if (field === "name") setName(value);
    else setPhone(value);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setStatus("loading");
    capturePublicEvent("lead_form_submit", { source, projectId });
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        projectId,
        projectName,
        ...collectLeadTracking(source),
      }),
    });
    if (res.ok) {
      capturePublicEvent("lead_form_success", { source, projectId });
      setStatus("success");
      setName("");
      setPhone("");
    } else {
      capturePublicEvent("lead_form_error", { source, projectId });
      setStatus("error");
    }
  }

  return (
    <div ref={ref} className="min-h-[320px] bg-[#f4efe7] p-5 text-[#15120f]">
      {status === "success" ? (
        <div className="grid place-items-center gap-3 py-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-[#2f9d72]" />
          <p className="font-semibold">{thankYouMessage}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-3">
          <h1 className="text-[20px] font-semibold">{strings.title}</h1>
          <input className="h-11 border border-[#d8cabc] bg-white px-3 text-[14px]" value={name} onChange={(e) => handleInput("name", e.target.value)} placeholder={strings.namePlaceholder} required />
          <input className="h-11 border border-[#d8cabc] bg-white px-3 text-[14px]" value={phone} onChange={(e) => handleInput("phone", e.target.value)} placeholder={strings.phonePlaceholder} required />
          {status === "error" ? <p className="text-[13px] text-red-700">{strings.errorRetry}</p> : null}
          <button className="h-11 bg-[#c66348] px-4 text-[14px] font-semibold text-white" disabled={status === "loading"}>
            {status === "loading" ? strings.sending : strings.send}
          </button>
        </form>
      )}
    </div>
  );
}
