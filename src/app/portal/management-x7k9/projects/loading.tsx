export default function ProjectsLoading() {
  return (
    <div>
      <div className="h-8 w-32 skeleton mb-6" />

      {/* Project cards */}
      <div className="grid gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-start gap-6">
              <div className="w-32 h-24 skeleton" />
              <div className="flex-1 space-y-3">
                <div className="h-6 w-48 skeleton" />
                <div className="h-4 w-64 skeleton" />
                <div className="flex gap-4">
                  <div className="h-8 w-24 bg-emerald-100 rounded" />
                  <div className="h-8 w-24 bg-yellow-100 rounded" />
                  <div className="h-8 w-24 bg-red-100 rounded" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-10 w-24 skeleton" />
                <div className="h-10 w-24 bg-blue-100 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
