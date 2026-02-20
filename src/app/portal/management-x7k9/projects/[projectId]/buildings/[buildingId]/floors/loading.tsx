export default function FloorsLoading() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-40 bg-purple-100 rounded-lg animate-pulse" />
          <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>

      {/* Add form */}
      <div className="bg-white rounded-xl shadow-sm border mb-6 overflow-hidden">
        <div className="flex border-b">
          <div className="flex-1 py-2.5 bg-emerald-50 border-b-2 border-emerald-600" />
          <div className="flex-1 py-2.5 bg-white" />
        </div>
        <div className="p-4">
          <div className="flex gap-3">
            <div className="h-10 w-28 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-10 w-44 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-10 w-28 bg-emerald-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* Floors list */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-100 rounded-lg animate-pulse flex items-center justify-center">
              <div className="h-6 w-6 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="h-5 w-24 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
            </div>
            <div className="h-3 w-24 bg-slate-100 rounded-full animate-pulse" />
            <div className="flex gap-2">
              <div className="h-10 w-32 bg-purple-100 rounded-lg animate-pulse" />
              <div className="h-10 w-16 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-10 w-16 bg-red-50 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
