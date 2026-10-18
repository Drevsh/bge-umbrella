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
import { RotateCcw, X, Plus, Trash2 } from 'lucide-react';
import { EdgeRelationType, EdgeRoutingStyle } from '../../types/campaign';
import { useCampaignStore } from '../../store/useCampaignStore';

export type SemanticEdgeType = Edge<{
  type: EdgeRelationType;
  routingStyle: EdgeRoutingStyle;
  stateTag?: string | null;
  label?: string;
  isActive?: boolean;
  waypoints?: { x: number; y: number }[];
}>;

const EDGE_COLORS: Record<EdgeRelationType, string> = {
  UNLOCKS: '#10b981',      // Emerald
  CHOICE_BRANCH: '#38bdf8',// Sky Cyan
  MUTATION: '#f59e0b',     // Amber
  LOCKOUT: '#ef4444'       // Rose Red
};

// Catmull-Rom to Cubic Bezier conversion for smooth multi-waypoint curves
function buildMultiPointCurve(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) {
    const dx = (pts[1].x - pts[0].x) * 0.4;
    return `M ${pts[0].x} ${pts[0].y} C ${pts[0].x + dx} ${pts[0].y}, ${pts[1].x - dx} ${pts[1].y}, ${pts[1].x} ${pts[1].y}`;
  }

  let path = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? i : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 5;
    const cp1y = p1.y + (p2.y - p0.y) / 5;
    const cp2x = p2.x - (p3.x - p1.x) / 5;
    const cp2y = p2.y - (p3.y - p1.y) / 5;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x} ${p2.y}`;
  }
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

  let edgePath = '';
  let labelX = (sourceX + targetX) / 2;
  let labelY = (sourceY + targetY) / 2;

  if (waypoints.length > 0) {
    // Custom multi-waypoint path
    const allPts = [{ x: sourceX, y: sourceY }, ...waypoints, { x: targetX, y: targetY }];
    edgePath = buildMultiPointCurve(allPts);

    // Position label near middle waypoint
    const midIdx = Math.floor(waypoints.length / 2);
    labelX = waypoints[midIdx].x;
    labelY = waypoints[midIdx].y - 18;
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
    // Default BEZIER
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

  const isDashed = edgeType === 'MUTATION' || edgeType === 'LOCKOUT';
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

      const onPointerUp = (upEvt: PointerEvent) => {
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
          opacity: isActive || selected ? 1 : 0.8
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
          className="nodrag nopan flex items-center gap-1.5"
        >
          {data?.label && (
            <span
              style={{
                borderColor: `${color}88`,
                color: color
              }}
              className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full bg-slate-950/90 border shadow-sm backdrop-blur-sm whitespace-nowrap"
            >
              {data.label}
            </span>
          )}

          {/* Add bend button when edge is selected */}
          {selected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const newWp = {
                  x: Math.round((sourceX + targetX) / 2),
                  y: Math.round((sourceY + targetY) / 2 - 30)
                };
                updateEdgeWaypoints(id, [...waypoints, newWp]);
              }}
              className="px-1.5 py-0.5 rounded-full bg-indigo-950/90 border border-indigo-700/80 hover:bg-indigo-900 text-[10px] text-indigo-300 hover:text-white flex items-center gap-1 shadow-md transition-colors"
              title="Add a bend waypoint to this edge"
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
              className="px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 hover:border-amber-500 text-[10px] text-slate-300 hover:text-amber-300 flex items-center gap-1 shadow-md transition-colors"
              title="Reset to default route"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Reset
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
              className="px-1.5 py-0.5 rounded-full bg-rose-950/90 border border-rose-700/80 hover:bg-rose-900 text-[10px] text-rose-300 hover:text-white flex items-center gap-1 shadow-md transition-colors"
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
