export interface UnitWithFloor {
  id: string;
  unitNumber: string;
  floorId: string;
  rooms: number;
  area: number;
  status: string;
  pricePerM2: number | null;
  totalPrice: number | null;
  svgPathId: string | null;
  description: string | null;
  floor: {
    id: string;
    number: number;
    basePricePerM2: number | null;
    building: {
      id: string;
      name: string;
    };
  };
}

export interface FloorWithUnits {
  id: string;
  number: number;
  basePricePerM2: number | null;
  units: {
    id: string;
    unitNumber: string;
    rooms: number;
    area: number;
    status: string;
    pricePerM2: number | null;
    totalPrice: number | null;
    svgPathId: string | null;
  }[];
}

export interface BuildingWithFloors {
  id: string;
  name: string;
  floors: FloorWithUnits[];
}

export interface ProjectFull {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  coverImage: string | null;
  buildings: BuildingWithFloors[];
}
