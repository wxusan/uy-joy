interface StatsCardProps {
  title: string;
  value: string | number;
  color?: string;
}

export default function StatsCard({ title, value, color = "text-slate-900" }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <p className="text-sm text-slate-500 mb-1">{title}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
