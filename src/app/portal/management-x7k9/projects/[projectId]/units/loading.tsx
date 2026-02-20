export default function UnitsLoading() {
  return (
    <div>
      <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-6" />

      {/* Building tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 rounded-xl border-2 border-slate-200 bg-white">
            <div className="h-5 w-20 bg-slate-200 rounded animate-pulse mb-2" />
            <div className="flex gap-3">
              <div className="h-3 w-12 bg-emerald-100 rounded animate-pulse" />
              <div className="h-3 w-12 bg-yellow-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="h-10 w-28 bg-white border rounded-lg animate-pulse" />
        <div className="h-10 w-28 bg-white border rounded-lg animate-pulse" />
      </div>

      {/* Floor groups */}
      {[...Array(3)].map((_, floorIdx) => (
        <div key={floorIdx} className="bg-white rounded-xl shadow-sm border overflow-hidden mb-4">
          <div className="bg-slate-50 px-4 py-2 border-b">
            <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex justify-between mb-2">
                  <div className="h-5 w-12 bg-slate-200 rounded animate-pulse" />
                  <div className="h-6 w-16 bg-emerald-100 rounded-full animate-pulse" />
                </div>
                <div className="h-4 w-24 bg-slate-100 rounded animate-pulse mb-1" />
                <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
