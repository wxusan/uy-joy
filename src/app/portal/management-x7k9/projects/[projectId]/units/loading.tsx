export default function UnitsLoading() {
  return (
    <div>
      <div className="h-8 w-48 skeleton mb-6" />

      {/* Building tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 rounded-xl border-2 border-slate-200 bg-white">
            <div className="h-5 w-20 skeleton mb-2" />
            <div className="flex gap-3">
              <div className="h-3 w-12 bg-emerald-100 rounded" />
              <div className="h-3 w-12 bg-yellow-100 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="h-10 w-28 bg-white border rounded-lg" />
        <div className="h-10 w-28 bg-white border rounded-lg" />
      </div>

      {/* Floor groups */}
      {[...Array(3)].map((_, floorIdx) => (
        <div key={floorIdx} className="bg-white rounded-xl shadow-sm border overflow-hidden mb-4">
          <div className="bg-slate-50 px-4 py-2 border-b">
            <div className="h-5 w-24 skeleton" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex justify-between mb-2">
                  <div className="h-5 w-12 skeleton" />
                  <div className="h-6 w-16 bg-emerald-100 rounded-full" />
                </div>
                <div className="h-4 w-24 skeleton mb-1" />
                <div className="h-4 w-20 skeleton" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
