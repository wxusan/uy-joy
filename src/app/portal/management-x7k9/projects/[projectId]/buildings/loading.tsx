export default function BuildingsLoading() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-32 bg-slate-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
      </div>

      {/* Add form */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex gap-3">
          <div className="flex-1 h-10 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-emerald-200 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Building list */}
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4">
            {/* Image thumbnails */}
            <div className="flex gap-2">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="w-16 h-16 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
            {/* Info */}
            <div className="flex-1">
              <div className="h-5 w-24 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
            </div>
            {/* Actions */}
            <div className="flex gap-2">
              <div className="h-10 w-28 bg-blue-100 rounded-lg animate-pulse" />
              <div className="h-10 w-16 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-10 w-16 bg-red-50 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
