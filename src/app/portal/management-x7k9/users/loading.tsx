export default function UsersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 skeleton" />
        <div className="h-9 w-36 skeleton" />
      </div>

      {/* User rows */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`flex items-center gap-4 p-4 ${i < 3 ? "border-b" : ""}`}>
            <div className="w-9 h-9 skeleton flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-32 skeleton" />
              <div className="h-3 w-48 skeleton" />
            </div>
            <div className="h-6 w-16 skeleton" />
            <div className="h-8 w-20 skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}
