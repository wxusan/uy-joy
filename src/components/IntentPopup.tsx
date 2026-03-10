"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, CheckCircle2, Home, TrendingUp, BedDouble } from "lucide-react";
import posthog from "posthog-js";

export default function IntentPopup() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [hasDismissed, setHasDismissed] = useState(false);
    const [step, setStep] = useState(0); // 0 = closed, 1 = rooms, 2 = contact, 3 = success

    const [rooms, setRooms] = useState<string>("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);

    // Triggers
    useEffect(() => {
        if (hasDismissed || isOpen || step > 0) return;
        // Never show on admin pages
        if (pathname.startsWith("/portal")) return;

        const handleMouseLeave = (e: MouseEvent) => {
            // Trigger if mouse leaves top of screen
            if (e.clientY <= 0) {
                showPopup("exit_intent");
            }
        };

        const handleScroll = () => {
            const scrollY = window.scrollY;
            const height = document.documentElement.scrollHeight - window.innerHeight;
            if (height > 0 && scrollY > height * 0.7) {
                showPopup("scroll_depth");
            }
        };

        const timer = setTimeout(() => {
            showPopup("time_on_page");
        }, 33000); // 33 seconds

        document.addEventListener("mouseleave", handleMouseLeave);
        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            document.removeEventListener("mouseleave", handleMouseLeave);
            window.removeEventListener("scroll", handleScroll);
            clearTimeout(timer);
        };
    }, [hasDismissed, isOpen, step]);

    const showPopup = (triggerSource: string) => {
        setIsOpen(true);
        setStep(1);
        posthog.capture("Intent Popup Triggered", { trigger_source: triggerSource });
    };

    const closePopup = () => {
        setIsOpen(false);
        setHasDismissed(true);
        setTimeout(() => setStep(0), 300);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !phone.trim()) return;

        setLoading(true);
        try {
            await fetch("/api/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    phone,
                    projectId: "N/A",
                    projectName: `Matchmaker: ${rooms}`,
                    source: "intent_popup",
                }),
            });

            posthog.capture("Intent Popup Completed", {
                rooms,
            });

            setStep(3);
        } catch (err) {
            alert("Xatolik yuz berdi. Qaytadan urinib ko'ring.");
        } finally {
            setLoading(false);
        }
    };

    // Floating trigger button when closed — always visible
    if (!isOpen) {
        return (
            <button
                onClick={() => showPopup("manual_click")}
                className="fixed bottom-6 left-4 z-40 bg-navy-900 text-white px-5 py-3 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center gap-3 hover:bg-navy-800 transition-all hover:-translate-y-1 active:scale-95 group animate-fade-in-up md:bottom-8 md:left-8"
            >
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-sm">Uyni tanlashga yordam kerakmi?</span>
            </button>
        );
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300">
            <div
                className="bg-white/95 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.1)] overflow-hidden relative border border-white/50 animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={closePopup}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-full transition-colors z-10"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="p-8">
                    {/* Progress Bar */}
                    {step < 3 && (
                        <div className="flex items-center gap-2 mb-8">
                            <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-200'} transition-all duration-300`} />
                            <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-200'} transition-all duration-300`} />
                        </div>
                    )}

                    {/* Steps */}
                    <div className="relative">
                        {step === 1 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Xonalar soni</h3>
                                <p className="text-slate-500 mb-6 font-medium">Sizga eng mos keladigan variantlarni tanlaymiz.</p>
                                <div className="space-y-3">
                                    {["1 xonali", "2 xonali", "3 xonali", "4+ xonali"].map((option) => (
                                        <button
                                            key={option}
                                            onClick={() => { setRooms(option); setStep(2); }}
                                            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100/80 bg-white hover:border-emerald-500 focus:border-emerald-500 hover:bg-emerald-50 transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md group text-left"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-white flex items-center justify-center transition-colors shadow-sm">
                                                <BedDouble className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                                            </div>
                                            <span className="font-bold text-slate-700 group-hover:text-navy-900 text-lg">{option}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <button onClick={() => setStep(1)} className="text-sm text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1 font-semibold transition-colors">
                                    ← Orqaga
                                </button>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Muvaffaqiyatli!</h3>
                                <p className="text-slate-500 mb-6 font-medium leading-relaxed">Ekspertlarimiz sizga {rooms} xonadon bo&apos;yicha to&apos;liq ma&apos;lumot berish uchun tez orada bog&apos;lanishadi.</p>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Ismingiz</label>
                                        <input
                                            type="text" required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full px-5 py-3.5 border-2 border-slate-200/80 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all font-medium bg-slate-50/50 hover:bg-white focus:bg-white"
                                            placeholder="Ismingizni kiriting"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Telefon raqamingiz</label>
                                        <input
                                            type="tel" required
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full px-5 py-3.5 border-2 border-slate-200/80 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all font-medium bg-slate-50/50 hover:bg-white focus:bg-white"
                                            placeholder="+998 90 123 45 67"
                                        />
                                    </div>
                                    <button
                                        type="submit" disabled={loading}
                                        className="bg-shine w-full py-4 bg-navy-900 text-white rounded-2xl font-bold text-lg hover:bg-navy-800 active:scale-95 transition-all disabled:opacity-70 mt-6 shadow-[0_8px_20px_rgba(15,23,42,0.3)] hover:shadow-[0_12px_25px_rgba(15,23,42,0.4)]"
                                    >
                                        {loading ? "Yuborilmoqda..." : "Konsultatsiya Olish"}
                                    </button>
                                </form>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="animate-in fade-in zoom-in-95 duration-500 text-center py-6">
                                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-in zoom-in duration-500 delay-150" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Arizangiz qabul qilindi!</h3>
                                <p className="text-slate-600 mb-8 font-medium leading-relaxed">Tez orada menejerlarimiz siz bilan bog&apos;lanib, so&apos;rovlaringiz bo&apos;yicha eng yaxshi variantlarni yuborishadi.</p>
                                <button
                                    onClick={closePopup}
                                    className="px-8 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Yopish
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
