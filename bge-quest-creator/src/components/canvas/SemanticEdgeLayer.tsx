import React, { memo, useCallback } from 'react';
import {
  Edge,
  EdgeProps,
  getBezierPath,
  getStraightPath,
  EdgeLabelRenderer,
  BaseEdge,
  useReactFlow
} from '@xyflow/react';
import { RotateCcw, X, Plus, Trash2, CornerDownLeft } from 'lucide-react';
import { EdgeRelationType, EdgeRoutingStyle } from '../../types/campaign';
import {
  SmartEdgeRoute,
  ControlPoint,
  getPathWithRoundCorners,
  getLabelPosition,
  reducePoints,
  distance
} from '../../utils/obstacleRouter';
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

function areEdgePropsEqual(
  prev: EdgeProps<SemanticEdgeType>,
  next: EdgeProps<SemanticEdgeType>
): boolean {
  if (
    prev.id !== next.id ||
    Boolean(prev.selected) !== Boolean(next.selected) ||
    Math.abs(prev.sourceX - next.sourceX) > 0.5 ||
    Math.abs(prev.sourceY - next.sourceY) > 0.5 ||
    Math.abs(prev.targetX - next.targetX) > 0.5 ||
    Math.abs(prev.targetY - next.targetY) > 0.5 ||
    prev.markerEnd !== next.markerEnd
  ) {
    return false;
  }
  const pData = prev.data;
  const nData = next.data;
  if (pData === nData) return true;
  if (!pData || !nData) return false;
  if (
    pData.type !== nData.type ||
    pData.routingStyle !== nData.routingStyle ||
    pData.label !== nData.label ||
    Boolean(pData.isActive) !== Boolean(nData.isActive) ||
    pData.waypoints !== nData.waypoints ||
    pData.smartRoute !== nData.smartRoute
  ) {
    return false;
  }
  return true;
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
  const cornerRadius = routingStyle === 'STRAIGHT' ? 0 : routingStyle === 'STEP' ? 14 : 20;

  let edgePath = '';
  let labelX = (sourceX + targetX) / 2;
  let labelY = (sourceY + targetY) / 2;
  let effectiveAutoWaypoints: ControlPoint[] = [];

  if (waypoints.length > 0) {
    // 1. User-defined manual waypoints
    const allPts: ControlPoint[] = [{ x: sourceX, y: sourceY }, ...waypoints, { x: targetX, y: targetY }];
    edgePath = getPathWithRoundCorners(allPts, cornerRadius);
    const lblPos = getLabelPosition(allPts);
    labelX = lblPos.x;
    labelY = lblPos.y;
    effectiveAutoWaypoints = waypoints;
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

    const allPts: ControlPoint[] = [
      { x: sourceX, y: sourceY },
      ...effectiveAutoWaypoints,
      { x: targetX, y: targetY }
    ];

    edgePath = getPathWithRoundCorners(allPts, cornerRadius);

    const midChannelX = (exitX + entryX) / 2;
    const staggerX = bundleSize > 1 ? (nestIdx - (bundleSize - 1) / 2) * 58 : 0;
    labelX = midChannelX + staggerX;
    labelY = channelY;
  } else if (smartRoute?.waypoints && smartRoute.waypoints.length > 0) {
    // 3. Automatic Forward A* Manhattan Obstacle-Avoidance Detour (idootop/reactflow-auto-layout)
    effectiveAutoWaypoints = smartRoute.waypoints;
    const allPts: ControlPoint[] = [
      { x: sourceX, y: sourceY },
      ...effectiveAutoWaypoints,
      { x: targetX, y: targetY }
    ];
    edgePath = getPathWithRoundCorners(allPts, cornerRadius);
    const lblPos = getLabelPosition(allPts);
    labelX = lblPos.x;
    labelY = lblPos.y;
  } else if (routingStyle === 'STEP') {
    // 4. Orthogonal Step Path with interactive middle segment
    const midX = Math.round((sourceX + targetX) / 2);
    if (Math.abs(sourceY - targetY) > 2) {
      effectiveAutoWaypoints = [
        { x: midX, y: Math.round(sourceY) },
        { x: midX, y: Math.round(targetY) }
      ];
    }
    const allPts: ControlPoint[] = [
      { x: sourceX, y: sourceY },
      ...effectiveAutoWaypoints,
      { x: targetX, y: targetY }
    ];
    edgePath = getPathWithRoundCorners(allPts, 14);
    const lblPos = getLabelPosition(allPts);
    labelX = lblPos.x;
    labelY = lblPos.y;
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

  // Drag individual waypoint handle (rAF-throttled)
  const handleWaypointPointerDown = useCallback(
    (index: number, e: React.PointerEvent) => {
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const baseWaypoints = waypoints.length > 0 ? waypoints : effectiveAutoWaypoints;
      let rafId: number | null = null;

      const onPointerMove = (moveEvt: PointerEvent) => {
        if (rafId !== null) return;
        const clientX = moveEvt.clientX;
        const clientY = moveEvt.clientY;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          const flowPos = screenToFlowPosition({ x: clientX, y: clientY });
          const updated = [...baseWaypoints];
          updated[index] = { x: Math.round(flowPos.x), y: Math.round(flowPos.y) };
          updateEdgeWaypoints(id, updated);
        });
      };

      const onPointerUp = () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [id, waypoints, effectiveAutoWaypoints, screenToFlowPosition, updateEdgeWaypoints]
  );

  // Figma-style orthogonal segment drag handler (inspired by idootop/reactflow-auto-layout EdgeController)
  const handleSegmentPointerDown = useCallback(
    (wpIndexA: number, wpIndexB: number, isHorizontal: boolean, e: React.PointerEvent) => {
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const initialWaypoints = (waypoints.length > 0 ? waypoints : effectiveAutoWaypoints).map((p) => ({
        ...p
      }));
      let latestWaypoints = initialWaypoints;
      let rafId: number | null = null;

      const onPointerMove = (moveEvt: PointerEvent) => {
        if (rafId !== null) return;
        const clientX = moveEvt.clientX;
        const clientY = moveEvt.clientY;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          const flowPos = screenToFlowPosition({ x: clientX, y: clientY });
          const updated = latestWaypoints.map((p) => ({ ...p }));
          if (isHorizontal) {
            const newY = Math.round(flowPos.y);
            if (updated[wpIndexA]) updated[wpIndexA].y = newY;
            if (updated[wpIndexB]) updated[wpIndexB].y = newY;
          } else {
            const newX = Math.round(flowPos.x);
            if (updated[wpIndexA]) updated[wpIndexA].x = newX;
            if (updated[wpIndexB]) updated[wpIndexB].x = newX;
          }
          latestWaypoints = updated;
          updateEdgeWaypoints(id, updated);
        });
      };

      const onPointerUp = () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        // Merge/reduce collinear points after segment drag (idootop/reactflow-auto-layout mergePoints)
        const allPts: ControlPoint[] = [
          { x: Math.round(sourceX), y: Math.round(sourceY) },
          ...latestWaypoints,
          { x: Math.round(targetX), y: Math.round(targetY) }
        ];
        const reduced = reducePoints(allPts).slice(1, -1);
        updateEdgeWaypoints(id, reduced);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [
      id,
      waypoints,
      effectiveAutoWaypoints,
      sourceX,
      sourceY,
      targetX,
      targetY,
      screenToFlowPosition,
      updateEdgeWaypoints
    ]
  );

  const handleDeleteWaypoint = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const baseWaypoints = waypoints.length > 0 ? waypoints : effectiveAutoWaypoints;
      const filtered = baseWaypoints.filter((_, i) => i !== index);
      updateEdgeWaypoints(id, filtered);
    },
    [id, waypoints, effectiveAutoWaypoints, updateEdgeWaypoints]
  );

  // Active waypoints available for editing when edge is selected
  const editableWaypoints = waypoints.length > 0 ? waypoints : effectiveAutoWaypoints;

  return (
    <>
      {/* Main Visible Edge Line */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={typeof markerEnd === 'string' ? markerEnd : undefined}
        style={{
          stroke: selected ? '#818cf8' : color,
          strokeWidth: selected ? 3.5 : isActive ? 3 : 2,
          strokeDasharray,
          filter: selected ? 'drop-shadow(0 0 6px rgba(129, 140, 248, 0.7))' : undefined,
          opacity: isActive || selected ? 1 : 0.85
        }}
        className={isActive && isDashed ? 'animate-edge-flow' : ''}
      />

      {/* Edge Label & Interactive Waypoint / Segment Controls */}
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
              className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-950 border shadow-md whitespace-nowrap flex items-center gap-1"
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
              className="px-1.5 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/80 hover:bg-indigo-900 text-[10px] text-indigo-300 hover:text-white flex items-center gap-1 shadow-md transition-colors cursor-pointer"
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
              className="px-1.5 py-0.5 rounded-full bg-rose-950 border border-rose-700/80 hover:bg-rose-900 text-[10px] text-rose-300 hover:text-white flex items-center gap-1 shadow-md transition-colors cursor-pointer"
              title="Delete this connection"
            >
              <Trash2 className="w-2.5 h-2.5" />
              Delete
            </button>
          )}
        </div>

        {/* Figma-style Orthogonal Segment Drag Bars (idootop/reactflow-auto-layout EdgeControllers) */}
        {selected &&
          editableWaypoints.length >= 2 &&
          editableWaypoints.slice(0, -1).map((wpA, idx) => {
            const wpB = editableWaypoints[idx + 1];
            const segLen = distance(wpA, wpB);
            if (segLen < 42) return null;
            const isHorizontal = Math.abs(wpA.y - wpB.y) <= 2;
            const isVertical = Math.abs(wpA.x - wpB.x) <= 2;
            if (!isHorizontal && !isVertical) return null;

            const midX = (wpA.x + wpB.x) / 2;
            const midY = (wpA.y + wpB.y) / 2;

            return (
              <div
                key={`seg-${idx}`}
                style={{
                  position: 'absolute',
                  transform: `translate(-50%, -50%) translate(${midX}px,${midY}px)`,
                  width: isHorizontal ? '24px' : '6px',
                  height: isHorizontal ? '6px' : '24px',
                  cursor: isHorizontal ? 'row-resize' : 'col-resize',
                  pointerEvents: 'all',
                  zIndex: 990
                }}
                className="nodrag nopan rounded-full bg-indigo-500 hover:bg-indigo-400 border border-white shadow-md transition-transform hover:scale-110"
                title={
                  isHorizontal
                    ? 'Drag horizontal segment up/down'
                    : 'Drag vertical segment left/right'
                }
                onPointerDown={(e) => handleSegmentPointerDown(idx, idx + 1, isHorizontal, e)}
              />
            );
          })}

        {/* Draggable Waypoint Corner Handles (Visible when edge is selected) */}
        {selected &&
          editableWaypoints.map((wp, idx) => (
            <div
              key={`wp-${idx}`}
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
                title="Drag corner point • Click X or Right-click to remove"
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
}, areEdgePropsEqual);

SemanticEdge.displayName = 'SemanticEdge';
