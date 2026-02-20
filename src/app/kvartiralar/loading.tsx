export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar skeleton */}
      <div className="h-16 bg-slate-900" />
      
      {/* Header */}
      <div className="bg-slate-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-7 w-48 bg-slate-700 rounded animate-pulse mb-2" />
          <div className="h-4 w-32 bg-slate-700/50 rounded animate-pulse" />
        </div>
      </div>

      {/* Filters skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-3 flex-wrap">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 w-28 bg-white border rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Cards grid skeleton */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="h-40 bg-slate-200 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-5 w-20 bg-slate-200 rounded animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-slate-100 rounded-full animate-pulse" />
                  <div className="h-6 w-16 bg-slate-100 rounded-full animate-pulse" />
                </div>
                <div className="h-6 w-32 bg-emerald-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
