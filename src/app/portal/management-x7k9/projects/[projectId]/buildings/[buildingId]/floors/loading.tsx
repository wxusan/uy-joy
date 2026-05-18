export default function FloorsLoading() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-2 h-7 w-48 skeleton" />
          <div className="h-4 w-24 skeleton" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-40 rounded-[6px] bg-neutral-900" />
          <div className="h-10 w-32 rounded-[6px] border border-neutral-200 bg-white" />
        </div>
      </div>

      {/* Add form */}
      <div className="overflow-hidden rounded-[8px] border border-neutral-200 bg-white shadow-sm">
        <div className="flex border-b border-neutral-200 bg-neutral-50 p-1">
          <div className="flex-1 rounded-[6px] bg-white py-2.5 shadow-sm" />
          <div className="flex-1 py-2.5" />
        </div>
        <div className="p-4">
          <div className="flex gap-3">
            <div className="h-10 w-28 skeleton" />
            <div className="h-10 w-44 skeleton" />
            <div className="h-10 w-28 rounded-[6px] bg-neutral-200" />
          </div>
        </div>
      </div>

      {/* Floors list */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-[8px] border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-[6px] border border-neutral-200 bg-neutral-50">
              <div className="h-6 w-6 skeleton" />
            </div>
            <div className="flex-1">
              <div className="h-5 w-24 skeleton mb-2" />
              <div className="h-4 w-40 skeleton" />
            </div>
            <div className="h-3 w-24 skeleton" />
            <div className="flex gap-2">
              <div className="h-10 w-32 rounded-[6px] bg-neutral-900" />
              <div className="h-10 w-16 skeleton" />
              <div className="h-10 w-16 rounded-[6px] border border-neutral-200 bg-white" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
