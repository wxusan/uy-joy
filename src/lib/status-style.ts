export type UnitStatus = "available" | "reserved" | "sold";

export function getStatusMeta(status: string, active = false) {
  if (status === "sold") {
    return {
      label: "Sotilgan",
      fillColor: active ? "rgba(190, 78, 55, 0.62)" : "rgba(190, 78, 55, 0.42)",
      strokeColor: "#d86b4c",
      badgeClass: "bg-[#7d382b]/52 text-[#ffc4b5] border-[#a94f38]/55",
      textColor: "text-[#ffc4b5]",
      cardClass: "border-[#a94f38]/55 bg-[#7d382b]/52",
    };
  }

  if (status === "reserved") {
    return {
      label: "Bron qilingan",
      fillColor: active ? "rgba(185, 145, 76, 0.62)" : "rgba(185, 145, 76, 0.42)",
      strokeColor: "#d8ac67",
      badgeClass: "bg-[#6d552f]/52 text-[#ffe0aa] border-[#b9914c]/55",
      textColor: "text-[#ffe0aa]",
      cardClass: "border-[#b9914c]/55 bg-[#6d552f]/52",
    };
  }

  return {
    label: "Mavjud",
    fillColor: active ? "rgba(133, 169, 110, 0.64)" : "rgba(133, 169, 110, 0.42)",
    strokeColor: "#9fd287",
    badgeClass: "bg-[#4b6740]/42 text-[#d9f5ce] border-[#9fd287]/45",
    textColor: "text-[#d9f5ce]",
    cardClass: "border-[#9fd287]/45 bg-[#4b6740]/42",
  };
}
