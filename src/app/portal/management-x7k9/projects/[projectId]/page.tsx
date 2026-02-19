"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EditProjectRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/portal/management-x7k9/projects");
  }, [router]);
  return <p className="text-slate-500">Yo&apos;naltirilmoqda...</p>;
}
