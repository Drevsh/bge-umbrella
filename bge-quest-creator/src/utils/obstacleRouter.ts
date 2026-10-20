import { Position } from '@xyflow/react';
import { QuestModel, CampaignEdge } from '../types/campaign';

export interface ControlPoint {
  id?: string;
  x: number;
  y: number;
}

export interface HandlePosition extends ControlPoint {
  position: Position;
}

export interface ILine {
  start: ControlPoint;
  end: ControlPoint;
}

export interface NodeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoundingBox {
  uid: string;
  act: number;
  rawLeft: number;
  rawRight: number;
  rawTop: number;
  rawBottom: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export interface LoopbackChannelInfo {
  direction: 'UNDER' | 'OVER';
  exitX: number;
  entryX: number;
  channelY: number;
  nestIdx: number;
  bundleSize: number;
}

export interface SmartEdgeRoute {
  waypoints: ControlPoint[];
  isLoopback: boolean;
  hasObstacleDetour: boolean;
  loopbackChannel?: LoopbackChannelInfo;
}

const NODE_WIDTH = 280;
const NODE_MARGIN = 20; // Minimum clearance around cards

export function getNodeHeight(
  quest: QuestModel,
  measuredHeight?: number
): number {
  if (measuredHeight && measuredHeight > 80) {
    return measuredHeight;
  }
  const hasExploration = Boolean(
    quest.isExplorationStage || quest.category === 'EXPLORATION' || quest.explorationConfig
  );
  const hasVariants = Boolean(quest.variants && quest.variants.length > 0);
  const outcomesCount = quest.rewardOutcomes ? quest.rewardOutcomes.length : 0;
  return 112 + (hasExploration ? 28 : 0) + (hasVariants ? 32 : 0) + 32 + outcomesCount * 38 + 16;
}

export function getSourcePortCoords(
  quest: QuestModel,
  portId: string | null,
  nodeWidth: number = NODE_WIDTH
): ControlPoint {
  const x = quest.position.x + nodeWidth;
  const hasExploration = Boolean(
    quest.isExplorationStage || quest.category === 'EXPLORATION' || quest.explorationConfig
  );
  const hasVariants = Boolean(quest.variants && quest.variants.length > 0);
  const outcomesTop = 112 + (hasExploration ? 28 : 0) + (hasVariants ? 32 : 0) + 32;
  const rewardIdx = quest.rewardOutcomes.findIndex((r) => r.id === portId);
  const y =
    rewardIdx >= 0
      ? quest.position.y + outcomesTop + rewardIdx * 38 + 18
      : quest.position.y + 60;
  return { x, y };
}

export function getTargetPortCoords(quest: QuestModel): ControlPoint {
  return {
    x: quest.position.x,
    y: quest.position.y + 38
  };
}

// ============================================================================
// Geometry & Polyline Helpers (Adapted from idootop/reactflow-auto-layout)
// ============================================================================

let _ptCounter = 0;
export function nextPointId(prefix = 'pt'): string {
  _ptCounter = (_ptCounter + 1) % 1000000;
  return `${prefix}-${_ptCounter}`;
}

export function isHorizontalFromPosition(position: Position): boolean {
  return position === Position.Left || position === Position.Right;
}

export function getOffsetPoint(box: HandlePosition, offset: number): ControlPoint {
  switch (box.position) {
    case Position.Top:
      return { id: nextPointId(), x: box.x, y: box.y - offset };
    case Position.Bottom:
      return { id: nextPointId(), x: box.x, y: box.y + offset };
    case Position.Left:
      return { id: nextPointId(), x: box.x - offset, y: box.y };
    case Position.Right:
    default:
      return { id: nextPointId(), x: box.x + offset, y: box.y };
  }
}

export function getLineCenter(p1: ControlPoint, p2: ControlPoint): ControlPoint {
  return {
    id: nextPointId('center'),
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2
  };
}

export function isLineContainsPoint(
  start: ControlPoint,
  end: ControlPoint,
  p: ControlPoint
): boolean {
  return (
    (Math.abs(start.x - end.x) < 1 &&
      Math.abs(p.x - start.x) < 1 &&
      p.y <= Math.max(start.y, end.y) + 1 &&
      p.y >= Math.min(start.y, end.y) - 1) ||
    (Math.abs(start.y - end.y) < 1 &&
      Math.abs(p.y - start.y) < 1 &&
      p.x <= Math.max(start.x, end.x) + 1 &&
      p.x >= Math.min(start.x, end.x) - 1)
  );
}

export function isOnLine(p: ControlPoint, p1: ControlPoint, p2: ControlPoint): boolean {
  return (
    (Math.abs(p1.x - p.x) < 1 && Math.abs(p.x - p2.x) < 1) ||
    (Math.abs(p1.y - p.y) < 1 && Math.abs(p.y - p2.y) < 1)
  );
}

export function distance(p1: ControlPoint, p2: ControlPoint): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

export function isEqualPoint(p1: ControlPoint, p2: ControlPoint): boolean {
  return Math.abs(p1.x - p2.x) < 1 && Math.abs(p1.y - p2.y) < 1;
}

export function areLinesPerpendicular(
  p1: ControlPoint,
  p2: ControlPoint,
  p3: ControlPoint,
  p4: ControlPoint
): boolean {
  return (
    (Math.abs(p1.x - p2.x) < 1 && Math.abs(p3.y - p4.y) < 1) ||
    (Math.abs(p1.y - p2.y) < 1 && Math.abs(p3.x - p4.x) < 1)
  );
}

export function areLinesSameDirection(
  p1: ControlPoint,
  p2: ControlPoint,
  p3: ControlPoint,
  p4: ControlPoint
): boolean {
  return (
    (Math.abs(p1.x - p2.x) < 1 &&
      Math.abs(p3.x - p4.x) < 1 &&
      (p1.y - p2.y) * (p3.y - p4.y) > 0) ||
    (Math.abs(p1.y - p2.y) < 1 &&
      Math.abs(p3.y - p4.y) < 1 &&
      (p1.x - p2.x) * (p3.x - p4.x) > 0)
  );
}

export function areLinesReverseDirection(
  p1: ControlPoint,
  p2: ControlPoint,
  p3: ControlPoint,
  p4: ControlPoint
): boolean {
  return (
    (Math.abs(p1.x - p2.x) < 1 &&
      Math.abs(p3.x - p4.x) < 1 &&
      (p1.y - p2.y) * (p3.y - p4.y) < 0) ||
    (Math.abs(p1.y - p2.y) < 1 &&
      Math.abs(p3.y - p4.y) < 1 &&
      (p1.x - p2.x) * (p3.x - p4.x) < 0)
  );
}

export function isInLine(
  p: ControlPoint,
  p1: ControlPoint,
  p2: ControlPoint
): boolean {
  const minX = Math.min(p1.x, p2.x) - 1;
  const maxX = Math.max(p1.x, p2.x) + 1;
  const minY = Math.min(p1.y, p2.y) - 1;
  const maxY = Math.max(p1.y, p2.y) + 1;
  return (
    (Math.abs(p1.x - p.x) < 1 && Math.abs(p.x - p2.x) < 1 && p.y >= minY && p.y <= maxY) ||
    (Math.abs(p1.y - p.y) < 1 && Math.abs(p.y - p2.y) < 1 && p.x >= minX && p.x <= maxX)
  );
}

/**
 * Removes collinear interior points from a polyline sequence.
 */
export function reducePoints(points: ControlPoint[]): ControlPoint[] {
  if (points.length <= 2) return points;
  const deduped: ControlPoint[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    if (!isEqualPoint(points[i], deduped[deduped.length - 1])) {
      deduped.push(points[i]);
    }
  }
  if (deduped.length <= 2) return deduped;

  const optimized: ControlPoint[] = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i++) {
    if (!isInLine(deduped[i], optimized[optimized.length - 1], deduped[i + 1])) {
      optimized.push(deduped[i]);
    }
  }
  optimized.push(deduped[deduped.length - 1]);
  return optimized;
}

/**
 * Merges nearby coordinate values on X and Y axes to snap candidate grid lines cleanly.
 */
export function mergeClosePoints(
  points: ControlPoint[],
  threshold = 4
): ControlPoint[] {
  const positions = { x: [] as number[], y: [] as number[] };
  const findPosition = (axis: 'x' | 'y', v: number) => {
    const rounded = Math.round(v);
    const ps = positions[axis];
    let p = ps.find((e) => Math.abs(rounded - e) < threshold);
    if (p == null) {
      p = rounded;
      positions[axis].push(rounded);
    }
    return p;
  };

  return points.map((point) => ({
    ...point,
    x: findPosition('x', point.x),
    y: findPosition('y', point.y)
  }));
}

export function removeRepeatPoints(points: ControlPoint[]): ControlPoint[] {
  if (points.length === 0) return [];
  const lastP = points[points.length - 1];
  const uniquePoints = new Set([`${lastP.x}-${lastP.y}`]);
  const finalPoints: ControlPoint[] = [];
  points.forEach((p, idx) => {
    if (idx === points.length - 1) {
      finalPoints.push(p);
      return;
    }
    const key = `${p.x}-${p.y}`;
    if (!uniquePoints.has(key)) {
      uniquePoints.add(key);
      finalPoints.push(p);
    }
  });
  return finalPoints;
}

/**
 * When two nodes are directly connected or close, compute simple orthogonal path
 * (Directly adapted from idootop/reactflow-auto-layout/src/layout/edge/algorithms/simple.ts)
 */
export function getSimplePath({
  isDirectConnect,
  source,
  target,
  sourceOffset,
  targetOffset
}: {
  isDirectConnect?: boolean;
  source: ControlPoint;
  target: ControlPoint;
  sourceOffset: ControlPoint;
  targetOffset: ControlPoint;
}): ControlPoint[] {
  const points: ControlPoint[] = [];
  const sourceDirection = Math.abs(source.x - sourceOffset.x) < 1 ? 'vertical' : 'horizontal';
  const targetDirection = Math.abs(target.x - targetOffset.x) < 1 ? 'vertical' : 'horizontal';
  const isHorizontalLayout = sourceDirection === 'horizontal';

  if (isDirectConnect) {
    if (isHorizontalLayout) {
      if (sourceOffset.x <= targetOffset.x) {
        const centerX = (sourceOffset.x + targetOffset.x) / 2;
        return [
          { id: nextPointId(), x: centerX, y: sourceOffset.y },
          { id: nextPointId(), x: centerX, y: targetOffset.y }
        ];
      } else {
        const centerY = (sourceOffset.y + targetOffset.y) / 2;
        return [
          sourceOffset,
          { id: nextPointId(), x: sourceOffset.x, y: centerY },
          { id: nextPointId(), x: targetOffset.x, y: centerY },
          targetOffset
        ];
      }
    } else {
      if (sourceOffset.y <= targetOffset.y) {
        const centerY = (sourceOffset.y + targetOffset.y) / 2;
        return [
          { id: nextPointId(), x: sourceOffset.x, y: centerY },
          { id: nextPointId(), x: targetOffset.x, y: centerY }
        ];
      } else {
        const centerX = (sourceOffset.x + targetOffset.x) / 2;
        return [
          sourceOffset,
          { id: nextPointId(), x: centerX, y: sourceOffset.y },
          { id: nextPointId(), x: centerX, y: targetOffset.y },
          targetOffset
        ];
      }
    }
  }

  if (sourceDirection === targetDirection) {
    if (Math.abs(source.y - sourceOffset.y) < 1) {
      points.push({
        id: nextPointId(),
        x: sourceOffset.x,
        y: (sourceOffset.y + targetOffset.y) / 2
      });
      points.push({
        id: nextPointId(),
        x: targetOffset.x,
        y: (sourceOffset.y + targetOffset.y) / 2
      });
    } else {
      points.push({
        id: nextPointId(),
        x: (sourceOffset.x + targetOffset.x) / 2,
        y: sourceOffset.y
      });
      points.push({
        id: nextPointId(),
        x: (sourceOffset.x + targetOffset.x) / 2,
        y: targetOffset.y
      });
    }
  } else {
    let point: ControlPoint = { id: nextPointId(), x: sourceOffset.x, y: targetOffset.y };
    const inStart = isInLine(point, source, sourceOffset);
    const inEnd = isInLine(point, target, targetOffset);
    if (inStart || inEnd) {
      point = { id: nextPointId(), x: targetOffset.x, y: sourceOffset.y };
    } else {
      const onStart = isOnLine(point, source, sourceOffset);
      const onEnd = isOnLine(point, target, targetOffset);
      if (onStart && onEnd) {
        point = { id: nextPointId(), x: targetOffset.x, y: sourceOffset.y };
      }
    }
    points.push(point);
  }
  return [sourceOffset, ...points, targetOffset];
}

export function optimizeInputPoints(p: {
  edgePoints: ControlPoint[];
  source: HandlePosition;
  target: HandlePosition;
  sourceOffset: ControlPoint;
  targetOffset: ControlPoint;
}) {
  let edgePoints = mergeClosePoints([
    p.source,
    p.sourceOffset,
    ...p.edgePoints,
    p.targetOffset,
    p.target
  ]);
  const source = edgePoints.shift()!;
  const target = edgePoints.pop()!;
  const sourceOffset = edgePoints[0];
  const targetOffset = edgePoints[edgePoints.length - 1];

  if (isHorizontalFromPosition(p.source.position)) {
    source.x = Math.round(p.source.x);
  } else {
    source.y = Math.round(p.source.y);
  }
  if (isHorizontalFromPosition(p.target.position)) {
    target.x = Math.round(p.target.x);
  } else {
    target.y = Math.round(p.target.y);
  }

  edgePoints = removeRepeatPoints(edgePoints).map((pt, idx) => ({
    ...pt,
    id: `${idx + 1}`
  }));
  return { source, target, sourceOffset, targetOffset, edgePoints };
}

/**
 * Computes the complete orthogonal polyline `points` (including source at [0] and target at [length-1])
 * for rendering and Figma-like interactive segment dragging (idootop/reactflow-auto-layout).
 */
export function buildEditableEdgePoints(params: {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  offset?: number;
  waypoints?: ControlPoint[];
  smartRoute?: SmartEdgeRoute;
}): ControlPoint[] {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    offset = 20,
    waypoints = [],
    smartRoute
  } = params;

  const source: HandlePosition = {
    id: `source-${id}`,
    x: Math.round(sourceX),
    y: Math.round(sourceY),
    position: sourcePosition
  };
  const target: HandlePosition = {
    id: `target-${id}`,
    x: Math.round(targetX),
    y: Math.round(targetY),
    position: targetPosition
  };

  // 1. User-customized waypoints
  if (waypoints.length > 0) {
    const cloned = waypoints.map((wp, idx) => ({
      id: wp.id || `wp-${id}-${idx}`,
      x: Math.round(wp.x),
      y: Math.round(wp.y)
    }));
    // Keep end segments orthogonal to moving handles when endpoints shift
    if (cloned.length >= 1) {
      if (isHorizontalFromPosition(sourcePosition)) {
        cloned[0].y = source.y;
      } else {
        cloned[0].x = source.x;
      }
      const lastIdx = cloned.length - 1;
      if (isHorizontalFromPosition(targetPosition)) {
        cloned[lastIdx].y = target.y;
      } else {
        cloned[lastIdx].x = target.x;
      }
    }
    return reducePoints([source, ...cloned, target]);
  }

  // 2. Loopback U-Channel route
  const isLoopback = Boolean(smartRoute?.isLoopback || target.x <= source.x + 20);
  if (isLoopback) {
    const ch = smartRoute?.loopbackChannel;
    const nestIdx = ch?.nestIdx ?? 0;
    const exitX = Math.max(
      Math.round(source.x + 34 + nestIdx * 22),
      ch?.exitX ?? Math.round(Math.max(source.x, target.x) + 40)
    );
    const entryX = Math.min(
      Math.round(target.x - 34 - nestIdx * 22),
      ch?.entryX ?? Math.round(Math.min(source.x, target.x) - 40)
    );
    const channelY =
      ch?.channelY ?? Math.round(Math.max(source.y, target.y) + 95 + nestIdx * 30);

    const loopPts: ControlPoint[] = [
      { id: nextPointId(), x: exitX, y: source.y },
      { id: nextPointId(), x: exitX, y: channelY },
      { id: nextPointId(), x: entryX, y: channelY },
      { id: nextPointId(), x: entryX, y: target.y }
    ];
    return reducePoints([source, ...loopPts, target]);
  }

  // 3. A* Obstacle-Avoidance Route
  if (smartRoute?.waypoints && smartRoute.waypoints.length > 0) {
    return reducePoints([
      source,
      ...smartRoute.waypoints.map((wp, i) => ({
        id: `astar-${id}-${i}`,
        x: Math.round(wp.x),
        y: Math.round(wp.y)
      })),
      target
    ]);
  }

  // 4. Default Orthogonal Simple Path (idootop/reactflow-auto-layout)
  const sourceOffset = getOffsetPoint(source, offset);
  const targetOffset = getOffsetPoint(target, offset);
  const isDirectConnect = isHorizontalFromPosition(sourcePosition)
    ? source.x < target.x
    : source.y < target.y;

  const simplePts = getSimplePath({
    isDirectConnect,
    source,
    target,
    sourceOffset,
    targetOffset
  });

  const optimized = optimizeInputPoints({
    source,
    target,
    sourceOffset,
    targetOffset,
    edgePoints: simplePts
  });

  return reducePoints([optimized.source, ...optimized.edgePoints, optimized.target]);
}

/**
 * Finds the best position for an edge label along a polyline (from idootop/reactflow-auto-layout).
 * Prefers the middle segment if long enough, otherwise uses the midpoint of the longest segment.
 */
export function getLabelPosition(
  points: ControlPoint[],
  minGap = 36
): ControlPoint {
  if (points.length < 2) {
    return points[0] || { x: 0, y: 0 };
  }
  if (points.length % 2 === 0) {
    const mid1 = points[points.length / 2 - 1];
    const mid2 = points[points.length / 2];
    if (distance(mid1, mid2) > minGap) {
      return {
        x: (mid1.x + mid2.x) / 2,
        y: (mid1.y + mid2.y) / 2
      };
    }
  }
  let longestStart = points[0];
  let longestEnd = points[1];
  let maxDist = distance(longestStart, longestEnd);
  for (let i = 1; i < points.length - 1; i++) {
    const d = distance(points[i], points[i + 1]);
    if (d > maxDist) {
      maxDist = d;
      longestStart = points[i];
      longestEnd = points[i + 1];
    }
  }
  return {
    x: (longestStart.x + longestEnd.x) / 2,
    y: (longestStart.y + longestEnd.y) / 2
  };
}

/**
 * Builds an SVG path through a sequence of points using smooth quadratic rounded corners.
 */
export function getPathWithRoundCorners(
  pts: ControlPoint[],
  maxRadius: number = 16
): string {
  if (pts.length < 2) return '';
  if (pts.length === 2 || maxRadius <= 0) {
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }

  let path = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;

  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];

    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const len1 = Math.hypot(dx1, dy1);

    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    const len2 = Math.hypot(dx2, dy2);

    if (len1 < 2 || len2 < 2) {
      path += ` L ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
      continue;
    }

    const r = Math.min(maxRadius, len1 * 0.45, len2 * 0.45);
    const startX = curr.x - (dx1 / len1) * r;
    const startY = curr.y - (dy1 / len1) * r;
    const endX = curr.x + (dx2 / len2) * r;
    const endY = curr.y + (dy2 / len2) * r;

    path += ` L ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
  }

  const last = pts[pts.length - 1];
  path += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return path;
}

// Check if a 2D line segment intersects a 2D axis-aligned bounding box
export function lineSegmentIntersectsBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  box: { left: number; right: number; top: number; bottom: number }
): boolean {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  if (maxX <= box.left || minX >= box.right || maxY <= box.top || minY >= box.bottom) {
    return false;
  }

  let tmin = 0;
  let tmax = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (Math.abs(dx) < 1e-6) {
    if (x1 <= box.left || x1 >= box.right) return false;
  } else {
    const tx1 = (box.left - x1) / dx;
    const tx2 = (box.right - x1) / dx;
    const tNearX = Math.min(tx1, tx2);
    const tFarX = Math.max(tx1, tx2);
    tmin = Math.max(tmin, tNearX);
    tmax = Math.min(tmax, tFarX);
    if (tmin >= tmax) return false;
  }

  if (Math.abs(dy) < 1e-6) {
    if (y1 <= box.top || y1 >= box.bottom) return false;
  } else {
    const ty1 = (box.top - y1) / dy;
    const ty2 = (box.bottom - y1) / dy;
    const tNearY = Math.min(ty1, ty2);
    const tFarY = Math.max(ty1, ty2);
    tmin = Math.max(tmin, tNearY);
    tmax = Math.min(tmax, tFarY);
    if (tmin >= tmax) return false;
  }

  return true;
}

// ============================================================================
// A* Manhattan Orthogonal Pathfinder (Adapted from idootop/reactflow-auto-layout)
// ============================================================================

const estimateManhattanDistance = (p1: ControlPoint, p2: ControlPoint): number =>
  Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);

function computeAStarOrthogonalPath(params: {
  source: ControlPoint;
  target: ControlPoint;
  sourceOffset: ControlPoint;
  targetOffset: ControlPoint;
  obstacles: BoundingBox[];
  laneShift?: number;
}): ControlPoint[] {
  const { source, target, sourceOffset, targetOffset, obstacles, laneShift = 0 } = params;

  // Collect candidate X and Y grid lines from ports, offsets, midpoints, and obstacle boundaries
  const xCoords = new Set<number>([
    Math.round(sourceOffset.x),
    Math.round(targetOffset.x),
    Math.round((sourceOffset.x + targetOffset.x) / 2 + laneShift)
  ]);
  const yCoords = new Set<number>([
    Math.round(sourceOffset.y),
    Math.round(targetOffset.y),
    Math.round((sourceOffset.y + targetOffset.y) / 2 + laneShift)
  ]);

  obstacles.forEach((obs) => {
    xCoords.add(Math.round(obs.left - laneShift));
    xCoords.add(Math.round(obs.right + laneShift));
    yCoords.add(Math.round(obs.top - laneShift));
    yCoords.add(Math.round(obs.bottom + laneShift));
  });

  // Shrink obstacle boxes slightly for strict interior crossing check so lines can run along padded boundaries
  const strictObstacles = obstacles.map((o) => ({
    left: o.rawLeft - 10,
    right: o.rawRight + 10,
    top: o.rawTop - 10,
    bottom: o.rawBottom + 10
  }));

  const isPointInsideAnyObstacle = (p: ControlPoint): boolean => {
    return strictObstacles.some(
      (b) => p.x > b.left && p.x < b.right && p.y > b.top && p.y < b.bottom
    );
  };

  const isSegmentBlocked = (p1: ControlPoint, p2: ControlPoint): boolean => {
    return strictObstacles.some((b) => lineSegmentIntersectsBox(p1.x, p1.y, p2.x, p2.y, b));
  };

  const start: ControlPoint = { x: Math.round(sourceOffset.x), y: Math.round(sourceOffset.y) };
  const end: ControlPoint = { x: Math.round(targetOffset.x), y: Math.round(targetOffset.y) };

  const candidatePoints: ControlPoint[] = [start];
  const seenKeys = new Set<string>([`${start.x},${start.y}`, `${end.x},${end.y}`]);

  for (const x of xCoords) {
    for (const y of yCoords) {
      const key = `${x},${y}`;
      if (seenKeys.has(key)) continue;
      const pt = { x, y };
      if (!isPointInsideAnyObstacle(pt)) {
        seenKeys.add(key);
        candidatePoints.push(pt);
      }
    }
  }
  candidatePoints.push(end);

  const openSet: ControlPoint[] = [start];
  const closedSet = new Set<ControlPoint>();
  const cameFrom = new Map<ControlPoint, ControlPoint>();
  const gScore = new Map<ControlPoint, number>([[start, 0]]);

  const heuristic = (from: ControlPoint, to: ControlPoint): number => {
    const base = estimateManhattanDistance(to, end);
    // Reward continuing in the handle's exit/entry direction (idootop/reactflow-auto-layout heuristic)
    const startBonus =
      from === start && areLinesSameDirection(source, start, from, to) ? -18 : 0;
    const endBonus =
      to === end && areLinesSameDirection(from, to, end, target) ? -18 : 0;
    return base + startBonus + endBonus;
  };

  const fScore = new Map<ControlPoint, number>([[start, heuristic(start, start)]]);

  while (openSet.length > 0) {
    let currentIdx = 0;
    let lowestF = Infinity;
    for (let i = 0; i < openSet.length; i++) {
      const score = fScore.get(openSet[i]) ?? Infinity;
      if (score < lowestF) {
        lowestF = score;
        currentIdx = i;
      }
    }

    const current = openSet[currentIdx];
    if (current === end) {
      const path: ControlPoint[] = [current];
      let prev = cameFrom.get(current);
      while (prev) {
        path.push(prev);
        prev = cameFrom.get(prev);
      }
      return reducePoints(path.reverse());
    }

    openSet.splice(currentIdx, 1);
    closedSet.add(current);

    const prev = cameFrom.get(current);
    const curG = gScore.get(current) ?? 0;

    for (let i = 0; i < candidatePoints.length; i++) {
      const neighbor = candidatePoints[i];
      if (neighbor === current || closedSet.has(neighbor)) continue;

      // Orthogonal moves only
      const isOrtho = neighbor.x === current.x || neighbor.y === current.y;
      if (!isOrtho) continue;

      // Prevent 180-degree backtracking
      if (prev && areLinesReverseDirection(prev, current, current, neighbor)) {
        continue;
      }

      if (isSegmentBlocked(current, neighbor)) {
        continue;
      }

      // Add a small bend penalty whenever the path changes direction so A* prefers fewer corners
      const isTurn = prev && !areLinesSameDirection(prev, current, current, neighbor);
      const turnPenalty = isTurn ? 35 : 0;
      const tentativeG = curG + estimateManhattanDistance(current, neighbor) + turnPenalty;

      const existingG = gScore.get(neighbor) ?? Infinity;
      if (tentativeG >= existingG) continue;

      if (!openSet.includes(neighbor)) {
        openSet.push(neighbor);
      }
      cameFrom.set(neighbor, current);
      gScore.set(neighbor, tentativeG);
      fScore.set(neighbor, tentativeG + heuristic(current, neighbor));
    }
  }

  return reducePoints([start, end]);
}

/**
 * Computes rich obstacle-avoidance & loopback routing metadata for all campaign edges.
 * Incorporates A* Manhattan orthogonal routing from idootop/reactflow-auto-layout
 * and concentric U-channel bundling for loopback edges.
 */
export function computeSmartEdgeRoutes(
  quests: Record<string, QuestModel>,
  edges: CampaignEdge[],
  measuredSizes?: Record<string, { width: number; height: number }>
): Record<string, SmartEdgeRoute> {
  const boxesByUid: Record<string, BoundingBox> = {};
  const boxes: BoundingBox[] = Object.values(quests).map((q) => {
    const measured = measuredSizes?.[q.uid];
    const w = measured?.width && measured.width > 100 ? measured.width : NODE_WIDTH;
    const h = getNodeHeight(q, measured?.height);
    const box: BoundingBox = {
      uid: q.uid,
      act: q.act || 1,
      rawLeft: q.position.x,
      rawRight: q.position.x + w,
      rawTop: q.position.y,
      rawBottom: q.position.y + h,
      left: q.position.x - NODE_MARGIN,
      right: q.position.x + w + NODE_MARGIN,
      top: q.position.y - NODE_MARGIN,
      bottom: q.position.y + h + NODE_MARGIN,
      centerX: q.position.x + w / 2,
      centerY: q.position.y + h / 2
    };
    boxesByUid[q.uid] = box;
    return box;
  });

  const routes: Record<string, SmartEdgeRoute> = {};

  interface EdgeGeom {
    edge: CampaignEdge;
    srcQuest: QuestModel;
    tgtQuest: QuestModel;
    srcBox: BoundingBox;
    tgtBox: BoundingBox;
    start: ControlPoint;
    end: ControlPoint;
    isLoopback: boolean;
  }

  const loopbackGeoms: EdgeGeom[] = [];
  const forwardGeoms: EdgeGeom[] = [];

  edges.forEach((edge) => {
    const srcQuest = quests[edge.source];
    const tgtQuest = quests[edge.target];
    const srcBox = boxesByUid[edge.source];
    const tgtBox = boxesByUid[edge.target];
    if (!srcQuest || !tgtQuest || !srcBox || !tgtBox) return;

    const nodeW = srcBox.rawRight - srcBox.rawLeft;
    const start = getSourcePortCoords(srcQuest, edge.sourcePortId, nodeW);
    const end = getTargetPortCoords(tgtQuest);
    const isLoopback = edge.source === edge.target || end.x <= start.x + 24;

    const geom: EdgeGeom = {
      edge,
      srcQuest,
      tgtQuest,
      srcBox,
      tgtBox,
      start,
      end,
      isLoopback
    };

    if (isLoopback) {
      loopbackGeoms.push(geom);
    } else {
      forwardGeoms.push(geom);
    }
  });

  // 1. Process Loopback Edges in Overlapping Corridor Bundles
  const visitedLoopbacks = new Set<string>();
  const loopbackBundles: EdgeGeom[][] = [];

  loopbackGeoms.forEach((g) => {
    if (visitedLoopbacks.has(g.edge.id)) return;
    const bundle: EdgeGeom[] = [g];
    visitedLoopbacks.add(g.edge.id);

    const gAct = g.srcBox.act;
    let minX = Math.min(g.srcBox.rawLeft, g.tgtBox.rawLeft);
    let maxX = Math.max(g.srcBox.rawRight, g.tgtBox.rawRight);
    let minY = Math.min(g.srcBox.rawTop, g.tgtBox.rawTop);
    let maxY = Math.max(g.srcBox.rawBottom, g.tgtBox.rawBottom);

    loopbackGeoms.forEach((other) => {
      if (visitedLoopbacks.has(other.edge.id)) return;
      if (other.srcBox.act !== gAct) return;

      const oMinX = Math.min(other.srcBox.rawLeft, other.tgtBox.rawLeft);
      const oMaxX = Math.max(other.srcBox.rawRight, other.tgtBox.rawRight);
      const oMinY = Math.min(other.srcBox.rawTop, other.tgtBox.rawTop);
      const oMaxY = Math.max(other.srcBox.rawBottom, other.tgtBox.rawBottom);

      const xOverlaps = oMaxX >= minX - 60 && oMinX <= maxX + 60;
      const yOverlaps = oMaxY >= minY - 120 && oMinY <= maxY + 120;

      if (xOverlaps && yOverlaps) {
        bundle.push(other);
        visitedLoopbacks.add(other.edge.id);
        minX = Math.min(minX, oMinX);
        maxX = Math.max(maxX, oMaxX);
        minY = Math.min(minY, oMinY);
        maxY = Math.max(maxY, oMaxY);
      }
    });

    loopbackBundles.push(bundle);
  });

  loopbackBundles.forEach((bundle) => {
    const act = bundle[0].srcBox.act;
    const sameActBoxes = boxes.filter((b) => b.act === act);

    let corridorLeft = Math.min(...bundle.map((b) => Math.min(b.srcBox.rawLeft, b.tgtBox.rawLeft)));
    let corridorRight = Math.max(...bundle.map((b) => Math.max(b.srcBox.rawRight, b.tgtBox.rawRight)));
    let corridorTop = Math.min(...bundle.map((b) => Math.min(b.srcBox.rawTop, b.tgtBox.rawTop)));
    let corridorBottom = Math.max(...bundle.map((b) => Math.max(b.srcBox.rawBottom, b.tgtBox.rawBottom)));

    sameActBoxes.forEach((b) => {
      const horizInside = b.rawRight >= corridorLeft - 16 && b.rawLeft <= corridorRight + 16;
      const vertInside = b.rawBottom >= corridorTop - 16 && b.rawTop <= corridorBottom + 16;
      if (horizInside && vertInside) {
        corridorLeft = Math.min(corridorLeft, b.rawLeft);
        corridorRight = Math.max(corridorRight, b.rawRight);
        corridorTop = Math.min(corridorTop, b.rawTop);
        corridorBottom = Math.max(corridorBottom, b.rawBottom);
      }
    });

    const bundleDepth = 34 + bundle.length * 30;

    const underpassBlocked = sameActBoxes.some(
      (b) =>
        b.rawRight >= corridorLeft - 24 &&
        b.rawLeft <= corridorRight + 24 &&
        b.rawTop > corridorBottom - 10 &&
        b.rawTop < corridorBottom + bundleDepth + 20
    );

    const overpassBlocked = sameActBoxes.some(
      (b) =>
        b.rawRight >= corridorLeft - 24 &&
        b.rawLeft <= corridorRight + 24 &&
        b.rawBottom < corridorTop + 10 &&
        b.rawBottom > corridorTop - bundleDepth - 20
    );

    const direction: 'UNDER' | 'OVER' = underpassBlocked && !overpassBlocked ? 'OVER' : 'UNDER';

    const sortedBundle = [...bundle].sort((a, b) => {
      if (Math.abs(a.start.y - b.start.y) > 1) {
        return direction === 'UNDER' ? b.start.y - a.start.y : a.start.y - b.start.y;
      }
      return a.edge.id.localeCompare(b.edge.id);
    });

    sortedBundle.forEach((item, nestIdx) => {
      const exitX = Math.round(Math.max(item.start.x, corridorRight) + 34 + nestIdx * 22);
      const entryX = Math.round(Math.min(item.end.x, corridorLeft) - 34 - nestIdx * 22);
      const channelY =
        direction === 'UNDER'
          ? Math.round(corridorBottom + 32 + nestIdx * 30)
          : Math.round(corridorTop - 32 - nestIdx * 30);

      const waypoints = [
        { x: exitX, y: Math.round(item.start.y) },
        { x: exitX, y: channelY },
        { x: entryX, y: channelY },
        { x: entryX, y: Math.round(item.end.y) }
      ];

      routes[item.edge.id] = {
        waypoints,
        isLoopback: true,
        hasObstacleDetour: true,
        loopbackChannel: {
          direction,
          exitX,
          entryX,
          channelY,
          nestIdx,
          bundleSize: sortedBundle.length
        }
      };
    });
  });

  // 2. Process Forward Edges using A* Manhattan Orthogonal Routing when obstructed
  const obstacleDetourCounts: Record<string, number> = {};

  forwardGeoms.forEach((item) => {
    const { edge, srcBox, tgtBox, start, end } = item;
    const candidateObstacles = boxes.filter(
      (b) => b.act === srcBox.act && b.uid !== edge.source && b.uid !== edge.target
    );

    const offset = 24;
    const sourceOffset: ControlPoint = { x: start.x + offset, y: start.y };
    const targetOffset: ControlPoint = { x: end.x - offset, y: end.y };

    // Check if either the straight chord or the default orthogonal step path crosses any obstacle
    const midX = (start.x + end.x) / 2;
    const intersectingObstacles = candidateObstacles.filter(
      (b) =>
        lineSegmentIntersectsBox(start.x, start.y, end.x, end.y, b) ||
        lineSegmentIntersectsBox(start.x, start.y, midX, start.y, b) ||
        lineSegmentIntersectsBox(midX, start.y, midX, end.y, b) ||
        lineSegmentIntersectsBox(midX, end.y, end.x, end.y, b)
    );

    if (intersectingObstacles.length === 0) {
      routes[edge.id] = {
        waypoints: [],
        isLoopback: false,
        hasObstacleDetour: false
      };
      return;
    }

    const obsKey = intersectingObstacles
      .map((o) => o.uid)
      .sort()
      .join(',');
    const laneIdx = obstacleDetourCounts[obsKey] || 0;
    obstacleDetourCounts[obsKey] = laneIdx + 1;
    const laneShift = laneIdx * 18;

    const allRelevantObstacles = [srcBox, tgtBox, ...intersectingObstacles];
    const aStarWaypoints = computeAStarOrthogonalPath({
      source: start,
      target: end,
      sourceOffset,
      targetOffset,
      obstacles: allRelevantObstacles,
      laneShift
    });

    routes[edge.id] = {
      waypoints: aStarWaypoints,
      isLoopback: false,
      hasObstacleDetour: aStarWaypoints.length > 0
    };
  });

  return routes;
}

/**
 * Legacy helper returning raw waypoint arrays per edge ID.
 */
export function computeObstacleAvoidanceRoutes(
  quests: Record<string, QuestModel>,
  edges: CampaignEdge[],
  measuredSizes?: Record<string, { width: number; height: number }>
): Record<string, ControlPoint[]> {
  const smartRoutes = computeSmartEdgeRoutes(quests, edges, measuredSizes);
  const result: Record<string, ControlPoint[]> = {};
  Object.entries(smartRoutes).forEach(([id, route]) => {
    result[id] = route.waypoints;
  });
  return result;
}
