"use client";

import posthog from "posthog-js";
import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import ProjectTopView from "@/components/ProjectTopView";
import BuildingViewer from "@/components/BuildingViewer";
import FloorPlanView from "@/components/FloorPlanView";

interface ProjectData {
  id: string;
  name: string;
  topViewImage: string | null;
  telegramUrl?: string | null;
  buildings: {
    id: string;
    name: string;
    polygonData: { x: number; y: number }[] | null;
    frontViewImage: string | null;
    backViewImage: string | null;
    leftViewImage: string | null;
    rightViewImage: string | null;
    labelX: number | null;
    labelY: number | null;
    pointX: number | null;
    pointY: number | null;
    labelScale: number | null;
    floors: {
      id: string;
      number: number;
      basePricePerM2: number | null;
      positionData: {
        yStart?: number;
        yEnd?: number;
        polygon?: { x: number; y: number }[];
      } | string | null;
      floorPlanImage: string | null;
      units: {
        id: string;
        unitNumber: string;
        displayNumber: string;
        rooms: number;
        area: number;
        status: string;
        pricePerM2: number | null;
        totalPrice: number | null;
        polygonData: { x: number; y: number }[] | null;
        labelX: number | null;
        labelY: number | null;
        sketchImage: string | null;
        sketchImage2: string | null;
        sketchImage3: string | null;
        sketchImage4: string | null;
      }[];
    }[];
  }[];
}

interface Props {
  project: ProjectData;
  initialBuildingId?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroMinPricePerM2?: number | null;
  heroAvailableCount?: number;
  heroTotalCount?: number;
  heroExpectedYear?: number | null;
}

type ViewStep = "project" | "building" | "floor";
type ProjectUnit = ProjectData["buildings"][number]["floors"][number]["units"][number];
type SelectedUnit = ProjectUnit & {
  floorNumber: number;
  basePricePerM2: number | null;
  buildingName?: string;
};

export default function ExploreClient({
  project,
  initialBuildingId,
  heroTitle,
  heroSubtitle,
  heroMinPricePerM2,
  heroAvailableCount,
  heroTotalCount,
  heroExpectedYear,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read initial selection from URL (or prop fallback)
  const urlBuilding = searchParams.get("building");
  const urlFloor = searchParams.get("floor");

  const resolvedInitialBuilding =
    urlBuilding && project.buildings.some((b) => b.id === urlBuilding)
      ? urlBuilding
      : initialBuildingId && project.buildings.some((b) => b.id === initialBuildingId)
      ? initialBuildingId
      : project.buildings.length === 1
      ? project.buildings[0].id
      : null;

  const resolvedInitialFloor =
    urlFloor && resolvedInitialBuilding
      ? (() => {
          const b = project.buildings.find((b) => b.id === resolvedInitialBuilding);
          return b?.floors.some((f) => f.id === urlFloor) ? urlFloor : null;
        })()
      : null;

  const initialStep: ViewStep = resolvedInitialFloor
    ? "floor"
    : resolvedInitialBuilding
    ? "building"
    : "project";

  const [currentStep, setCurrentStep] = useState<ViewStep>(initialStep);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(resolvedInitialBuilding);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(resolvedInitialFloor);
  const [selectedUnit, setSelectedUnit] = useState<SelectedUnit | null>(null);

  // Update URL whenever navigation changes — so links are shareable
  const updateURL = (buildingId: string | null, floorId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (buildingId) params.set("building", buildingId);
    else params.delete("building");
    if (floorId) params.set("floor", floorId);
    else params.delete("floor");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Get current building and floor
  const selectedBuilding = project.buildings.find((b) => b.id === selectedBuildingId);
  const selectedFloor = selectedBuilding?.floors.find((f) => f.id === selectedFloorId);

  // Handlers
  const handleBuildingSelect = (buildingId: string) => {
    const building = project.buildings.find((b) => b.id === buildingId);
    if (building) {
      posthog.capture("Viewed Block", {
        block: building.name,
        project_name: project.name,
        source: "3D Visualizer",
      });
    }
    setSelectedBuildingId(buildingId);
    setSelectedFloorId(null);
    setSelectedUnit(null);
    setCurrentStep("building");
    updateURL(buildingId, null);
  };

  const handleBackToProject = () => {
    setSelectedBuildingId(null);
    setSelectedFloorId(null);
    setSelectedUnit(null);
    setCurrentStep("project");
    updateURL(null, null);
  };

  const handleBackToBuilding = () => {
    setSelectedFloorId(null);
    setSelectedUnit(null);
    setCurrentStep("building");
    updateURL(selectedBuildingId, null);
  };

  const handleFloorSelect = (floorId: string) => {
    if (!selectedBuildingId) return;
    setSelectedFloorId(floorId);
    setSelectedUnit(null);
    setCurrentStep("floor");
    updateURL(selectedBuildingId, floorId);
  };

  useEffect(() => {
    if (currentStep === "floor") {
      window.scrollTo(0, 0);
    }
  }, [currentStep, selectedFloorId]);

  const handleUnitSelect = (unit: ProjectUnit) => {
    if (!selectedFloor) return;

    const detailUnit = {
      ...unit,
      floorNumber: selectedFloor.number,
      basePricePerM2: selectedFloor.basePricePerM2,
      buildingName: selectedBuilding?.name,
    };

    setSelectedUnit(detailUnit);
  };

  const shellClassName =
    currentStep === "project"
      ? "w-full"
      : currentStep === "building" || currentStep === "floor"
      ? "w-full bg-[#090b0c]"
      : "w-full";

  return (
    <div className={shellClassName}>
      {/* Main content based on current step */}
      {currentStep === "project" && (
        <ProjectTopView
          topViewImage={project.topViewImage}
          buildings={project.buildings}
          heroTitle={heroTitle || project.name}
          heroSubtitle={heroSubtitle}
          minPricePerM2={heroMinPricePerM2}
          availableCount={heroAvailableCount}
          totalCount={heroTotalCount}
          expectedYear={heroExpectedYear}
          onBuildingSelect={handleBuildingSelect}
        />
      )}

      {currentStep === "building" && selectedBuilding && (
        <BuildingViewer
          building={selectedBuilding}
          onBack={project.buildings.length > 1 ? handleBackToProject : () => {}}
          onFloorSelect={handleFloorSelect}
        />
      )}

      {currentStep === "floor" && selectedBuilding && selectedFloor && (
        <FloorPlanView
          building={selectedBuilding}
          selectedFloor={selectedFloor}
          selectedFloorId={selectedFloorId}
          onFloorSelect={handleFloorSelect}
          onBackToBuilding={handleBackToBuilding}
          onBackToMaster={handleBackToProject}
          onUnitClick={handleUnitSelect}
          selectedUnit={selectedUnit}
          onUnitClose={() => setSelectedUnit(null)}
          telegramUrl={project.telegramUrl}
        />
      )}
    </div>
  );
}
