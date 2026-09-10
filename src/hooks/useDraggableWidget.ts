import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

export function useDraggableWidget(
  storageKey: string = 'kisaan_agent_widget_pos',
  onClickCallback?: () => void
) {
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
    targetEl: HTMLElement | null;
    pointerId: number | null;
  }>({
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    hasMoved: false,
    active: false,
    targetEl: null,
    pointerId: null,
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
      targetEl: e.currentTarget as HTMLElement,
      pointerId: e.pointerId,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active || !nodeRef.current) return;

    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (dist > 6) {
      if (!dragRef.current.hasMoved) {
        dragRef.current.hasMoved = true;
        setIsDragging(true);
        // Only capture pointer once actual movement is confirmed
        try {
          dragRef.current.targetEl?.setPointerCapture?.(e.pointerId);
        } catch (_) {}
      }

      const rect = nodeRef.current.getBoundingClientRect();
      const rawX = dragRef.current.origX + deltaX;
      const rawY = dragRef.current.origY + deltaY;
      const clamped = clampPosition(rawX, rawY, rect.width, rect.height);

      setPosition(clamped);
    }
  }, [clampPosition]);

  const onPointerUp = useCallback((_e: React.PointerEvent) => {
    if (!dragRef.current.active) return;

    const wasMoved = dragRef.current.hasMoved;
    const target = dragRef.current.targetEl;
    const pId = dragRef.current.pointerId;

    if (wasMoved && pId !== null) {
      try {
        target?.releasePointerCapture?.(pId);
      } catch (_) {}
    }

    dragRef.current.active = false;

    if (!wasMoved) {
      // Direct click / tap!
      onClickCallback?.();
    } else {
      setTimeout(() => {
        setIsDragging(false);
      }, 50);

      if (position) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(position));
        } catch (_) {}
      }
    }
  }, [position, storageKey, onClickCallback]);

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
