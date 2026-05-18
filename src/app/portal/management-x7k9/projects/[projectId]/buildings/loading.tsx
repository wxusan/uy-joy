export default function BuildingsLoading() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-2 h-7 w-32 skeleton" />
          <div className="h-4 w-48 skeleton" />
        </div>
        <div className="h-10 w-24 rounded-[6px] border border-neutral-200 bg-white" />
      </div>

      {/* Add form */}
      <div className="rounded-[8px] border border-neutral-200 bg-white p-3 shadow-sm">
        <div className="flex gap-2">
          <div className="h-11 flex-1 skeleton" />
          <div className="h-11 w-32 rounded-[6px] bg-neutral-200" />
        </div>
      </div>

      {/* Building list */}
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-[8px] border border-neutral-200 bg-white p-4 shadow-sm">
            {/* Image thumbnails */}
            <div className="flex gap-2">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-16 w-[72px] skeleton" />
              ))}
            </div>
            {/* Info */}
            <div className="flex-1">
              <div className="h-5 w-24 skeleton mb-2" />
              <div className="h-4 w-32 skeleton" />
            </div>
            {/* Actions */}
            <div className="flex gap-2">
              <div className="h-10 w-28 rounded-[6px] bg-neutral-900" />
              <div className="h-10 w-16 skeleton" />
              <div className="h-10 w-16 rounded-[6px] border border-neutral-200 bg-white" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
