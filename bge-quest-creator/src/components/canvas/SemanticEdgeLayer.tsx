import React, { memo, useCallback } from 'react';
import {
  Edge,
  EdgeProps,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  EdgeLabelRenderer,
  BaseEdge,
  useReactFlow
} from '@xyflow/react';
import { RotateCcw, X, Plus, Trash2, CornerDownLeft } from 'lucide-react';
import { EdgeRelationType, EdgeRoutingStyle } from '../../types/campaign';
import { SmartEdgeRoute } from '../../utils/obstacleRouter';
import { useCampaignStore } from '../../store/useCampaignStore';

export type SemanticEdgeType = Edge<{
  type: EdgeRelationType;
  routingStyle: EdgeRoutingStyle;
  stateTag?: string | null;
  label?: string;
  isActive?: boolean;
  waypoints?: { x: number; y: number }[];
  smartRoute?: SmartEdgeRoute;
}>;

const EDGE_COLORS: Record<EdgeRelationType, string> = {
  UNLOCKS: '#10b981',      // Emerald
  CHOICE_BRANCH: '#38bdf8',// Sky Cyan
  MUTATION: '#f59e0b',     // Amber
  LOCKOUT: '#ef4444',      // Rose Red
  TIME_TRIGGER: '#14b8a6', // Teal
  TIME_EXPIRED: '#f43f5e'  // Rose
};

/**
 * Builds an SVG path through a sequence of points using smooth quadratic rounded corners.
 * Unlike unconstrained Catmull-Rom splines, rounded orthogonal/polyline paths are convex-bounded
 * and guaranteed never to bow inward into quest card bounding boxes.
 */
function buildRoundedWaypointPath(
  pts: { x: number; y: number }[],
  maxRadius: number = 24
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

export const SemanticEdge = memo((props: EdgeProps<SemanticEdgeType>) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
    selected
  } = props;

  const { screenToFlowPosition } = useReactFlow();
  const updateEdgeWaypoints = useCampaignStore((s) => s.updateEdgeWaypoints);
  const clearEdgeWaypoints = useCampaignStore((s) => s.clearEdgeWaypoints);
  const deleteEdge = useCampaignStore((s) => s.deleteEdge);

  const edgeType: EdgeRelationType = data?.type || 'UNLOCKS';
  const routingStyle: EdgeRoutingStyle = data?.routingStyle || 'BEZIER';
  const color = EDGE_COLORS[edgeType] || '#94a3b8';
  const isActive = Boolean(data?.isActive);
  const waypoints = data?.waypoints || [];
  const smartRoute = data?.smartRoute;

  const isLoopback = Boolean(smartRoute?.isLoopback || targetX <= sourceX + 20);
  const cornerRadius = routingStyle === 'STRAIGHT' ? 0 : routingStyle === 'STEP' ? 14 : 24;

  let edgePath = '';
  let labelX = (sourceX + targetX) / 2;
  let labelY = (sourceY + targetY) / 2;
  let effectiveAutoWaypoints: { x: number; y: number }[] = [];

  if (waypoints.length > 0) {
    // 1. User-defined manual waypoints
    const allPts = [{ x: sourceX, y: sourceY }, ...waypoints, { x: targetX, y: targetY }];
    edgePath = buildRoundedWaypointPath(allPts, cornerRadius);

    if (waypoints.length >= 2) {
      const midIdx = Math.floor(waypoints.length / 2);
      const pA = waypoints[midIdx - 1];
      const pB = waypoints[midIdx];
      labelX = (pA.x + pB.x) / 2;
      labelY = (pA.y + pB.y) / 2;
    } else {
      labelX = waypoints[0].x;
      labelY = waypoints[0].y - 16;
    }
  } else if (isLoopback) {
    // 2. Automatic U-Channel Loopback Routing (Underpass / Overpass)
    const ch = smartRoute?.loopbackChannel;
    const nestIdx = ch?.nestIdx ?? 0;
    const bundleSize = ch?.bundleSize ?? 1;

    const exitX = Math.max(
      Math.round(sourceX + 34 + nestIdx * 22),
      ch?.exitX ?? Math.round(Math.max(sourceX, targetX) + 40)
    );
    const entryX = Math.min(
      Math.round(targetX - 34 - nestIdx * 22),
      ch?.entryX ?? Math.round(Math.min(sourceX, targetX) - 40)
    );
    const channelY =
      ch?.channelY ?? Math.round(Math.max(sourceY, targetY) + 95 + nestIdx * 30);

    effectiveAutoWaypoints = [
      { x: exitX, y: Math.round(sourceY) },
      { x: exitX, y: channelY },
      { x: entryX, y: channelY },
      { x: entryX, y: Math.round(targetY) }
    ];

    const allPts = [
      { x: sourceX, y: sourceY },
      ...effectiveAutoWaypoints,
      { x: targetX, y: targetY }
    ];

    edgePath = buildRoundedWaypointPath(allPts, cornerRadius);

    // Place label along the dedicated horizontal bypass track, staggered per lane
    const midChannelX = (exitX + entryX) / 2;
    const staggerX = bundleSize > 1 ? (nestIdx - (bundleSize - 1) / 2) * 58 : 0;
    labelX = midChannelX + staggerX;
    labelY = channelY;
  } else if (smartRoute?.waypoints && smartRoute.waypoints.length > 0) {
    // 3. Automatic Forward Obstacle-Avoidance Detour
    effectiveAutoWaypoints = smartRoute.waypoints;
    const allPts = [
      { x: sourceX, y: sourceY },
      ...effectiveAutoWaypoints,
      { x: targetX, y: targetY }
    ];
    edgePath = buildRoundedWaypointPath(allPts, cornerRadius);

    if (effectiveAutoWaypoints.length >= 2) {
      labelX = (effectiveAutoWaypoints[0].x + effectiveAutoWaypoints[1].x) / 2;
      labelY = (effectiveAutoWaypoints[0].y + effectiveAutoWaypoints[1].y) / 2;
    } else {
      labelX = effectiveAutoWaypoints[0].x;
      labelY = effectiveAutoWaypoints[0].y;
    }
  } else if (routingStyle === 'STEP') {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 16
    });
  } else if (routingStyle === 'STRAIGHT') {
    [edgePath, labelX, labelY] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY
    });
  } else {
    // Default unobstructed forward BEZIER
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      curvature: 0.35
    });
  }

  const isDashed =
    edgeType === 'MUTATION' ||
    edgeType === 'LOCKOUT' ||
    edgeType === 'TIME_TRIGGER' ||
    edgeType === 'TIME_EXPIRED';
  const strokeDasharray = isDashed ? '6,6' : undefined;

  // Drag waypoint handler
  const handleWaypointPointerDown = useCallback(
    (index: number, e: React.PointerEvent) => {
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const onPointerMove = (moveEvt: PointerEvent) => {
        const flowPos = screenToFlowPosition({ x: moveEvt.clientX, y: moveEvt.clientY });
        const updated = [...waypoints];
        updated[index] = { x: Math.round(flowPos.x), y: Math.round(flowPos.y) };
        updateEdgeWaypoints(id, updated);
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [id, waypoints, screenToFlowPosition, updateEdgeWaypoints]
  );

  const handleDeleteWaypoint = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const filtered = waypoints.filter((_, i) => i !== index);
      updateEdgeWaypoints(id, filtered);
    },
    [id, waypoints, updateEdgeWaypoints]
  );

  return (
    <>
      {/* Main Visible Edge Line (React Flow instruments this with its interaction layer) */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={typeof markerEnd === 'string' ? markerEnd : undefined}
        style={{
          stroke: selected ? '#818cf8' : color,
          strokeWidth: selected ? 3.5 : isActive ? 3 : 2,
          strokeDasharray,
          filter: selected
            ? 'drop-shadow(0 0 8px rgba(129, 140, 248, 0.8))'
            : isActive
            ? `drop-shadow(0 0 6px ${color})`
            : undefined,
          opacity: isActive || selected ? 1 : 0.85
        }}
        className={isActive && isDashed ? 'animate-edge-flow' : ''}
      />

      {/* Edge Label & Waypoints Controls */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all'
          }}
          className="nodrag nopan flex items-center gap-1.5 z-20"
        >
          {data?.label && (
            <span
              style={{
                borderColor: `${color}99`,
                color: color
              }}
              className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-950/95 border shadow-md backdrop-blur-sm whitespace-nowrap flex items-center gap-1"
              title={isLoopback ? `Loopback connection: ${data.label}` : data.label}
            >
              {isLoopback && <CornerDownLeft className="w-2.5 h-2.5 opacity-90 shrink-0" />}
              <span>{data.label}</span>
            </span>
          )}

          {/* Add bend button when edge is selected */}
          {selected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (waypoints.length === 0 && effectiveAutoWaypoints.length > 0) {
                  updateEdgeWaypoints(id, [...effectiveAutoWaypoints]);
                } else {
                  const newWp = {
                    x: Math.round(labelX),
                    y: Math.round(labelY - 24)
                  };
                  updateEdgeWaypoints(id, [...waypoints, newWp]);
                }
              }}
              className="px-1.5 py-0.5 rounded-full bg-indigo-950/90 border border-indigo-700/80 hover:bg-indigo-900 text-[10px] text-indigo-300 hover:text-white flex items-center gap-1 shadow-md transition-colors cursor-pointer"
              title="Customize bend waypoints on this edge"
            >
              <Plus className="w-2.5 h-2.5 text-indigo-400" />
              <span>+ Bend</span>
            </button>
          )}

          {/* Reset custom waypoints button if edge has custom bends */}
          {waypoints.length > 0 && selected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearEdgeWaypoints(id);
              }}
              className="px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 hover:border-amber-500 text-[10px] text-slate-300 hover:text-amber-300 flex items-center gap-1 shadow-md transition-colors cursor-pointer"
              title="Reset to automatic obstacle-free route"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Auto Route
            </button>
          )}

          {/* Delete edge button when selected */}
          {selected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteEdge(id);
              }}
              className="px-1.5 py-0.5 rounded-full bg-rose-950/90 border border-rose-700/80 hover:bg-rose-900 text-[10px] text-rose-300 hover:text-white flex items-center gap-1 shadow-md transition-colors cursor-pointer"
              title="Delete this connection"
            >
              <Trash2 className="w-2.5 h-2.5" />
              Delete
            </button>
          )}
        </div>

        {/* Draggable Waypoint Handles (Visible when edge is selected) */}
        {selected &&
          waypoints.map((wp, idx) => (
            <div
              key={idx}
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${wp.x}px,${wp.y}px)`,
                pointerEvents: 'all',
                zIndex: 1000
              }}
              className="nodrag nopan group"
              onPointerDown={(e) => handleWaypointPointerDown(idx, e)}
              onContextMenu={(e) => handleDeleteWaypoint(idx, e)}
            >
              <div
                className="w-4 h-4 rounded-full border-2 border-slate-900 bg-indigo-400 hover:bg-indigo-300 shadow-lg cursor-grab active:cursor-grabbing hover:scale-125 transition-transform flex items-center justify-center relative"
                title="Drag to bend curve • Click X or Right-click to remove"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                <button
                  type="button"
                  onClick={(e) => handleDeleteWaypoint(idx, e)}
                  className="absolute -top-2 -right-2 w-3.5 h-3.5 bg-rose-600 hover:bg-rose-500 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  title="Remove this waypoint"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          ))}
      </EdgeLabelRenderer>
    </>
  );
});

SemanticEdge.displayName = 'SemanticEdge';
