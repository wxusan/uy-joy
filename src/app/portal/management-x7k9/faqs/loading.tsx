export default function FAQsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
        <div className="h-9 w-32 bg-slate-200 rounded-lg animate-pulse" />
      </div>

      {/* FAQ items */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border p-5 space-y-3">
            <div className="h-4 w-2/3 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
            <div className="h-3 w-4/5 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
