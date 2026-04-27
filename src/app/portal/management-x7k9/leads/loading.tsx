export default function LeadsLoading() {
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-2">
          <div className="a-skel h-5 w-40" />
          <div className="a-skel h-3.5 w-24" />
        </div>
        <div className="a-skel h-7 w-32" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="a-skel h-7 w-64" />
        <div className="a-skel h-7 w-32" />
      </div>

      {/* Table */}
      <div className="a-card overflow-hidden">
        <table className="a-table">
          <thead>
            <tr>
              {["Name", "Phone", "Project", "Unit", "Source", "Status", "Date"].map(
                (_, i) => (
                  <th key={i}>
                    <div className="a-skel h-3 w-16" />
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}>
                <td><div className="a-skel h-3 w-28" /></td>
                <td><div className="a-skel h-3 w-24" /></td>
                <td><div className="a-skel h-3 w-32" /></td>
                <td><div className="a-skel h-3 w-10" /></td>
                <td><div className="a-skel h-3 w-16" /></td>
                <td><div className="a-skel h-3 w-20" /></td>
                <td><div className="a-skel h-3 w-24 ml-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
