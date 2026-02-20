export default function EditorLoading() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
      </div>

      {/* Editor area */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Canvas */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex gap-2 mb-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 w-24 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
            <div className="h-[500px] bg-slate-100 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="h-5 w-24 bg-slate-200 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-lg">
                  <div className="h-4 w-16 bg-slate-200 rounded animate-pulse mb-2" />
                  <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
