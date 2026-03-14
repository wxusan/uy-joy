import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  color?: string;
  bgColor?: string;
  icon?: ReactNode;
  sub?: string;
}

export default function StatsCard({ title, value, color = "text-slate-900", bgColor, icon, sub }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
        {icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgColor ?? "bg-slate-100"}`}>
            <span className={color}>{icon}</span>
          </div>
        )}
      </div>
      <p className={`text-3xl font-bold leading-none ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
