export default function ProjectsLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-2">
          <div className="a-skel h-5 w-24" />
          <div className="a-skel h-3.5 w-56" />
        </div>
        <div className="flex gap-2">
          <div className="a-skel h-7 w-24" />
          <div className="a-skel h-7 w-24" />
        </div>
      </div>

      {/* Top-view image card */}
      <div className="a-card p-5 flex flex-col gap-3">
        <div className="a-skel h-4 w-48" />
        <div className="a-skel h-3 w-72" />
        <div className="flex items-start gap-5 flex-wrap mt-2">
          <div className="a-skel w-48 h-32" />
          <div className="flex flex-col gap-2">
            <div className="a-skel h-7 w-32" />
            <div className="a-skel h-7 w-40" />
          </div>
        </div>
      </div>

      {/* Inventory list */}
      <div className="a-card overflow-hidden">
        <div
          className="px-4 py-3"
          style={{ borderBottom: "1px solid var(--a-border)" }}
        >
          <div className="a-skel h-3.5 w-24" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="px-4 py-3 flex items-center gap-3"
            style={{ borderBottom: i === 0 ? "1px solid var(--a-border)" : undefined }}
          >
            <div className="a-skel h-3.5 w-3.5" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="a-skel h-3.5 w-20" />
              <div className="a-skel h-3 w-64" />
            </div>
            <div className="a-skel h-3 w-6" />
          </div>
        ))}
      </div>

      {/* Multilingual editor */}
      <div className="a-card p-5 flex flex-col gap-3">
        <div className="a-skel h-4 w-48" />
        <div className="a-skel h-3 w-64" />
        <div className="a-skel h-7 w-36 mt-1" />
        <div className="flex flex-col gap-3 mt-1">
          <div className="a-skel h-3 w-24" />
          <div className="a-skel h-8 w-full" />
          <div className="a-skel h-3 w-32" />
          <div className="a-skel h-24 w-full" />
        </div>
        <div className="a-skel h-7 w-20 mt-1" />
      </div>
    </div>
  );
}
