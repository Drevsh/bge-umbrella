import React, { memo, useMemo } from 'react';
import {
  Edge,
  EdgeProps,
  getBezierPath,
  getStraightPath,
  EdgeLabelRenderer,
  BaseEdge,
  Position,
} from '@xyflow/react';
import { RotateCcw, Trash2, CornerDownLeft } from 'lucide-react';
import { EdgeRelationType, EdgeRoutingStyle } from '../../types/campaign';
import {
  SmartEdgeRoute,
  ControlPoint,
  getPathWithRoundCorners,
  getLabelPosition,
  buildEditableEdgePoints,
} from '../../utils/obstacleRouter';
import { useCampaignStore } from '../../store/useCampaignStore';
import { EdgeControllers } from './EdgeController';

export type SemanticEdgeType = Edge<{
  type: EdgeRelationType;
  routingStyle: EdgeRoutingStyle;
  stateTag?: string | null;
  label?: string;
  isActive?: boolean;
  waypoints?: ControlPoint[];
  smartRoute?: SmartEdgeRoute;
}>;

const EDGE_COLORS: Record<EdgeRelationType, string> = {
  UNLOCKS: '#10b981',       // Emerald
  CHOICE_BRANCH: '#38bdf8', // Sky Cyan
  MUTATION: '#f59e0b',      // Amber
  LOCKOUT: '#ef4444',       // Rose Red
  TIME_TRIGGER: '#14b8a6',  // Teal
  TIME_EXPIRED: '#f43f5e',  // Rose
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
    prev.sourcePosition !== next.sourcePosition ||
    prev.targetPosition !== next.targetPosition ||
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
    sourcePosition = Position.Right,
    targetPosition = Position.Left,
    data,
    markerEnd,
    selected,
  } = props;

  const updateEdgeWaypoints = useCampaignStore((s) => s.updateEdgeWaypoints);
  const clearEdgeWaypoints = useCampaignStore((s) => s.clearEdgeWaypoints);
  const deleteEdge = useCampaignStore((s) => s.deleteEdge);

  const edgeType: EdgeRelationType = data?.type || 'UNLOCKS';
  const routingStyle: EdgeRoutingStyle = data?.routingStyle || 'STEP';
  const color = EDGE_COLORS[edgeType] || '#94a3b8';
  const isActive = Boolean(data?.isActive);
  const waypoints = data?.waypoints || [];
  const smartRoute = data?.smartRoute;

  const isLoopback = Boolean(smartRoute?.isLoopback || targetX <= sourceX + 20);
  const cornerRadius =
    routingStyle === 'STRAIGHT' ? 0 : routingStyle === 'STEP' ? 12 : 16;

  // Build orthogonal polyline points using idootop/reactflow-auto-layout's edge optimizer
  const editablePoints = useMemo(
    () =>
      buildEditableEdgePoints({
        id,
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        offset: 20,
        waypoints,
        smartRoute,
      }),
    [id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, waypoints, smartRoute]
  );

  const usesPolylinePath =
    waypoints.length > 0 ||
    isLoopback ||
    Boolean(smartRoute?.waypoints && smartRoute.waypoints.length > 0) ||
    routingStyle === 'STEP' ||
    Boolean(selected);

  let edgePath = '';
  let labelX = (sourceX + targetX) / 2;
  let labelY = (sourceY + targetY) / 2;

  if (usesPolylinePath) {
    edgePath = getPathWithRoundCorners(editablePoints, cornerRadius);
    if (isLoopback && waypoints.length === 0) {
      const ch = smartRoute?.loopbackChannel;
      const nestIdx = ch?.nestIdx ?? 0;
      const bundleSize = ch?.bundleSize ?? 1;
      const lblPos = getLabelPosition(editablePoints, 36);
      const staggerX = bundleSize > 1 ? (nestIdx - (bundleSize - 1) / 2) * 58 : 0;
      labelX = lblPos.x + staggerX;
      labelY = lblPos.y;
    } else {
      const lblPos = getLabelPosition(editablePoints, 36);
      labelX = lblPos.x;
      labelY = lblPos.y;
    }
  } else if (routingStyle === 'STRAIGHT') {
    [edgePath, labelX, labelY] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });
  } else {
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      curvature: 0.35,
    });
  }

  const isDashed =
    edgeType === 'MUTATION' ||
    edgeType === 'LOCKOUT' ||
    edgeType === 'TIME_TRIGGER' ||
    edgeType === 'TIME_EXPIRED';
  const strokeDasharray = isDashed ? '6,6' : undefined;

  return (
    <>
      {/* Main Visible Edge Line */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={typeof markerEnd === 'string' ? markerEnd : undefined}
        interactionWidth={24}
        style={{
          stroke: selected ? '#3579f6' : color,
          strokeWidth: selected ? 3 : isActive ? 3 : 2,
          strokeDasharray,
          filter: selected ? 'drop-shadow(0 0 6px rgba(53, 121, 246, 0.55))' : undefined,
          opacity: isActive || selected ? 1 : 0.85,
        }}
        className={isActive && isDashed ? 'animate-edge-flow' : ''}
      />

      {/* Interactive Polyline Segment Controllers from idootop/reactflow-auto-layout */}
      {selected && (
        <EdgeControllers
          id={id}
          points={editablePoints}
          sourceX={sourceX}
          sourceY={sourceY}
          targetX={targetX}
          targetY={targetY}
          sourcePosition={sourcePosition}
          targetPosition={targetPosition}
          offset={20}
          accentColor="#3579f6"
          onUpdateWaypoints={updateEdgeWaypoints}
        />
      )}

      {/* Edge Label & Reset / Delete Controls */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex items-center gap-1.5 z-20"
        >
          {data?.label && (
            <span
              style={{
                borderColor: `${color}99`,
                color: color,
              }}
              className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-950 border shadow-md whitespace-nowrap flex items-center gap-1"
              title={isLoopback ? `Loopback connection: ${data.label}` : data.label}
            >
              {isLoopback && <CornerDownLeft className="w-2.5 h-2.5 opacity-90 shrink-0" />}
              <span>{data.label}</span>
            </span>
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
      </EdgeLabelRenderer>
    </>
  );
}, areEdgePropsEqual);

SemanticEdge.displayName = 'SemanticEdge';
