export default function AdminLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="h-8 w-40 bg-slate-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border p-5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
              <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse" />
            </div>
            <div className="h-8 w-14 bg-slate-200 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div>
        <div className="h-3 w-24 bg-slate-200 rounded animate-pulse mb-3" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border p-5 flex flex-col gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-36 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
