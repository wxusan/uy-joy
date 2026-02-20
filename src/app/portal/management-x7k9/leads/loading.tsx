export default function LeadsLoading() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-32 bg-emerald-200 rounded-lg animate-pulse" />
          <div className="h-10 w-36 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              {["Name", "Phone", "Project", "Unit", "Status", "Date"].map((_, i) => (
                <th key={i} className="text-left p-4">
                  <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(6)].map((_, i) => (
              <tr key={i} className="border-b">
                <td className="p-4"><div className="h-4 w-28 bg-slate-200 rounded animate-pulse" /></td>
                <td className="p-4"><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></td>
                <td className="p-4"><div className="h-4 w-32 bg-slate-100 rounded animate-pulse" /></td>
                <td className="p-4"><div className="h-4 w-12 bg-slate-100 rounded animate-pulse" /></td>
                <td className="p-4"><div className="h-6 w-20 bg-blue-100 rounded-full animate-pulse" /></td>
                <td className="p-4"><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
