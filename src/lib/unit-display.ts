export function computeDisplayNumber(unitNumber: string, floorNumber: number) {
  if (/^\d{1,2}$/.test(unitNumber)) {
    return `${floorNumber}${unitNumber.padStart(2, "0")}`;
  }

  return unitNumber;
}
