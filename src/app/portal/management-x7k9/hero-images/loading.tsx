export default function HeroImagesLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-4 w-32 skeleton mb-2" />
        <div className="h-8 w-48 skeleton mb-1" />
        <div className="h-3 w-64 skeleton" />
      </div>

      {/* Form skeleton */}
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <div className="h-5 w-40 skeleton" />
        {/* Lang tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 w-20 skeleton" />
          ))}
        </div>
        {/* Fields */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-24 skeleton" />
            <div className={`w-full skeleton ${i === 1 ? "h-24" : "h-10"}`} />
          </div>
        ))}
        <div className="h-9 w-24 skeleton" />
      </div>

      {/* Upload + image grid skeleton */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="h-10 w-36 skeleton" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-slate-100 rounded-xl aspect-video" />
        ))}
      </div>
    </div>
  );
}
