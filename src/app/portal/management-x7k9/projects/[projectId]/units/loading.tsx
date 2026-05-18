export default function UnitsLoading() {
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 h-8 w-56 rounded-[6px] bg-neutral-100" />
        <div className="h-4 w-80 rounded-[6px] bg-neutral-100" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[...Array(2)].map((_, index) => (
          <div key={index} className="rounded-[8px] border border-neutral-200 bg-white p-4">
            <div className="mb-3 h-5 w-28 rounded-[6px] bg-neutral-100" />
            <div className="grid grid-cols-3 gap-2">
              <div className="h-4 rounded-[6px] bg-neutral-100" />
              <div className="h-4 rounded-[6px] bg-neutral-100" />
              <div className="h-4 rounded-[6px] bg-neutral-100" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="h-10 w-36 rounded-[6px] border border-neutral-200 bg-white" />
        <div className="h-10 w-36 rounded-[6px] border border-neutral-200 bg-white" />
      </div>

      {[...Array(3)].map((_, floorIndex) => (
        <div key={floorIndex} className="overflow-hidden rounded-[8px] border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3">
            <div className="h-5 w-28 rounded-[6px] bg-neutral-100" />
            <div className="h-4 w-20 rounded-[6px] bg-neutral-100" />
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="rounded-[7px] border border-neutral-200 bg-white p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="h-5 w-16 rounded-[6px] bg-neutral-100" />
                  <div className="h-7 w-24 rounded-[6px] bg-neutral-100" />
                </div>
                <div className="mb-2 h-4 w-28 rounded-[6px] bg-neutral-100" />
                <div className="h-4 w-20 rounded-[6px] bg-neutral-100" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
