export default function EditorLoading() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-64 skeleton mb-2" />
          <div className="h-4 w-40 skeleton" />
        </div>
        <div className="h-4 w-28 skeleton" />
      </div>

      {/* Editor area */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Canvas */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex gap-2 mb-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 w-24 skeleton" />
              ))}
            </div>
            <div className="h-[500px] skeleton" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="h-5 w-24 skeleton mb-4" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-lg">
                  <div className="h-4 w-16 skeleton mb-2" />
                  <div className="h-3 w-24 skeleton" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
