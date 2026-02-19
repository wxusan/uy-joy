"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ProjectTopView from "@/components/ProjectTopView";
import BuildingViewer from "@/components/BuildingViewer";
import FloorPlanSVG from "@/components/FloorPlanSVG";
import FloorPlanPolygon from "@/components/FloorPlanPolygon";
import UnitDetailModal from "@/components/UnitDetailModal";
import PriceLegend from "@/components/PriceLegend";

interface ProjectData {
  id: string;
  name: string;
  topViewImage: string | null;
  buildings: {
    id: string;
    name: string;
    positionData: string | null;
    frontViewImage: string | null;
    backViewImage: string | null;
    leftViewImage: string | null;
    rightViewImage: string | null;
    floors: {
      id: string;
      number: number;
      basePricePerM2: number | null;
      positionData: string | null;
      floorPlanImage: string | null;
      units: {
        id: string;
        unitNumber: string;
        rooms: number;
        area: number;
        status: string;
        pricePerM2: number | null;
        totalPrice: number | null;
        svgPathId: string | null;
        polygonData: string | null;
        labelX: number | null;
        labelY: number | null;
        sketchImage:  string | null;
        sketchImage2: string | null;
        sketchImage3: string | null;
        sketchImage4: string | null;
      }[];
    }[];
  }[];
}

interface Props {
  project: ProjectData;
}

type ViewStep = "project" | "building" | "floor";

export default function ExploreClient({ project }: Props) {
  const t = useTranslations("explore");
  const [currentStep, setCurrentStep] = useState<ViewStep>(
    project.buildings.length === 1 ? "building" : "project"
  );
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(
    project.buildings.length === 1 ? project.buildings[0].id : null
  );
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);

  // Get current building and floor
  const selectedBuilding = project.buildings.find(b => b.id === selectedBuildingId);
  const selectedFloor = selectedBuilding?.floors.find(f => f.id === selectedFloorId);

  // Handlers
  const handleBuildingSelect = (buildingId: string) => {
    setSelectedBuildingId(buildingId);
    setSelectedFloorId(null);
    setCurrentStep("building");
  };

  const handleFloorSelect = (floorId: string) => {
    setSelectedFloorId(floorId);
    setCurrentStep("floor");
  };

  const handleBackToProject = () => {
    setSelectedBuildingId(null);
    setSelectedFloorId(null);
    setCurrentStep("project");
  };

  const handleBackToBuilding = () => {
    setSelectedFloorId(null);
    setCurrentStep("building");
  };

  // Breadcrumb navigation
  const renderBreadcrumb = () => (
    <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
      <button
        onClick={handleBackToProject}
        className={`hover:text-emerald-600 transition ${currentStep === "project" ? "text-emerald-600 font-medium" : ""}`}
      >
        {project.name}
      </button>
      {selectedBuilding && (
        <>
          <span>/</span>
          <button
            onClick={handleBackToBuilding}
            className={`hover:text-emerald-600 transition ${currentStep === "building" ? "text-emerald-600 font-medium" : ""}`}
          >
            {selectedBuilding.name}
          </button>
        </>
      )}
      {selectedFloor && (
        <>
          <span>/</span>
          <span className="text-emerald-600 font-medium">
            {t("floor")} {selectedFloor.number}
          </span>
        </>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      {renderBreadcrumb()}

      {/* Header with legend */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {currentStep === "project" && project.name}
            {currentStep === "building" && selectedBuilding?.name}
            {currentStep === "floor" && `${t("floor")} ${selectedFloor?.number}`}
          </h2>
          <p className="text-sm text-slate-500">
            {currentStep === "project" && t("selectBuilding")}
            {currentStep === "building" && t("selectFloor")}
            {currentStep === "floor" && `${selectedFloor?.units.length} ${t("apartments")}`}
          </p>
        </div>
        <PriceLegend />
      </div>

      {/* Main content based on current step */}
      {currentStep === "project" && (
        <ProjectTopView
          topViewImage={project.topViewImage}
          buildings={project.buildings}
          onBuildingSelect={handleBuildingSelect}
        />
      )}

      {currentStep === "building" && selectedBuilding && (
        <BuildingViewer
          building={selectedBuilding}
          onFloorSelect={handleFloorSelect}
          onBack={project.buildings.length > 1 ? handleBackToProject : () => {}}
        />
      )}

      {currentStep === "floor" && selectedFloor && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">
              {t("floor")} {selectedFloor.number} — {selectedFloor.units.length} {t("apartments")}
            </h3>
            <button
              onClick={handleBackToBuilding}
              className="text-sm text-slate-500 hover:text-slate-700 transition"
            >
              ← {t("backToBuilding")}
            </button>
          </div>

          {/* Use polygon-based floor plan if units have polygon data, otherwise fallback */}
          {selectedFloor.units.some(u => u.polygonData) || selectedFloor.floorPlanImage ? (
            <FloorPlanPolygon
              units={selectedFloor.units}
              floorPlanImage={selectedFloor.floorPlanImage}
              basePricePerM2={selectedFloor.basePricePerM2}
              onUnitClick={(unit) =>
                setSelectedUnit({
                  ...unit,
                  floorNumber: selectedFloor.number,
                  basePricePerM2: selectedFloor.basePricePerM2,
                })
              }
            />
          ) : (
            /* Fallback to old SVG floor plan for legacy data */
            <FloorPlanSVG
              units={selectedFloor.units}
              basePricePerM2={selectedFloor.basePricePerM2}
              onUnitClick={(unit) =>
                setSelectedUnit({
                  ...unit,
                  floorNumber: selectedFloor.number,
                  basePricePerM2: selectedFloor.basePricePerM2,
                })
              }
            />
          )}
        </div>
      )}

      {/* Unit detail modal */}
      <UnitDetailModal unit={selectedUnit} onClose={() => setSelectedUnit(null)} />
    </div>
  );
}
