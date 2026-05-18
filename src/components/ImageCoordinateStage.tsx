"use client";

import Image from "next/image";
import { ReactNode, useEffect, useRef, useState } from "react";
import usePrecisionCursorSize from "@/hooks/usePrecisionCursorSize";

export type ImagePoint = { x: number; y: number };

interface Props {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className: string;
  imageClassName?: string;
  imageBoxClassName?: string;
  children?: ReactNode;
  onPointClick?: (point: ImagePoint) => void;
  onPointMouseMove?: (point: ImagePoint) => void;
  onStageMouseUp?: () => void;
  onStageMouseLeave?: () => void;
  precisionCursor?: boolean;
}

export default function ImageCoordinateStage({
  src,
  alt,
  sizes,
  priority = false,
  className,
  imageClassName = "",
  imageBoxClassName = "",
  children,
  onPointClick,
  onPointMouseMove,
  onStageMouseUp,
  onStageMouseLeave,
  precisionCursor = false,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imageBoxRef = useRef<HTMLDivElement>(null);
  const [imageAspect, setImageAspect] = useState<number | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [cursorPoint, setCursorPoint] = useState<ImagePoint | null>(null);
  const cursorSize = usePrecisionCursorSize();

  useEffect(() => {
    if (!stageRef.current) return;

    const observer = new ResizeObserver(([entry]) => {
      setStageSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);

  const imageBoxStyle = (() => {
    if (!imageAspect || !stageSize.width || !stageSize.height) return { inset: 0 };

    const stageAspect = stageSize.width / stageSize.height;
    if (stageAspect > imageAspect) {
      const width = (imageAspect / stageAspect) * 100;
      return { left: `${(100 - width) / 2}%`, top: 0, width: `${width}%`, height: "100%" };
    }

    const height = (stageAspect / imageAspect) * 100;
    return { left: 0, top: `${(100 - height) / 2}%`, width: "100%", height: `${height}%` };
  })();

  const getPointFromEvent = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!imageBoxRef.current) return { x: 0, y: 0 };

    const rect = imageBoxRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onPointClick) return;
    onPointClick(getPointFromEvent(event));
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const point = getPointFromEvent(event);
    if (precisionCursor) setCursorPoint(point);
    if (onPointMouseMove) onPointMouseMove(point);
  };

  const handleMouseLeave = () => {
    setCursorPoint(null);
    onStageMouseLeave?.();
  };

  return (
    <div ref={stageRef} className={className}>
      <div
        ref={imageBoxRef}
        className={`absolute overflow-hidden ${precisionCursor ? "cursor-none" : ""} ${imageBoxClassName}`}
        style={imageBoxStyle}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseUp={onStageMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          className={`pointer-events-none object-contain ${imageClassName}`}
          sizes={sizes}
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalWidth && image.naturalHeight) {
              setImageAspect(image.naturalWidth / image.naturalHeight);
            }
          }}
        />
        {children}
        {precisionCursor && cursorPoint && (
          <div
            className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black shadow-[0_0_0_0.6px_rgba(255,255,255,0.95),0_0_0_1px_rgba(0,0,0,0.34)]"
            style={{
              left: `${cursorPoint.x}%`,
              top: `${cursorPoint.y}%`,
              width: cursorSize,
              height: cursorSize,
            }}
          />
        )}
      </div>
    </div>
  );
}
