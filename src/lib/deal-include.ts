export function dealInclude() {
  return {
    client: { select: { id: true, fullName: true, phone: true } },
    lead: { select: { id: true, name: true, status: true } },
    primaryUnit: {
      include: {
        floor: { include: { building: true } },
      },
    },
    assignedTo: { select: { id: true, name: true, email: true, role: true } },
    paymentPlans: { orderBy: { createdAt: "desc" as const }, include: { payments: { orderBy: { sequence: "asc" as const } } } },
    documents: { orderBy: { createdAt: "desc" as const } },
    refunds: { orderBy: { createdAt: "desc" as const } },
  };
}
