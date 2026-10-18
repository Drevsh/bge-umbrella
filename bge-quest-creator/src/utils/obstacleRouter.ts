import { QuestModel, CampaignEdge } from '../types/campaign';

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
  waypoints: { x: number; y: number }[];
  isLoopback: boolean;
  loopbackChannel?: LoopbackChannelInfo;
}

const NODE_WIDTH = 280;
const NODE_MARGIN = 22; // Clearance around cards

export function getNodeHeight(quest: QuestModel): number {
  const hasExploration = Boolean(
    quest.isExplorationStage || quest.category === 'EXPLORATION' || quest.explorationConfig
  );
  const hasVariants = Boolean(quest.variants && quest.variants.length > 0);
  const outcomesCount = quest.rewardOutcomes ? quest.rewardOutcomes.length : 0;
  return 112 + (hasExploration ? 28 : 0) + (hasVariants ? 32 : 0) + 32 + outcomesCount * 38 + 16;
}

export function getSourcePortCoords(quest: QuestModel, portId: string | null): { x: number; y: number } {
  const x = quest.position.x + NODE_WIDTH;
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

export function getTargetPortCoords(quest: QuestModel): { x: number; y: number } {
  return {
    x: quest.position.x,
    y: quest.position.y + 38
  };
}

// Check if a 2D line segment intersects a 2D axis-aligned bounding box
function lineSegmentIntersectsBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  box: BoundingBox
): boolean {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  if (maxX < box.left || minX > box.right || maxY < box.top || minY > box.bottom) {
    return false;
  }

  let tmin = 0;
  let tmax = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (Math.abs(dx) < 1e-6) {
    if (x1 < box.left || x1 > box.right) return false;
  } else {
    const tx1 = (box.left - x1) / dx;
    const tx2 = (box.right - x1) / dx;
    const tNearX = Math.min(tx1, tx2);
    const tFarX = Math.max(tx1, tx2);
    tmin = Math.max(tmin, tNearX);
    tmax = Math.min(tmax, tFarX);
    if (tmin > tmax) return false;
  }

  if (Math.abs(dy) < 1e-6) {
    if (y1 < box.top || y1 > box.bottom) return false;
  } else {
    const ty1 = (box.top - y1) / dy;
    const ty2 = (box.bottom - y1) / dy;
    const tNearY = Math.min(ty1, ty2);
    const tFarY = Math.max(ty1, ty2);
    tmin = Math.max(tmin, tNearY);
    tmax = Math.min(tmax, tFarY);
    if (tmin > tmax) return false;
  }

  return true;
}

/**
 * Computes rich obstacle-avoidance & loopback routing metadata for all campaign edges.
 */
export function computeSmartEdgeRoutes(
  quests: Record<string, QuestModel>,
  edges: CampaignEdge[]
): Record<string, SmartEdgeRoute> {
  const boxesByUid: Record<string, BoundingBox> = {};
  const boxes: BoundingBox[] = Object.values(quests).map((q) => {
    const h = getNodeHeight(q);
    const box: BoundingBox = {
      uid: q.uid,
      act: q.act || 1,
      rawLeft: q.position.x,
      rawRight: q.position.x + NODE_WIDTH,
      rawTop: q.position.y,
      rawBottom: q.position.y + h,
      left: q.position.x - NODE_MARGIN,
      right: q.position.x + NODE_WIDTH + NODE_MARGIN,
      top: q.position.y - NODE_MARGIN,
      bottom: q.position.y + h + NODE_MARGIN,
      centerX: q.position.x + NODE_WIDTH / 2,
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
    start: { x: number; y: number };
    end: { x: number; y: number };
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

    const start = getSourcePortCoords(srcQuest, edge.sourcePortId);
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
  // Group loopback edges that share the same Act and have overlapping X/Y spans
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

    // Compute initial envelope of all source & target boxes in the bundle
    let corridorLeft = Math.min(...bundle.map((b) => Math.min(b.srcBox.rawLeft, b.tgtBox.rawLeft)));
    let corridorRight = Math.max(...bundle.map((b) => Math.max(b.srcBox.rawRight, b.tgtBox.rawRight)));
    let corridorTop = Math.min(...bundle.map((b) => Math.min(b.srcBox.rawTop, b.tgtBox.rawTop)));
    let corridorBottom = Math.max(...bundle.map((b) => Math.max(b.srcBox.rawBottom, b.tgtBox.rawBottom)));

    // Expand envelope to include any intervening nodes sitting directly inside this span
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

    // Check if any node sits immediately below corridorBottom in the underpass zone
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

    // Prefer UNDER by default so bottom-half outcome handles never cross top-half forward edges
    const direction: 'UNDER' | 'OVER' = underpassBlocked && !overpassBlocked ? 'OVER' : 'UNDER';

    // Sort bundle for concentric PCB-style nesting (zero self-crossings):
    // For UNDER: lowest source port (largest start.y) is innermost (nestIdx = 0)
    // For OVER: highest source port (smallest start.y) is innermost (nestIdx = 0)
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

  // 2. Process Forward Edges (start.x < end.x)
  // Track how many forward edges detour around the same obstacle key to stagger them
  const obstacleDetourCounts: Record<string, number> = {};

  forwardGeoms.forEach((item) => {
    const { edge, srcBox, start, end } = item;
    const candidateObstacles = boxes.filter(
      (b) => b.act === srcBox.act && b.uid !== edge.source && b.uid !== edge.target
    );

    const intersectingObstacles = candidateObstacles.filter((b) =>
      lineSegmentIntersectsBox(start.x, start.y, end.x, end.y, b)
    );

    if (intersectingObstacles.length === 0) {
      routes[edge.id] = {
        waypoints: [],
        isLoopback: false
      };
      return;
    }

    intersectingObstacles.sort((a, b) => a.centerX - b.centerX);

    const obsKey = intersectingObstacles.map((o) => o.uid).join(',');
    const laneIdx = obstacleDetourCounts[obsKey] || 0;
    obstacleDetourCounts[obsKey] = laneIdx + 1;

    const minObsLeft = Math.min(...intersectingObstacles.map((o) => o.left));
    const maxObsRight = Math.max(...intersectingObstacles.map((o) => o.right));
    const minObsTop = Math.min(...intersectingObstacles.map((o) => o.top));
    const maxObsBottom = Math.max(...intersectingObstacles.map((o) => o.bottom));

    const midY = (start.y + end.y) / 2;
    const distAbove = Math.abs(midY - minObsTop);
    const distBelow = Math.abs(midY - maxObsBottom);

    const routeAbove = distAbove <= distBelow;
    const detourY = routeAbove
      ? minObsTop - 18 - laneIdx * 22
      : maxObsBottom + 18 + laneIdx * 22;

    const entryX = Math.max(start.x + 24, minObsLeft - 20);
    const exitX = Math.min(end.x - 24, maxObsRight + 20);

    const waypoints: { x: number; y: number }[] = [];
    if (entryX < exitX) {
      waypoints.push({ x: Math.round(entryX), y: Math.round(detourY) });
      waypoints.push({ x: Math.round(exitX), y: Math.round(detourY) });
    } else {
      waypoints.push({
        x: Math.round((minObsLeft + maxObsRight) / 2),
        y: Math.round(detourY)
      });
    }

    routes[edge.id] = {
      waypoints,
      isLoopback: false
    };
  });

  return routes;
}

/**
 * Legacy helper returning raw waypoint arrays per edge ID.
 */
export function computeObstacleAvoidanceRoutes(
  quests: Record<string, QuestModel>,
  edges: CampaignEdge[]
): Record<string, { x: number; y: number }[]> {
  const smartRoutes = computeSmartEdgeRoutes(quests, edges);
  const result: Record<string, { x: number; y: number }[]> = {};
  Object.entries(smartRoutes).forEach(([id, route]) => {
    result[id] = route.waypoints;
  });
  return result;
}
