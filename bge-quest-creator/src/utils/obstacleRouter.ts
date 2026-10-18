import { QuestModel, CampaignEdge } from '../types/campaign';

interface BoundingBox {
  uid: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

const NODE_WIDTH = 280;
const NODE_MARGIN = 24; // Clearance around cards

function getNodeHeight(quest: QuestModel): number {
  return 130 + quest.rewardOutcomes.length * 28 + (quest.variants.length > 0 ? 30 : 0);
}

function getSourcePortCoords(quest: QuestModel, portId: string | null): { x: number; y: number } {
  const x = quest.position.x + NODE_WIDTH;
  const rewardIdx = quest.rewardOutcomes.findIndex((r) => r.id === portId);
  const y =
    rewardIdx >= 0
      ? quest.position.y + 130 + rewardIdx * 28
      : quest.position.y + 60;
  return { x, y };
}

function getTargetPortCoords(quest: QuestModel): { x: number; y: number } {
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
  // Broad-phase AABB test
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  if (maxX < box.left || minX > box.right || maxY < box.top || minY > box.bottom) {
    return false;
  }

  // Ray-box intersection (Liang-Barsky or slab method)
  let tmin = 0;
  let tmax = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;

  // X slab
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

  // Y slab
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

export function computeObstacleAvoidanceRoutes(
  quests: Record<string, QuestModel>,
  edges: CampaignEdge[]
): Record<string, { x: number; y: number }[]> {
  // 1. Build bounding boxes for all quest nodes
  const boxes: BoundingBox[] = Object.values(quests).map((q) => {
    const h = getNodeHeight(q);
    return {
      uid: q.uid,
      left: q.position.x - NODE_MARGIN,
      right: q.position.x + NODE_WIDTH + NODE_MARGIN,
      top: q.position.y - NODE_MARGIN,
      bottom: q.position.y + h + NODE_MARGIN,
      centerX: q.position.x + NODE_WIDTH / 2,
      centerY: q.position.y + h / 2
    };
  });

  const edgeWaypoints: Record<string, { x: number; y: number }[]> = {};

  // 2. For each edge, detect intervening obstacles
  edges.forEach((edge) => {
    const srcQuest = quests[edge.source];
    const tgtQuest = quests[edge.target];
    if (!srcQuest || !tgtQuest) return;

    const start = getSourcePortCoords(srcQuest, edge.sourcePortId);
    const end = getTargetPortCoords(tgtQuest);

    // Filter boxes that are not the source or target quest
    const candidateObstacles = boxes.filter(
      (b) => b.uid !== edge.source && b.uid !== edge.target
    );

    // Find all obstacles that intersect the direct path
    const intersectingObstacles = candidateObstacles.filter((b) =>
      lineSegmentIntersectsBox(start.x, start.y, end.x, end.y, b)
    );

    if (intersectingObstacles.length === 0) {
      // Clear waypoints if direct path is completely unobstructed
      edgeWaypoints[edge.id] = [];
      return;
    }

    // Sort intersecting obstacles by X coordinate along flow
    intersectingObstacles.sort((a, b) => a.centerX - b.centerX);

    const waypoints: { x: number; y: number }[] = [];

    intersectingObstacles.forEach((obs) => {
      // Decide whether to route above or below the obstacle
      const midY = (start.y + end.y) / 2;
      const distAbove = Math.abs(midY - obs.top);
      const distBelow = Math.abs(midY - obs.bottom);

      const routeAbove = distAbove <= distBelow;
      const detourY = routeAbove ? obs.top - 16 : obs.bottom + 16;

      // Add entry and exit waypoints around obstacle
      const entryX = Math.max(start.x + 20, obs.left - 18);
      const exitX = Math.min(end.x - 20, obs.right + 18);

      // Only add waypoints if they maintain forward progress or reasonable curvature
      if (entryX < exitX) {
        waypoints.push({ x: Math.round(entryX), y: Math.round(detourY) });
        waypoints.push({ x: Math.round(exitX), y: Math.round(detourY) });
      } else {
        waypoints.push({ x: Math.round(obs.centerX), y: Math.round(detourY) });
      }
    });

    edgeWaypoints[edge.id] = waypoints;
  });

  return edgeWaypoints;
}
