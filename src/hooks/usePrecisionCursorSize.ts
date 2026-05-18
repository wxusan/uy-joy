"use client";

import { useEffect, useRef, useState } from "react";

export default function usePrecisionCursorSize(baseSize = 1.6) {
  const initialDprRef = useRef<number | null>(null);
  const [size, setSize] = useState(baseSize);

  useEffect(() => {
    initialDprRef.current = window.devicePixelRatio || 1;

    const updateSize = () => {
      const initialDpr = initialDprRef.current || 1;
      const currentDpr = window.devicePixelRatio || initialDpr;
      const zoomRatio = Math.max(1, currentDpr / initialDpr);
      setSize(Math.max(0.55, baseSize / zoomRatio));
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    window.visualViewport?.addEventListener("resize", updateSize);

    return () => {
      window.removeEventListener("resize", updateSize);
      window.visualViewport?.removeEventListener("resize", updateSize);
    };
  }, [baseSize]);

  return size;
}
