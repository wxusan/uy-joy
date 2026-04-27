export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="a-skel h-5 w-28" />
          <div className="a-skel h-3.5 w-40" />
        </div>
        <div className="a-skel h-7 w-24" />
      </div>

      {/* Stats strip — 6 cells */}
      <div className="a-card grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="px-4 py-3 flex flex-col gap-2"
            style={{
              borderRight: i < 5 ? "1px solid var(--a-border)" : undefined,
            }}
          >
            <div className="a-skel h-2.5 w-16" />
            <div className="a-skel h-5 w-12" />
          </div>
        ))}
      </div>

      {/* Two-column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 a-card overflow-hidden">
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--a-border)" }}
          >
            <div className="a-skel h-3.5 w-24" />
            <div className="a-skel h-3 w-12" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="px-4 py-3 flex items-center gap-4"
              style={{
                borderBottom:
                  i < 4 ? "1px solid var(--a-border)" : undefined,
              }}
            >
              <div className="a-skel h-3 w-24" />
              <div className="a-skel h-3 w-28" />
              <div className="a-skel h-3 w-16" />
              <div className="a-skel h-3 w-14 ml-auto" />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-6">
          <div className="a-card p-4 flex flex-col gap-3">
            <div className="a-skel h-3.5 w-20" />
            <div className="a-skel h-1.5 w-full" />
            <div className="flex flex-col gap-2">
              <div className="a-skel h-3 w-full" />
              <div className="a-skel h-3 w-full" />
              <div className="a-skel h-3 w-full" />
            </div>
          </div>
          <div className="a-card p-4 flex flex-col gap-3">
            <div className="a-skel h-3.5 w-24" />
            <div className="a-skel h-3 w-full" />
            <div className="a-skel h-3 w-full" />
            <div className="a-skel h-3 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
