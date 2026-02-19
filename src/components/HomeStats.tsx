"use client";

import AnimatedCounter from "./AnimatedCounter";
import ScrollReveal from "./ScrollReveal";

interface Props {
  total: number;
  available: number;
  reserved: number;
  sold: number;
  labels: {
    total: string;
    available: string;
    reserved: string;
    sold: string;
  };
}

export default function HomeStats({ total, available, reserved, sold, labels }: Props) {
  return (
    <section className="max-w-6xl mx-auto px-4 -mt-10 relative z-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScrollReveal delay={0}>
          <div className="bg-white rounded-xl shadow-lg p-5 text-center hover:shadow-xl transition-shadow">
            <p className="text-3xl font-bold text-slate-900">
              <AnimatedCounter target={total} duration={2000} />
            </p>
            <p className="text-sm text-slate-500">{labels.total}</p>
          </div>
        </ScrollReveal>
        
        <ScrollReveal delay={100}>
          <div className="bg-white rounded-xl shadow-lg p-5 text-center hover:shadow-xl transition-shadow">
            <p className="text-3xl font-bold text-emerald-600">
              <AnimatedCounter target={available} duration={2000} />
            </p>
            <p className="text-sm text-slate-500">{labels.available}</p>
          </div>
        </ScrollReveal>
        
        <ScrollReveal delay={200}>
          <div className="bg-white rounded-xl shadow-lg p-5 text-center hover:shadow-xl transition-shadow">
            <p className="text-3xl font-bold text-yellow-600">
              <AnimatedCounter target={reserved} duration={2000} />
            </p>
            <p className="text-sm text-slate-500">{labels.reserved}</p>
          </div>
        </ScrollReveal>
        
        <ScrollReveal delay={300}>
          <div className="bg-white rounded-xl shadow-lg p-5 text-center hover:shadow-xl transition-shadow">
            <p className="text-3xl font-bold text-red-600">
              <AnimatedCounter target={sold} duration={2000} />
            </p>
            <p className="text-sm text-slate-500">{labels.sold}</p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
