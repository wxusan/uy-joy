"use client";

import ApartmentLeadModal from "./ApartmentLeadModal";

interface Unit {
  id: string;
  unitNumber: string;
  displayNumber: string;
  rooms: number;
  area: number;
  status: string;
  pricePerM2: number | null;
  totalPrice: number | null;
  sketchImage: string | null;
  sketchImage2: string | null;
  sketchImage3: string | null;
  sketchImage4: string | null;
  floor: {
    number: number;
    basePricePerM2: number | null;
    building: { name: string };
  };
}

interface Props {
  unit: Unit;
  allUnits?: Unit[];
  telegramUrl?: string | null;
  onClose: () => void;
}

export default function ApartmentDetailModal({ unit, allUnits = [], telegramUrl, onClose }: Props) {
  return (
    <ApartmentLeadModal
      source="kvartiralar"
      onClose={onClose}
      telegramUrl={telegramUrl}
      allUnits={allUnits.map((item) => ({
        id: item.id,
        unitNumber: item.unitNumber,
        displayNumber: item.displayNumber,
        rooms: item.rooms,
        area: item.area,
        status: item.status,
        pricePerM2: item.pricePerM2,
        totalPrice: item.totalPrice,
        floorNumber: item.floor.number,
        basePricePerM2: item.floor.basePricePerM2,
        buildingName: item.floor.building.name,
        sketchImage: item.sketchImage,
        sketchImage2: item.sketchImage2,
        sketchImage3: item.sketchImage3,
        sketchImage4: item.sketchImage4,
      }))}
      unit={{
        id: unit.id,
        unitNumber: unit.unitNumber,
        displayNumber: unit.displayNumber,
        rooms: unit.rooms,
        area: unit.area,
        status: unit.status,
        pricePerM2: unit.pricePerM2,
        totalPrice: unit.totalPrice,
        floorNumber: unit.floor.number,
        basePricePerM2: unit.floor.basePricePerM2,
        buildingName: unit.floor.building.name,
        sketchImage: unit.sketchImage,
        sketchImage2: unit.sketchImage2,
        sketchImage3: unit.sketchImage3,
        sketchImage4: unit.sketchImage4,
      }}
    />
  );
}
