export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar skeleton */}
      <div className="h-16 bg-slate-900" />
      
      {/* Hero skeleton */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="h-8 w-48 bg-slate-700/50 rounded-full mx-auto mb-6 animate-pulse" />
          <div className="h-14 w-96 bg-slate-700/50 rounded-lg mx-auto mb-4 animate-pulse" />
          <div className="h-5 w-64 bg-slate-700/50 rounded mx-auto mb-8 animate-pulse" />
          <div className="flex gap-4 justify-center">
            <div className="h-12 w-40 bg-emerald-500/30 rounded-lg animate-pulse" />
            <div className="h-12 w-40 bg-white/10 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="bg-white py-8 border-b">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center">
              <div className="h-10 w-20 bg-slate-200 rounded mx-auto mb-2 animate-pulse" />
              <div className="h-4 w-16 bg-slate-100 rounded mx-auto animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="h-72 bg-slate-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
