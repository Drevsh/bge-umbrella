import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  Connection,
  MarkerType,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  NodeChange,
  EdgeChange,
  useReactFlow,
  useUpdateNodeInternals,
  EdgeTypes,
  NodeTypes
} from '@xyflow/react';
import { QuestNodeCard, QuestNodeCardData } from './QuestNodeCard';
import { SemanticEdge } from './SemanticEdgeLayer';
import { TierSwimlaneHeader } from './TierSwimlaneHeader';
import { CanvasGraphToolbar } from './CanvasGraphToolbar';
import { ExplorationHudPill } from './ExplorationHudPill';
import { CanvasContextMenu, ContextMenuState } from './CanvasContextMenu';
import { Sparkles, Maximize2, Expand, Shrink } from 'lucide-react';
import {
  useCampaignStore,
  reportMeasuredNodeSize,
  getMeasuredNodeSizes
} from '../../store/useCampaignStore';
import { evaluateCampaignSimulation } from '../../utils/simulatorEngine';
import { evaluateCampaignLinter, CampaignLintIssue, CampaignLintReport } from '../../utils/campaignLinter';
import { computeSmartEdgeRoutes } from '../../utils/obstacleRouter';
import { estimateNodeHeight, DEFAULT_NODE_WIDTH } from '../../utils/layoutEngine';
import { CampaignEdge, EdgeRelationType, QuestModel, QuestVariantOverride } from '../../types/campaign';

type SimulationEvaluation = ReturnType<typeof evaluateCampaignSimulation>;

// Define nodeTypes and edgeTypes OUTSIDE the component (React Flow Best Practice)
const nodeTypes: NodeTypes = {
  questNode: QuestNodeCard as any
};

const edgeTypes: EdgeTypes = {
  semanticEdge: SemanticEdge as any
};

const EMPTY_VARIANTS: QuestVariantOverride[] = [];
const EMPTY_LINT_ISSUES: CampaignLintIssue[] = [];

/**
 * Computes a lightweight signature of simulation-relevant state (ignoring node positions and edge waypoints)
 * so dragging nodes or bending edges never triggers expensive campaign simulation re-evaluation.
 */
function buildSimulationSignature(
  quests: Record<string, QuestModel>,
  edges: CampaignEdge[],
  simulator: {
    activeRewardChoices: string[];
    completedQuestIds: string[];
    customTags: string[];
    manualTimeOffset: number;
  }
): string {
  const qPart = Object.values(quests)
    .map(
      (q) =>
        `${q.uid}:${q.act || 1}:${q.tier}:${q.prereqLogic}:${q.requiredTag || ''}:${q.timeAdvance || 0}:${
          q.isExplorationStage ? 1 : 0
        }:${q.explorationConfig?.scenarioEndQuestId || ''}:${(q.explorationConfig?.eventSlots || [])
          .map((slot) => `${slot.slotNumber}:${slot.grantsStateTag || ''}:${slot.targetQuestId || ''}`)
          .join(',')}:${q.rewardOutcomes
          .map((r) => `${r.id}:${r.isExclusiveChoice ? 1 : 0}:${r.grantsStateTags.join(',')}:${r.timeAdvance || 0}`)
          .join(';')}:${q.variants
          .map((v) => `${v.id}:${v.requiredStateTag}`)
          .join(';')}`
    )
    .join('|');

  const ePart = edges
    .map((e) => `${e.id}:${e.source}:${e.sourcePortId || ''}:${e.target}:${e.type}:${e.stateTag || ''}`)
    .join('|');

  const sPart = `${simulator.activeRewardChoices.join(',')}|${simulator.completedQuestIds.join(
    ','
  )}|${simulator.customTags.join(',')}|${simulator.manualTimeOffset || 0}`;

  return `${qPart}#${ePart}#${sPart}`;
}

export const QuestGraphCanvas: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const quests = useCampaignStore((s) => s.quests);
  const edges = useCampaignStore((s) => s.edges);
  const selectedQuestId = useCampaignStore((s) => s.selectedQuestId);
  const selectedEdgeId = useCampaignStore((s) => s.selectedEdgeId);
  const edgeRoutingStyle = useCampaignStore((s) => s.edgeRoutingStyle);
  const edgeVisibility = useCampaignStore((s) => s.edgeVisibility);
  const snapToGrid = useCampaignStore((s) => s.snapToGrid);
  const simulator = useCampaignStore((s) => s.simulator);
  const activeActId = useCampaignStore((s) => s.activeActId);
  const layoutVersion = useCampaignStore((s) => s.layoutVersion);

  const selectQuest = useCampaignStore((s) => s.selectQuest);
  const selectEdge = useCampaignStore((s) => s.selectEdge);
  const deleteEdge = useCampaignStore((s) => s.deleteEdge);
  const updateQuestPosition = useCampaignStore((s) => s.updateQuestPosition);
  const batchUpdateQuestPositions = useCampaignStore((s) => s.batchUpdateQuestPositions);
  const addCampaignEdge = useCampaignStore((s) => s.addEdge);
  const addQuest = useCampaignStore((s) => s.addQuest);
  const openWizardWithConfig = useCampaignStore((s) => s.openWizardWithConfig);
  const autoArrangeCampaign = useCampaignStore((s) => s.autoArrangeCampaign);
  const reconnectCampaignEdge = useCampaignStore((s) => s.reconnectEdge);
  const updateEdgeWaypoints = useCampaignStore((s) => s.updateEdgeWaypoints);

  const { screenToFlowPosition, fitView } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Evaluate simulation state ONLY when simulation-relevant fields change (ignores position/waypoint drags)
  const simSignature = useMemo(
    () => buildSimulationSignature(quests, edges, simulator),
    [quests, edges, simulator]
  );

  const simStateRef = useRef<{ sig: string; value: SimulationEvaluation } | null>(null);
  const simState = useMemo(() => {
    if (simStateRef.current && simStateRef.current.sig === simSignature) {
      return simStateRef.current.value;
    }
    const evaluated = evaluateCampaignSimulation(
      quests,
      edges,
      simulator.activeRewardChoices,
      simulator.completedQuestIds,
      simulator.customTags,
      simulator.manualTimeOffset || 0
    );
    simStateRef.current = { sig: simSignature, value: evaluated };
    return evaluated;
  }, [simSignature, quests, edges, simulator]);

  const lintReportRef = useRef<{ sig: string; value: CampaignLintReport } | null>(null);
  const lintReport = useMemo(() => {
    const lintSig = `${simSignature}#act:${activeActId}`;
    if (lintReportRef.current && lintReportRef.current.sig === lintSig) {
      return lintReportRef.current.value;
    }
    const evaluated = evaluateCampaignLinter(quests, edges, activeActId);
    lintReportRef.current = { sig: lintSig, value: evaluated };
    return evaluated;
  }, [simSignature, quests, edges, activeActId]);

  // Cache per-node data objects so unchanged QuestNodeCards keep strict referential equality
  const nodeDataCacheRef = useRef<Record<string, QuestNodeCardData>>({});

  // Controlled React Flow nodes state that preserves internal `measured` dimensions & smooth 60fps dragging
  const [rfNodes, setRfNodes] = useState<Node[]>([]);

  useEffect(() => {
    setRfNodes((prevNodes) => {
      const prevMap = new Map<string, Node>();
      prevNodes.forEach((n) => prevMap.set(n.id, n));

      const nextNodes: Node[] = [];
      Object.values(quests).forEach((quest) => {
        if (activeActId !== 'ALL' && (quest.act || 1) !== activeActId) {
          return;
        }

        const existingNode = prevMap.get(quest.uid);
        const status = simState.questStatuses[quest.uid] || 'AVAILABLE';
        const activeVariants = simState.activeVariantsByQuest[quest.uid] || EMPTY_VARIANTS;
        const lintIssues = lintReport.issuesByQuest[quest.uid] || EMPTY_LINT_ISSUES;

        const prevData = nodeDataCacheRef.current[quest.uid];
        let nodeData: QuestNodeCardData;
        if (
          prevData &&
          prevData.quest === quest &&
          prevData.status === status &&
          prevData.activeVariants === activeVariants &&
          prevData.activeRewardChoices === simulator.activeRewardChoices &&
          prevData.activeStateTags === simState.activeStateTags &&
          prevData.lintIssues === lintIssues
        ) {
          nodeData = prevData;
        } else {
          nodeData = {
            quest,
            status,
            activeVariants,
            activeRewardChoices: simulator.activeRewardChoices,
            activeStateTags: simState.activeStateTags,
            lintIssues
          };
          nodeDataCacheRef.current[quest.uid] = nodeData;
        }

        const isSelected = quest.uid === selectedQuestId;

        // If the node is currently being dragged by the user, keep its live drag position
        const isDragging = Boolean(existingNode?.dragging);
        const position = isDragging && existingNode ? existingNode.position : quest.position;

        if (
          existingNode &&
          existingNode.position.x === position.x &&
          existingNode.position.y === position.y &&
          Boolean(existingNode.selected) === isSelected &&
          existingNode.data === nodeData
        ) {
          nextNodes.push(existingNode);
          return;
        }

        nextNodes.push({
          ...existingNode,
          id: quest.uid,
          type: 'questNode',
          position,
          initialWidth: DEFAULT_NODE_WIDTH,
          initialHeight: estimateNodeHeight(quest, getMeasuredNodeSizes()),
          selected: isSelected,
          data: nodeData
        });
      });

      return nextNodes;
    });
  }, [quests, selectedQuestId, simState, lintReport, simulator.activeRewardChoices, activeActId]);

  // Whenever auto-layout completes (layoutVersion increments), refresh node handle internals and fitView
  const prevLayoutVersionRef = useRef(layoutVersion);
  useEffect(() => {
    if (prevLayoutVersionRef.current !== layoutVersion) {
      prevLayoutVersionRef.current = layoutVersion;
      const visibleIds = Object.values(quests)
        .filter((q) => activeActId === 'ALL' || (q.act || 1) === activeActId)
        .map((q) => q.uid);
      if (visibleIds.length > 0) {
        updateNodeInternals(visibleIds);
      }
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 350 });
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [layoutVersion, quests, activeActId, updateNodeInternals, fitView]);

  // Compute automatic loopback & A* Manhattan obstacle-avoidance routes
  const smartRoutes = useMemo(() => {
    return computeSmartEdgeRoutes(quests, edges, getMeasuredNodeSizes());
  }, [quests, edges, layoutVersion]);

  // Transform CampaignEdges into React Flow Edges
  const rfEdges: Edge[] = useMemo(() => {
    return edges
      .filter((edge) => {
        if (edge.type === 'UNLOCKS' && !edgeVisibility.unlocks) return false;
        if (edge.type === 'CHOICE_BRANCH' && !edgeVisibility.choices) return false;
        if (edge.type === 'MUTATION' && !edgeVisibility.mutations) return false;
        if (edge.type === 'LOCKOUT' && !edgeVisibility.lockouts) return false;

        if (activeActId !== 'ALL') {
          const srcQuest = quests[edge.source];
          const tgtQuest = quests[edge.target];
          if (!srcQuest || !tgtQuest) return false;
          const srcAct = srcQuest.act || 1;
          const tgtAct = tgtQuest.act || 1;
          if (srcAct !== activeActId || tgtAct !== activeActId) return false;
        }

        return true;
      })
      .map((edge) => {
        const isMutation = edge.type === 'MUTATION';
        const isLockout = edge.type === 'LOCKOUT';
        const isActive = simState.activeEdgeIds.has(edge.id);

        let strokeColor = '#10b981';
        if (edge.type === 'CHOICE_BRANCH') strokeColor = '#38bdf8';
        if (isMutation) strokeColor = '#f59e0b';
        if (isLockout) strokeColor = '#ef4444';
        if (edge.type === 'TIME_TRIGGER') strokeColor = '#14b8a6';
        if (edge.type === 'TIME_EXPIRED') strokeColor = '#f43f5e';

        return {
          id: edge.id,
          source: edge.source,
          sourceHandle: edge.sourcePortId,
          target: edge.target,
          targetHandle: 'in',
          type: 'semanticEdge',
          selected: edge.id === selectedEdgeId,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
            width: 14,
            height: 14
          },
          data: {
            type: edge.type,
            routingStyle: edgeRoutingStyle,
            stateTag: edge.stateTag,
            label: edge.label,
            isActive,
            waypoints: edge.waypoints || [],
            smartRoute: smartRoutes[edge.id]
          }
        };
      });
  }, [
    edges,
    quests,
    activeActId,
    edgeVisibility,
    edgeRoutingStyle,
    simState.activeEdgeIds,
    selectedEdgeId,
    smartRoutes
  ]);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    targetType: 'CANVAS',
    screenPos: { x: 0, y: 0 },
    flowPos: { x: 0, y: 0 }
  });

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
  }, []);

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setContextMenu({
        isOpen: true,
        targetType: 'CANVAS',
        screenPos: { x: event.clientX, y: event.clientY },
        flowPos
      });
    },
    [screenToFlowPosition]
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      event.stopPropagation();
      selectQuest(node.id);
      const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setContextMenu({
        isOpen: true,
        targetType: 'NODE',
        targetId: node.id,
        screenPos: { x: event.clientX, y: event.clientY },
        flowPos
      });
    },
    [screenToFlowPosition, selectQuest]
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      event.stopPropagation();
      selectEdge(edge.id);
      const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setContextMenu({
        isOpen: true,
        targetType: 'EDGE',
        targetId: edge.id,
        screenPos: { x: event.clientX, y: event.clientY },
        flowPos
      });
    },
    [screenToFlowPosition, selectEdge]
  );

  const handleAutoLayout = useCallback(() => {
    autoArrangeCampaign();
  }, [autoArrangeCampaign]);

  // Edge double-click handler to insert bend points
  const onEdgeDoubleClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      event.stopPropagation();
      const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const currentEdge = edges.find((e) => e.id === edge.id);
      if (!currentEdge) return;

      const currentWaypoints = currentEdge.waypoints || [];
      const updated = [...currentWaypoints];
      let insertIdx = updated.findIndex((wp) => wp.x > pos.x);
      if (insertIdx === -1) insertIdx = updated.length;
      updated.splice(insertIdx, 0, { x: Math.round(pos.x), y: Math.round(pos.y) });

      updateEdgeWaypoints(edge.id, updated);
    },
    [edges, screenToFlowPosition, updateEdgeWaypoints]
  );

  // Edge reconnection handler (drag endpoints to rewire)
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (!newConnection.source || !newConnection.target) return;
      reconnectCampaignEdge(oldEdge.id, {
        source: newConnection.source,
        sourcePortId: newConnection.sourceHandle || null,
        target: newConnection.target
      });
    },
    [reconnectCampaignEdge]
  );

  // React Flow v12 Best Practice: Apply all NodeChanges (including dimensions & dragging) via applyNodeChanges
  // and only commit final position to the global domain store when dragging ends.
  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const processedChanges = changes.map((change) => {
        if (change.type === 'dimensions' && change.dimensions) {
          reportMeasuredNodeSize(change.id, change.dimensions.width, change.dimensions.height);
        }
        if (change.type === 'position' && change.position) {
          let { x, y } = change.position;
          if (snapToGrid) {
            x = Math.round(x / 16) * 16;
            y = Math.round(y / 16) * 16;
          } else {
            x = Math.round(x);
            y = Math.round(y);
          }
          // Commit to domain store only when drag ends (or non-drag programmatic position change)
          if (change.dragging === false) {
            updateQuestPosition(change.id, { x, y });
          }
          return {
            ...change,
            position: { x, y }
          };
        }
        return change;
      });

      setRfNodes((nds) => applyNodeChanges(processedChanges, nds));
    },
    [snapToGrid, updateQuestPosition]
  );

  // Guarantee drag stop always syncs final node coordinates to store & temporal undo history
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent | MouseEvent | TouchEvent, _node: Node, draggedNodes: Node[]) => {
      if (!draggedNodes || draggedNodes.length === 0) return;
      const updates: Record<string, { x: number; y: number }> = {};
      draggedNodes.forEach((n) => {
        let { x, y } = n.position;
        if (snapToGrid) {
          x = Math.round(x / 16) * 16;
          y = Math.round(y / 16) * 16;
        } else {
          x = Math.round(x);
          y = Math.round(y);
        }
        updates[n.id] = { x, y };
      });
      batchUpdateQuestPositions(updates);
    },
    [snapToGrid, batchUpdateQuestPositions]
  );

  // Edge selection and keyboard delete (Delete/Backspace) handler
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      changes.forEach((change) => {
        if (change.type === 'select') {
          if (change.selected) {
            selectEdge(change.id);
          } else if (selectedEdgeId === change.id) {
            selectEdge(null);
          }
        } else if (change.type === 'remove') {
          deleteEdge(change.id);
        }
      });
    },
    [selectedEdgeId, selectEdge, deleteEdge]
  );

  // Direct edge click selection
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation();
      selectEdge(edge.id);
    },
    [selectEdge]
  );

  // Connect port-to-port edge handler
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      if (params.source === params.target) return;

      const sourceQuest = quests[params.source];
      const targetQuest = quests[params.target];
      if (!sourceQuest || !targetQuest) return;

      const sourceReward = sourceQuest.rewardOutcomes.find((r) => r.id === params.sourceHandle);
      const isChoice = Boolean(sourceReward?.isExclusiveChoice);
      const carriedTag = sourceReward?.grantsStateTags?.[0] || null;

      const edgeType: EdgeRelationType = isChoice ? 'CHOICE_BRANCH' : 'UNLOCKS';

      const newEdge: CampaignEdge = {
        id: `e-${params.source}-${params.target}-${Date.now().toString(36)}`,
        source: params.source,
        sourcePortId: params.sourceHandle || null,
        target: params.target,
        type: edgeType,
        stateTag: carriedTag,
        label: isChoice ? `+${carriedTag || 'Choice'}` : undefined
      };

      addCampaignEdge(newEdge);
    },
    [quests, addCampaignEdge]
  );

  const connectingNodeRef = useRef<{
    nodeId: string | null;
    handleId: string | null;
    handleType: string | null;
  }>({
    nodeId: null,
    handleId: null,
    handleType: null
  });

  const onConnectStart = useCallback(
    (
      _: any,
      {
        nodeId,
        handleId,
        handleType
      }: { nodeId: string | null; handleId: string | null; handleType: string | null }
    ) => {
      connectingNodeRef.current = { nodeId, handleId, handleType };
    },
    []
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!connectingNodeRef.current.nodeId) return;

      const { nodeId, handleId } = connectingNodeRef.current;
      connectingNodeRef.current = { nodeId: null, handleId: null, handleType: null };

      const targetIsPane = (event.target as Element)?.classList?.contains('react-flow__pane');
      if (!targetIsPane) return;

      const clientX = 'clientX' in event ? event.clientX : (event.changedTouches?.[0]?.clientX ?? 0);
      const clientY = 'clientY' in event ? event.clientY : (event.changedTouches?.[0]?.clientY ?? 0);
      const flowPos = screenToFlowPosition({ x: clientX, y: clientY });

      const sourceQuest = nodeId ? quests[nodeId] : undefined;
      if (!sourceQuest) return;

      const sourceReward = sourceQuest.rewardOutcomes.find((r) => r.id === handleId);
      const isChoice = Boolean(sourceReward?.isExclusiveChoice);
      const carriedTag = sourceReward?.grantsStateTags?.[0] || null;

      const targetTier = (sourceQuest.tier || 1) + 1;
      const actId = sourceQuest.act || (typeof activeActId === 'number' ? activeActId : 1);

      const existing = new Set(Object.values(quests).map((q) => q.code.toUpperCase()));
      const prefix = sourceQuest.category === 'SIDE' ? 'S' : 'M';
      let num = 1;
      while (existing.has(`${prefix}${String(num).padStart(2, '0')}`)) {
        num++;
      }
      const newCode = `${prefix}${String(num).padStart(2, '0')}`;

      const newUid = `q-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
      const newQuest: QuestModel = {
        uid: newUid,
        code: newCode,
        title: `Branch from ${sourceQuest.code}`,
        act: actId,
        tier: targetTier,
        category: isChoice ? 'MAIN_BRANCH' : sourceQuest.category,
        prereqLogic: 'ALL',
        position: {
          x: Math.round(flowPos.x - 40),
          y: Math.round(flowPos.y - 40)
        },
        flavorText: `Continuing the tale following events at ${sourceQuest.title}...`,
        setupInstructions: 'Place hero standees on the entrance hex.',
        objectives: 'Complete the scenario objectives to proceed.',
        devStatus: 'DRAFT',
        rewardOutcomes: [
          {
            id: `r-${newUid}-1`,
            label: 'Scenario Victory',
            isExclusiveChoice: false,
            gold: 0,
            items: [],
            grantsStateTags: []
          }
        ],
        variants: []
      };

      addQuest(newQuest);

      const newEdge: CampaignEdge = {
        id: `e-${sourceQuest.uid}-${newUid}-${Date.now().toString(36)}`,
        source: sourceQuest.uid,
        sourcePortId: handleId || sourceQuest.rewardOutcomes[0]?.id || null,
        target: newUid,
        type: isChoice ? 'CHOICE_BRANCH' : 'UNLOCKS',
        stateTag: carriedTag,
        label: isChoice ? `+${carriedTag || 'Choice'}` : undefined
      };
      addCampaignEdge(newEdge);

      selectQuest(newUid);
    },
    [quests, activeActId, screenToFlowPosition, addQuest, addCampaignEdge, selectQuest]
  );

  // Pane double-click: quickly create quest at mouse position
  const onPaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const inferredTier = Math.max(1, Math.min(10, Math.floor((flowPos.x - 20) / 380) + 1));
      openWizardWithConfig({
        tier: inferredTier,
        canvasPos: flowPos
      });
    },
    [screenToFlowPosition, openWizardWithConfig]
  );

  // Distinct progression tiers for header (scoped to active Act)
  const tiers = useMemo(() => {
    const set = new Set<number>();
    Object.values(quests).forEach((q) => {
      if (activeActId === 'ALL' || (q.act || 1) === activeActId) {
        set.add(q.tier || 1);
      }
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [quests, activeActId]);

  const handleAddQuestInTier = useCallback(
    (tier: number) => {
      openWizardWithConfig({ tier });
    },
    [openWizardWithConfig]
  );

  const handlePaneClick = useCallback(() => {
    closeContextMenu();
    selectQuest(null);
    selectEdge(null);
  }, [closeContextMenu, selectQuest, selectEdge]);

  return (
    <div
      ref={reactFlowWrapper}
      className="flex-1 h-full min-w-0 relative bg-slate-950 overflow-hidden"
    >
      {/* Top Floating Canvas Toolbar (Progression Tiers, Routing & Layers, and Exploration Time HUD) */}
      <div className="absolute top-2.5 left-2 right-2 sm:left-4 sm:right-4 z-30 pointer-events-none flex flex-wrap items-start justify-between gap-2 overflow-visible">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 max-w-full min-w-0">
          <TierSwimlaneHeader
            tiers={tiers.length > 0 ? tiers : [1, 2, 3]}
            onAddQuestInTier={handleAddQuestInTier}
          />
          <CanvasGraphToolbar lintReport={lintReport} />
        </div>
        <ExplorationHudPill />
      </div>

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onEdgesChange={onEdgesChange}
        onEdgeClick={onEdgeClick}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onDoubleClick={onPaneDoubleClick}
        onReconnect={onReconnect}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onMoveStart={closeContextMenu}
        onPaneClick={handlePaneClick}
        edgesReconnectable={true}
        reconnectRadius={35}
        connectionRadius={35}
        panOnDrag={true}
        zoomOnPinch={true}
        edgesFocusable={true}
        selectNodesOnDrag={false}
        onlyRenderVisibleElements={false}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2.5}
        snapToGrid={snapToGrid}
        snapGrid={[16, 16]}
        defaultEdgeOptions={{
          type: 'semanticEdge',
          interactionWidth: 32
        }}
        className="questflow-canvas"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1.5}
          color="#1e293b"
        />
        <Controls
          showInteractive={false}
          className="!bg-slate-900 !border !border-slate-800 !rounded-lg !shadow-xl !fill-slate-300 [&>button]:!bg-slate-800 [&>button]:!border-slate-700 hover:[&>button]:!bg-slate-700"
        />
      </ReactFlow>

      {/* Floating Action Controls */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={toggleFullscreen}
          className="px-3 py-2 rounded-xl bg-slate-900 text-indigo-300 border border-indigo-500/60 shadow-2xl active:scale-95 transition-transform flex items-center gap-1.5 text-xs font-semibold"
          title="Toggle Fullscreen (Hide address bar)"
        >
          {isFullscreen ? (
            <>
              <Shrink className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-200">Exit Full</span>
            </>
          ) : (
            <>
              <Expand className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-200">Fullscreen</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleAutoLayout}
          className="px-3 py-2 rounded-xl bg-slate-900 text-indigo-400 border border-slate-700/80 shadow-2xl active:scale-95 transition-transform flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          title="Auto-Align Layout"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-200">Align</span>
        </button>

        <button
          type="button"
          onClick={() => fitView({ padding: 0.2, duration: 300 })}
          className="p-2 rounded-xl bg-slate-900 text-slate-300 border border-slate-700/80 shadow-2xl active:scale-95 transition-transform cursor-pointer"
          title="Fit View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      <CanvasContextMenu
        menuState={contextMenu}
        onClose={closeContextMenu}
        onFitView={() => fitView({ padding: 0.2, duration: 300 })}
        onAutoLayout={handleAutoLayout}
      />
    </div>
  );
};
