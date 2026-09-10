import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

export function useDraggableWidget(storageKey: string = 'kisaan_agent_widget_pos') {
  const [position, setPosition] = useState<Position | null>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (_) {}
    return null;
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    hasMoved: boolean;
    active: boolean;
  }>({
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    hasMoved: false,
    active: false,
  });

  const nodeRef = useRef<HTMLDivElement | null>(null);

  // Clamp position within current screen bounds
  const clampPosition = useCallback((x: number, y: number, nodeWidth: number, nodeHeight: number): Position => {
    const maxX = Math.max(0, window.innerWidth - nodeWidth - 10);
    const maxY = Math.max(0, window.innerHeight - nodeHeight - 10);
    return {
      x: Math.min(Math.max(10, x), maxX),
      y: Math.min(Math.max(10, y), maxY),
    };
  }, []);

  // Window resize handler to keep widget inside viewport
  useEffect(() => {
    const handleResize = () => {
      if (position && nodeRef.current) {
        const rect = nodeRef.current.getBoundingClientRect();
        const clamped = clampPosition(position.x, position.y, rect.width, rect.height);
        if (clamped.x !== position.x || clamped.y !== position.y) {
          setPosition(clamped);
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, clampPosition]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (!nodeRef.current) return;
    const rect = nodeRef.current.getBoundingClientRect();

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
      hasMoved: false,
      active: true,
    };

    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch (_) {}
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active || !nodeRef.current) return;

    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (dist > 5) {
      if (!dragRef.current.hasMoved) {
        dragRef.current.hasMoved = true;
        setIsDragging(true);
      }

      const rect = nodeRef.current.getBoundingClientRect();
      const rawX = dragRef.current.origX + deltaX;
      const rawY = dragRef.current.origY + deltaY;
      const clamped = clampPosition(rawX, rawY, rect.width, rect.height);

      setPosition(clamped);
    }
  }, [clampPosition]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch (_) {}

    const wasDragging = dragRef.current.hasMoved;
    dragRef.current.active = false;

    // Small delay to allow click event suppression
    setTimeout(() => {
      setIsDragging(false);
    }, 50);

    if (wasDragging && position) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(position));
      } catch (_) {}
    }
  }, [position, storageKey]);

  return {
    nodeRef,
    position,
    isDragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  };
}
