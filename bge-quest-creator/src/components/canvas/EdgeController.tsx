import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EdgeLabelRenderer, Position, useReactFlow } from '@xyflow/react';
import {
  ControlPoint,
  distance,
  getLineCenter,
  getOffsetPoint,
  isHorizontalFromPosition,
  isLineContainsPoint,
  isOnLine,
  nextPointId,
  removeRepeatPoints,
} from '../../utils/obstacleRouter';

export interface EdgeControllerParams {
  id: string;
  points: ControlPoint[];
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  offset?: number;
  accentColor?: string;
  onUpdateWaypoints: (edgeId: string, waypoints: ControlPoint[]) => void;
}

interface EdgeContext extends EdgeControllerParams {
  isHorizontalLayout: boolean;
  updatePoints: (points: ControlPoint[]) => void;
}

const getCursor = (isHorizontal: boolean, isDragging: boolean) => {
  if (isDragging) {
    return 'grabbing';
  }
  return isHorizontal ? 'ns-resize' : 'ew-resize';
};

export class SmartEdge {
  /**
   * Preserves drag identity across React re-renders when a segment splits into 3 segments
   * or merges with an adjacent parallel segment mid-drag (from idootop/reactflow-auto-layout).
   */
  static draggingEdge?: {
    dragId: string;
    target?: SmartEdge;
    start: ControlPoint;
    end: ControlPoint;
  };

  id: string | number;
  idx: number;
  start: ControlPoint;
  end: ControlPoint;
  center: ControlPoint;
  distance: number;
  isHorizontal: boolean;

  previous?: SmartEdge;
  next?: SmartEdge;

  ctx: EdgeContext;

  minGap = 10;
  handlerWidth = 4;
  handlerLength = 20;
  minHandlerWidth = 28;
  offset = 20;

  constructor(options: {
    id: string | number;
    idx: number;
    start: ControlPoint;
    end: ControlPoint;
    ctx: EdgeContext;
  }) {
    this.id = options.id;
    this.idx = options.idx;
    this.start = options.start;
    this.end = options.end;
    this.ctx = options.ctx;
    if (options.ctx.offset !== undefined) {
      this.offset = options.ctx.offset;
    }
    this.center = getLineCenter(options.start, options.end);
    this.distance = distance(options.start, options.end);
    this.isHorizontal = Math.abs(options.start.y - options.end.y) < 1;
  }

  get isSource() {
    return this.idx === 0;
  }

  get isTarget() {
    return this.idx === this.ctx.points.length - 2;
  }

  get isSourceOffset() {
    return (
      this.idx === 1 &&
      ((this.isHorizontal &&
        isHorizontalFromPosition(this.ctx.sourcePosition) &&
        Math.abs(this.start.x - this.ctx.points[0].x) < this.offset) ||
        (!this.isHorizontal &&
          !isHorizontalFromPosition(this.ctx.sourcePosition) &&
          Math.abs(this.start.y - this.ctx.points[0].y) < this.offset))
    );
  }

  get isTargetOffset() {
    const lastIdx = this.ctx.points.length - 1;
    return (
      this.idx === this.ctx.points.length - 3 &&
      ((this.isHorizontal &&
        isHorizontalFromPosition(this.ctx.targetPosition) &&
        Math.abs(this.end.x - this.ctx.points[lastIdx].x) < this.offset) ||
        (!this.isHorizontal &&
          !isHorizontalFromPosition(this.ctx.targetPosition) &&
          Math.abs(this.end.y - this.ctx.points[lastIdx].y) < this.offset))
    );
  }

  get canDrag() {
    if (this.isSource || this.isTarget) {
      return this.canSplit;
    }
    // Interior segments can always slide along their perpendicular axis;
    // show handle whenever the segment is at least 18px long or is the primary center bridge.
    const isPrimaryBridge = this.ctx.points.length === 4 && this.idx === 1;
    return isPrimaryBridge || this.distance >= 18;
  }

  get canSplit() {
    return this.distance >= this.minHandlerWidth + 2 * this.offset;
  }

  isValidPoints(points: ControlPoint[]): boolean {
    if (points.length < 2) return false;
    const sourceOffsetPoint = getOffsetPoint(
      {
        x: Math.round(this.ctx.sourceX),
        y: Math.round(this.ctx.sourceY),
        position: this.ctx.sourcePosition,
      },
      this.offset
    );
    const targetOffsetPoint = getOffsetPoint(
      {
        x: Math.round(this.ctx.targetX),
        y: Math.round(this.ctx.targetY),
        position: this.ctx.targetPosition,
      },
      this.offset
    );
    const isSourceValid = isLineContainsPoint(
      points[0],
      points[1],
      sourceOffsetPoint
    );
    const isTargetValid = isLineContainsPoint(
      points[points.length - 2],
      points[points.length - 1],
      targetOffsetPoint
    );
    return isSourceValid && isTargetValid;
  }

  splitPoints(dragId: string, _from: ControlPoint, to: ControlPoint): ControlPoint[] {
    let points = [...this.ctx.points];
    const startOffset = isOnLine(points[0], this.start, this.end)
      ? getOffsetPoint(
          {
            x: Math.round(this.ctx.sourceX),
            y: Math.round(this.ctx.sourceY),
            position: this.ctx.sourcePosition,
          },
          this.offset
        )
      : this.start;
    const endOffset = isOnLine(points[points.length - 1], this.start, this.end)
      ? getOffsetPoint(
          {
            x: Math.round(this.ctx.targetX),
            y: Math.round(this.ctx.targetY),
            position: this.ctx.targetPosition,
          },
          this.offset
        )
      : this.end;

    if (this.isSource && this.isTarget) {
      if (this.isHorizontal) {
        points = [
          this.start,
          { ...startOffset, id: nextPointId() },
          { x: startOffset.x, y: to.y, id: nextPointId() },
          { x: endOffset.x, y: to.y, id: nextPointId() },
          { ...endOffset, id: nextPointId() },
          this.end,
        ];
      } else {
        points = [
          this.start,
          { ...startOffset, id: nextPointId() },
          { x: to.x, y: startOffset.y, id: nextPointId() },
          { x: to.x, y: endOffset.y, id: nextPointId() },
          { ...endOffset, id: nextPointId() },
          this.end,
        ];
      }
      SmartEdge.draggingEdge = {
        dragId,
        start: points[2],
        end: points[3],
      };
    } else if (this.isSource || this.isSourceOffset) {
      if (this.isHorizontal) {
        points = [
          this.start,
          { ...startOffset, id: nextPointId() },
          { x: startOffset.x, y: to.y, id: nextPointId() },
          { x: this.end.x, y: to.y, id: nextPointId() },
          ...points.slice(this.idx + 2),
        ];
      } else {
        points = [
          this.start,
          { ...startOffset, id: nextPointId() },
          { x: to.x, y: startOffset.y, id: nextPointId() },
          { x: to.x, y: this.end.y, id: nextPointId() },
          ...points.slice(this.idx + 2),
        ];
      }
      if (this.isSourceOffset) {
        points = [points[0], ...points.slice(1)];
      }
      SmartEdge.draggingEdge = {
        dragId,
        start: points[2],
        end: points[3],
      };
    } else if (this.isTarget || this.isTargetOffset) {
      const sliceEnd = this.isTargetOffset ? -3 : -2;
      if (this.isHorizontal) {
        points = [
          ...points.slice(0, sliceEnd),
          { x: this.start.x, y: to.y, id: nextPointId() },
          { x: endOffset.x, y: to.y, id: nextPointId() },
          { ...endOffset, id: nextPointId() },
          this.end,
        ];
      } else {
        points = [
          ...points.slice(0, sliceEnd),
          { x: to.x, y: this.start.y, id: nextPointId() },
          { x: to.x, y: endOffset.y, id: nextPointId() },
          { ...endOffset, id: nextPointId() },
          this.end,
        ];
      }
      SmartEdge.draggingEdge = {
        dragId,
        start: points[points.length - 4],
        end: points[points.length - 3],
      };
    }

    if (!this.isValidPoints(points)) {
      return this.ctx.points;
    }

    return points;
  }

  mergePoints(
    dragId: string,
    _from: ControlPoint,
    to: ControlPoint
  ): {
    isMerged: boolean;
    points: ControlPoint[];
  } {
    let points = [...this.ctx.points];
    const startIdx = this.idx;

    const canMergePrevious =
      this.previous &&
      (this.isHorizontal
        ? Math.abs(to.y - this.previous.start.y) < this.minGap
        : Math.abs(to.x - this.previous.start.x) < this.minGap);

    const canMergeNext =
      this.next &&
      (this.isHorizontal
        ? Math.abs(to.y - this.next.start.y) < this.minGap
        : Math.abs(to.x - this.next.start.x) < this.minGap);

    if (canMergePrevious && canMergeNext) {
      points = [
        ...points.slice(0, startIdx - 2),
        this.previous!.start,
        this.next!.end,
        ...points.slice(startIdx + 4),
      ];
      if (!this.isValidPoints(points)) {
        return { isMerged: false, points: this.ctx.points };
      }
      SmartEdge.draggingEdge = {
        dragId,
        start: points[startIdx - 2],
        end: points[startIdx - 1],
      };
      return { isMerged: true, points };
    }

    if (canMergePrevious) {
      if (this.isHorizontal) {
        points[startIdx - 2] = { ...this.previous!.start };
        points[startIdx + 1] = {
          ...points[startIdx + 1],
          y: this.previous!.start.y,
        };
      } else {
        points[startIdx - 2] = { ...this.previous!.start };
        points[startIdx + 1] = {
          ...points[startIdx + 1],
          x: this.previous!.start.x,
        };
      }
      points = [
        ...points.slice(0, startIdx - 1),
        ...points.slice(startIdx + 1),
      ];
      if (!this.isValidPoints(points)) {
        return { isMerged: false, points: this.ctx.points };
      }
      SmartEdge.draggingEdge = {
        dragId,
        start: points[startIdx - 2],
        end: points[startIdx - 1],
      };
      return { isMerged: true, points };
    }

    if (canMergeNext) {
      if (this.isHorizontal) {
        points[startIdx] = {
          ...points[startIdx],
          y: this.next!.start.y,
        };
        points[startIdx + 3] = { ...this.next!.end };
      } else {
        points[startIdx] = {
          ...points[startIdx],
          x: this.next!.start.x,
        };
        points[startIdx + 3] = { ...this.next!.end };
      }
      points = [
        ...points.slice(0, startIdx + 1),
        ...points.slice(startIdx + 3),
      ];
      if (!this.isValidPoints(points)) {
        return { isMerged: false, points: this.ctx.points };
      }
      SmartEdge.draggingEdge = {
        dragId,
        start: points[startIdx],
        end: points[startIdx + 1],
      };
      return { isMerged: true, points };
    }

    return { isMerged: false, points };
  }

  onDrag(options: { dragId: string; from: ControlPoint; to: ControlPoint }) {
    const { dragId, from, to } = options;

    if (
      this.isSource ||
      this.isTarget ||
      this.isSourceOffset ||
      this.isTargetOffset
    ) {
      if (!this.canSplit) {
        return;
      }
      if (
        (this.isHorizontal && Math.abs(from.y - to.y) > this.minGap) ||
        (!this.isHorizontal && Math.abs(from.x - to.x) > this.minGap)
      ) {
        const split = this.splitPoints(dragId, from, to);
        this.ctx.updatePoints(split);
      }
      return;
    }

    const { isMerged, points } = this.mergePoints(dragId, from, to);
    if (isMerged) {
      this.ctx.updatePoints(points);
      return;
    }

    const startIdx = this.idx;
    if (this.isHorizontal) {
      points[startIdx] = { ...points[startIdx], y: to.y };
      points[startIdx + 1] = { ...points[startIdx + 1], y: to.y };
    } else {
      points[startIdx] = { ...points[startIdx], x: to.x };
      points[startIdx + 1] = { ...points[startIdx + 1], x: to.x };
    }

    if (!this.isValidPoints(points)) {
      return;
    }

    SmartEdge.draggingEdge = {
      dragId,
      start: points[startIdx],
      end: points[startIdx + 1],
    };
    this.ctx.updatePoints(points);
  }
}

export const getEdgeContext = (data: EdgeControllerParams) => {
  const ctx: EdgeContext = {
    ...data,
    isHorizontalLayout: isHorizontalFromPosition(data.sourcePosition),
    updatePoints: (points: ControlPoint[]) => {
      const cleaned = removeRepeatPoints(points);
      const interiorWaypoints = cleaned
        .slice(1, -1)
        .map((pt) => ({
          id: pt.id ?? nextPointId(),
          x: Math.round(pt.x),
          y: Math.round(pt.y),
        }));
      data.onUpdateWaypoints(data.id, interiorWaypoints);
    },
  };

  const smartEdges: SmartEdge[] = [];
  for (let i = 0; i < data.points.length - 1; i++) {
    const start = data.points[i];
    const end = data.points[i + 1];
    const edge = new SmartEdge({
      id: start.id ?? i,
      idx: i,
      start,
      end,
      ctx,
    });
    smartEdges.push(edge);
  }

  smartEdges.forEach((edge, idx) => {
    edge.previous = smartEdges[idx - 2];
    edge.next = smartEdges[idx + 2];
    if (
      SmartEdge.draggingEdge &&
      SmartEdge.draggingEdge.start.id === edge.start.id &&
      SmartEdge.draggingEdge.end.id === edge.end.id
    ) {
      SmartEdge.draggingEdge.target = edge;
    }
  });

  return { smartEdges, ctx };
};

const EdgeSegmentController: React.FC<{ edge: SmartEdge }> = ({ edge }) => {
  const { screenToFlowPosition } = useReactFlow();
  const dragId = useMemo(
    () => `${edge.ctx.id}#${edge.idx}#${Math.random().toString(36).slice(2, 7)}`,
    [edge.ctx.id, edge.idx]
  );
  const [isDragging, setIsDragging] = useState(false);

  const screenToFlowRef = useRef(screenToFlowPosition);
  screenToFlowRef.current = screenToFlowPosition;

  const edgeRef = useRef(edge);
  edgeRef.current = edge;

  useEffect(() => {
    return () => {
      if (SmartEdge.draggingEdge?.dragId === dragId) {
        SmartEdge.draggingEdge = undefined;
      }
    };
  }, [dragId]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (isDragging) return;

    setIsDragging(true);
    const startPos = screenToFlowRef.current({
      x: e.clientX,
      y: e.clientY,
    });

    SmartEdge.draggingEdge = {
      dragId,
      target: edgeRef.current,
      start: edgeRef.current.start,
      end: edgeRef.current.end,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (SmartEdge.draggingEdge?.dragId !== dragId) {
        cleanup();
        return;
      }
      const targetEdge = SmartEdge.draggingEdge.target ?? edgeRef.current;
      const toPos = screenToFlowRef.current({
        x: moveEvent.clientX,
        y: moveEvent.clientY,
      });
      targetEdge.onDrag({
        dragId,
        from: startPos,
        to: toPos,
      });
    };

    const cleanup = () => {
      setIsDragging(false);
      if (SmartEdge.draggingEdge?.dragId === dragId) {
        SmartEdge.draggingEdge = undefined;
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', cleanup);
      window.removeEventListener('pointercancel', cleanup);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', cleanup, { once: true });
    window.addEventListener('pointercancel', cleanup, { once: true });
  };

  const { isHorizontal, center, handlerWidth, handlerLength } = edge;
  const width = isHorizontal ? `${handlerLength}px` : `${handlerWidth}px`;
  const height = isHorizontal ? `${handlerWidth}px` : `${handlerLength}px`;
  const cursor = getCursor(isHorizontal, isDragging);
  const fillColor = edge.ctx.accentColor || '#3579f6';

  return (
    <EdgeLabelRenderer>
      <div
        className="nodrag nopan"
        onPointerDown={handlePointerDown}
        title={
          edge.isSource || edge.isTarget
            ? 'Drag to split segment into custom dogleg step'
            : 'Drag to slide segment (snaps & merges with aligned segments)'
        }
        style={{
          position: 'absolute',
          transform: `translate(-50%, -50%) translate(${center.x}px,${center.y}px)`,
          width: isHorizontal ? `${handlerLength + 10}px` : `${handlerWidth + 10}px`,
          height: isHorizontal ? `${handlerWidth + 10}px` : `${handlerLength + 10}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor,
          pointerEvents: 'all',
          zIndex: isDragging ? 45 : 35,
        }}
      >
        <div
          style={{
            width,
            height,
            borderRadius: '2px',
            background: fillColor,
            border: '1px solid #ffffff',
            boxShadow: isDragging
              ? `0 0 8px ${fillColor}, 0 1px 4px rgba(0,0,0,0.6)`
              : '0 1px 3px rgba(0,0,0,0.45)',
            transition: isDragging ? 'none' : 'transform 120ms ease',
            transform: isDragging ? 'scale(1.15)' : 'scale(1)',
          }}
        />
      </div>
    </EdgeLabelRenderer>
  );
};

export const EdgeControllers: React.FC<EdgeControllerParams> = (props) => {
  const { smartEdges } = getEdgeContext(props);
  return (
    <>
      {smartEdges.map((edge) =>
        edge.canDrag ? (
          <EdgeSegmentController
            key={`${edge.ctx.id}#${edge.idx}`}
            edge={edge}
          />
        ) : null
      )}
    </>
  );
};
