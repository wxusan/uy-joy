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
  const stats = [
    {
      label: labels.total,
      value: total,
      color: "#f2dfc5",
      suffix: "",
    },
    {
      label: labels.available,
      value: available,
      color: "#d66948",
      suffix: "",
    },
    {
      label: labels.reserved,
      value: reserved,
      color: "#cfa967",
      suffix: "",
    },
    {
      label: labels.sold,
      value: sold,
      color: "#a97a62",
      suffix: "",
    },
  ];

  return (
    <section className="relative z-20 overflow-hidden bg-[#f4efe7] px-5 py-12 text-[#15120f] md:py-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#b75f43]/35 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[#11100f]/16 to-transparent" />
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 md:grid-cols-4 md:gap-0">
          {stats.map((stat, index) => {
            return (
              <ScrollReveal key={stat.label} delay={index * 100} direction="up">
                <div className="group flex gap-7 md:min-h-[150px] md:px-9">
                  <div className="mt-2 h-[116px] w-[3px] shrink-0 origin-top bg-[#b75f43] transition-transform duration-500 group-hover:scale-y-110" />
                  <div className="min-w-0">
                    <div className="font-display text-[64px] font-semibold leading-[0.9] tracking-normal text-[#15120f] md:text-[82px]">
                      <AnimatedCounter target={stat.value} duration={1400} />
                      {stat.suffix && <span style={{ color: stat.color }}>{stat.suffix}</span>}
                    </div>
                    <p className="mt-4 max-w-[190px] font-body text-[16px] font-medium leading-6 text-[#6f675e]">
                      {stat.label}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
