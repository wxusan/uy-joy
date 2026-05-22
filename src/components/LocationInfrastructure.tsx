"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

interface NearbyPlace {
  category: string;
  categoryIcon: string;
  places: string[];
}

interface Props {
  latitude: number;
  longitude: number;
  infrastructure?: NearbyPlace[];
  address: string;
  brandName: string;
}

type PointKey = "school" | "metro" | "park" | "market";

const pointConfig: { key: PointKey; minutes: number; east: number; north: number; icon: string }[] = [
  { key: "school", minutes: 3, east: -1180, north: 60, icon: "school" },
  { key: "metro", minutes: 6, east: -610, north: -25, icon: "metro" },
  { key: "park", minutes: 4, east: 790, north: 50, icon: "park" },
  { key: "market", minutes: 5, east: 1430, north: -20, icon: "market" },
];

const iconSvg: Record<string, string> = {
  school:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-5 9 5-9 5-9-5Z"/><path d="M7 12.5v4.2c2.6 1.8 7.4 1.8 10 0v-4.2"/><path d="M21 10v6"/></svg>',
  metro:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="3" width="12" height="15" rx="3"/><path d="M9 18 7 21"/><path d="m15 18 2 3"/><path d="M8 8h8"/><path d="M9 13h.01"/><path d="M15 13h.01"/></svg>',
  park:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21v-7"/><path d="M8 14c-2.2 0-4-1.7-4-3.8C4 7.8 6.3 6 8.9 6.6 9.7 4.5 11.6 3 14 3c3 0 5.5 2.4 5.5 5.4 0 3.1-2.5 5.6-5.6 5.6H8Z"/></svg>',
  market:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h15l-2 8H8L6 4H3"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M9 11h9"/></svg>',
  building:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21h16"/><path d="M6 21V5l7-2v18"/><path d="M13 8h5v13"/><path d="M9 8h.01"/><path d="M9 12h.01"/><path d="M9 16h.01"/><path d="M16 12h.01"/><path d="M16 16h.01"/></svg>',
  tower:
    '<svg viewBox="0 0 72 72" aria-hidden="true"><path d="M19 61V17l17-7 17 7v44"/><path d="M36 61V10"/><path d="M26 25h4M26 35h4M26 45h4M42 25h4M42 35h4M42 45h4"/><path d="M13 61h46"/></svg>',
};

function offsetCoordinate(lng: number, lat: number, eastMeters: number, northMeters: number): [number, number] {
  const earthMetersPerDegree = 111_320;
  const nextLat = lat + northMeters / earthMetersPerDegree;
  const nextLng = lng + eastMeters / (earthMetersPerDegree * Math.cos((lat * Math.PI) / 180));

  return [nextLng, nextLat];
}

function createPlaceMarker(label: string, minutes: number, unit: string, icon: string) {
  const marker = document.createElement("div");
  marker.className = "location-map-marker";

  const dot = document.createElement("span");
  dot.className = "location-map-dot";
  marker.appendChild(dot);

  const labelWrap = document.createElement("span");
  labelWrap.className = "location-map-label";
  labelWrap.innerHTML = `
    <span class="location-map-icon">${iconSvg[icon]}</span>
    <span class="location-map-copy">
      <strong>${label}</strong>
      <em>${minutes} ${unit}</em>
    </span>
  `;
  marker.appendChild(labelWrap);

  return marker;
}

function createResidenceMarker(labels: Record<string, string>, brandName: string) {
  const marker = document.createElement("div");
  marker.className = "location-residence-marker";
  marker.innerHTML = `
    <span class="location-residence-name">${brandName}</span>
    <span class="location-residence-sub">${labels.residence}</span>
    <span class="location-residence-platform">
      <span class="location-residence-tower">${iconSvg.tower}</span>
      <span class="location-residence-shadow"></span>
    </span>
  `;

  return marker;
}

export default function LocationInfrastructure({ latitude, longitude, infrastructure, address, brandName }: Props) {
  const t = useTranslations("project");
  const tl = useTranslations("location");
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  const labels = {
    subtitle: tl("subtitle"),
    view: tl("viewOnMap"),
    residence: "Residence",
    school: tl("school"),
    metro: tl("metro"),
    park: tl("park"),
    market: tl("market"),
    min: tl("minAbbr"),
  };

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!mapContainerRef.current || mapRef.current) return;

      const maplibregl = await import("maplibre-gl");
      if (cancelled || !mapContainerRef.current) return;

      const center: [number, number] = [longitude, latitude];
      const points = pointConfig.map((point) => ({
        ...point,
        coord: offsetCoordinate(longitude, latitude, point.east, point.north),
      }));
      const routeCoordinates: [number, number][] = [
        offsetCoordinate(longitude, latitude, -1750, -40),
        offsetCoordinate(longitude, latitude, -1420, 20),
        points[0].coord,
        offsetCoordinate(longitude, latitude, -900, 35),
        points[1].coord,
        offsetCoordinate(longitude, latitude, -260, -10),
        center,
        offsetCoordinate(longitude, latitude, 390, -15),
        points[2].coord,
        offsetCoordinate(longitude, latitude, 1120, 10),
        points[3].coord,
        offsetCoordinate(longitude, latitude, 1840, -55),
      ];

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            cartoDark: {
              type: "raster",
              tiles: [
                "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
              ],
              tileSize: 256,
              attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
            },
          },
          layers: [
            {
              id: "cartoDark",
              type: "raster",
              source: "cartoDark",
              paint: {
                "raster-opacity": 0.86,
                "raster-saturation": -0.65,
                "raster-contrast": 0.28,
                "raster-brightness-min": 0.02,
                "raster-brightness-max": 0.72,
              },
            },
          ],
        },
        center,
        zoom: 14,
        pitch: 0,
        bearing: -7,
        interactive: false,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on("load", () => {
        if (cancelled) return;

        map.addSource("uyjoy-route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: routeCoordinates,
            },
          },
        });

        map.addLayer({
          id: "uyjoy-route-glow",
          type: "line",
          source: "uyjoy-route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "rgba(205, 91, 61, 0.33)",
            "line-width": 13,
            "line-blur": 8,
          },
        });

        map.addLayer({
          id: "uyjoy-route-soft",
          type: "line",
          source: "uyjoy-route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "rgba(177, 86, 61, 0.46)",
            "line-width": 9,
          },
        });

        map.addLayer({
          id: "uyjoy-route-main",
          type: "line",
          source: "uyjoy-route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#c66348",
            "line-width": 3,
          },
        });

        map.addLayer({
          id: "uyjoy-route-highlight",
          type: "line",
          source: "uyjoy-route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "rgba(255, 212, 162, 0.74)",
            "line-width": 0.9,
          },
        });

        points.forEach((point) => {
          new maplibregl.Marker({
            element: createPlaceMarker(labels[point.key], point.minutes, labels.min, point.icon),
            anchor: "bottom",
            offset: [0, 8],
          })
            .setLngLat(point.coord)
            .addTo(map);
        });

        new maplibregl.Marker({
          element: createResidenceMarker(labels, brandName),
          anchor: "bottom",
          offset: [0, 18],
        })
          .setLngLat(center)
          .addTo(map);

        const bounds = new maplibregl.LngLatBounds(routeCoordinates[0], routeCoordinates[0]);
        routeCoordinates.forEach((coord) => bounds.extend(coord));
        map.fitBounds(bounds, {
          padding: { top: 38, bottom: 30, left: 300, right: 58 },
          duration: 0,
          maxZoom: 15.6,
        });
      });
    }

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [address, brandName, labels, latitude, longitude]);

  const openMap = () => {
    window.open(mapUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <section id="location" className="bg-[#f4efe7]">
      <div
        role="link"
        tabIndex={0}
        onClick={openMap}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openMap();
          }
        }}
        className="group/location relative block h-[270px] cursor-pointer overflow-hidden border-y border-[#2f2b25] bg-[#11110f] text-white shadow-[0_28px_80px_rgba(18,16,13,0.22)] md:h-[220px]"
        aria-label={`${labels.view}: ${address}`}
      >
        <div ref={mapContainerRef} className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_54%_48%,rgba(201,99,72,0.16),transparent_24%),linear-gradient(90deg,rgba(8,9,8,0.98)_0%,rgba(8,9,8,0.78)_22%,rgba(8,9,8,0.24)_46%,rgba(8,9,8,0.78)_100%)]" />

        <div className="pointer-events-none relative z-10 grid h-full grid-cols-1 md:grid-cols-[245px_minmax(0,1fr)] lg:grid-cols-[290px_minmax(0,1fr)]">
          <div className="flex flex-col justify-center px-8 py-7 md:px-11">
            <div className="mb-4 h-[2px] w-14 bg-[#c66348]" />
            <h2 className="font-display text-[34px] font-semibold leading-none tracking-normal text-[#fff8ec] md:text-[39px]">
              {t("location")}
            </h2>
            <p className="mt-3 max-w-[190px] text-[13px] font-medium leading-5 text-[#d8c8b5]">
              {labels.subtitle}
            </p>
            <span className="mt-5 inline-flex items-center gap-3 font-heading text-[13px] font-semibold text-[#c66348] transition-colors group-hover/location:text-[#f09572]">
              {labels.view}
              <ArrowRight className="h-4 w-4 transition-transform group-hover/location:translate-x-1" strokeWidth={1.7} />
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-3 right-4 z-10 text-[9px] font-medium text-[#b9aa9c]/50">
          © OpenStreetMap © CARTO
        </div>
      </div>
    </section>
  );
}
