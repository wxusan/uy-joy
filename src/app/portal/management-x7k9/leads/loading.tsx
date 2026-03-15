export default function LeadsLoading() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-48 skeleton mb-2" />
          <div className="h-4 w-24 skeleton" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-32 bg-emerald-200 rounded-lg" />
          <div className="h-10 w-36 skeleton" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              {["Name", "Phone", "Project", "Unit", "Status", "Date"].map((_, i) => (
                <th key={i} className="text-left p-4">
                  <div className="h-4 w-16 skeleton" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(6)].map((_, i) => (
              <tr key={i} className="border-b">
                <td className="p-4"><div className="h-4 w-28 skeleton" /></td>
                <td className="p-4"><div className="h-4 w-24 skeleton" /></td>
                <td className="p-4"><div className="h-4 w-32 skeleton" /></td>
                <td className="p-4"><div className="h-4 w-12 skeleton" /></td>
                <td className="p-4"><div className="h-6 w-20 bg-blue-100 rounded-full" /></td>
                <td className="p-4"><div className="h-4 w-24 skeleton" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
