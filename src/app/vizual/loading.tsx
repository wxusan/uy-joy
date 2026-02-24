export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar skeleton */}
      <div className="h-16 bg-slate-900" />
      
      {/* Header */}
      <div className="bg-slate-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-7 w-48 bg-slate-700 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-slate-700/50 rounded animate-pulse" />
        </div>
      </div>

      {/* Building selector skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 w-32 bg-white border rounded-xl animate-pulse" />
          ))}
        </div>
      </div>

      {/* Building viewer skeleton */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Building image */}
          <div className="h-[500px] bg-slate-200 rounded-2xl animate-pulse" />
          
          {/* Floor selector */}
          <div className="space-y-2">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-12 bg-white border rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
