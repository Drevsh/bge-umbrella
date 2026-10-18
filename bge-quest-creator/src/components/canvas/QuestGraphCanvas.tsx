import React, { useMemo, useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  Connection,
  addEdge as rfAddEdge,
  MarkerType,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  NodeChange,
  EdgeChange,
  useReactFlow
} from '@xyflow/react';
import { QuestNodeCard } from './QuestNodeCard';
import { SemanticEdge } from './SemanticEdgeLayer';
import { TierSwimlaneHeader } from './TierSwimlaneHeader';
import { CanvasGraphToolbar } from './CanvasGraphToolbar';
import { CanvasContextMenu, ContextMenuState } from './CanvasContextMenu';
import { Sparkles, Maximize2, Expand, Shrink } from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { evaluateCampaignSimulation } from '../../utils/simulatorEngine';
import { computeSmartEdgeRoutes } from '../../utils/obstacleRouter';
import { CampaignEdge, EdgeRelationType, QuestModel } from '../../types/campaign';

import { EdgeTypes, NodeTypes } from '@xyflow/react';

// Rule 3: Define nodeTypes and edgeTypes OUTSIDE the component
const nodeTypes: NodeTypes = {
  questNode: QuestNodeCard as any
};

const edgeTypes: EdgeTypes = {
  semanticEdge: SemanticEdge as any
};

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
  const hSpacingPreset = useCampaignStore((s) => s.hSpacingPreset);
  const vSpacingScale = useCampaignStore((s) => s.vSpacingScale);

  const selectQuest = useCampaignStore((s) => s.selectQuest);
  const selectEdge = useCampaignStore((s) => s.selectEdge);
  const deleteEdge = useCampaignStore((s) => s.deleteEdge);
  const updateQuestPosition = useCampaignStore((s) => s.updateQuestPosition);
  const addCampaignEdge = useCampaignStore((s) => s.addEdge);
  const addQuest = useCampaignStore((s) => s.addQuest);
  const setModalOpen = useCampaignStore((s) => s.setModalOpen);
  const openWizardWithConfig = useCampaignStore((s) => s.openWizardWithConfig);
  const autoArrangeCampaign = useCampaignStore((s) => s.autoArrangeCampaign);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Evaluate simulation state
  const simState = useMemo(() => {
    return evaluateCampaignSimulation(
      quests,
      edges,
      simulator.activeRewardChoices,
      simulator.completedQuestIds,
      simulator.customTags,
      simulator.manualTimeOffset || 0
    );
  }, [quests, edges, simulator]);

  const activeActId = useCampaignStore((s) => s.activeActId);

  // Transform Quests into React Flow Nodes
  const nodes: Node[] = useMemo(() => {
    return Object.values(quests)
      .filter((quest) => {
        if (activeActId === 'ALL') return true;
        return (quest.act || 1) === activeActId;
      })
      .map((quest) => ({
        id: quest.uid,
        type: 'questNode',
        position: quest.position,
        width: 280,
        height: 180,
        initialWidth: 280,
        initialHeight: 180,
        selected: quest.uid === selectedQuestId,
        data: {
          quest,
          status: simState.questStatuses[quest.uid] || 'AVAILABLE',
          activeVariants: simState.activeVariantsByQuest[quest.uid] || [],
          activeRewardChoices: simulator.activeRewardChoices,
          activeStateTags: simState.activeStateTags
        }
      }));
  }, [quests, selectedQuestId, simState, simulator.activeRewardChoices, activeActId]);

  // Compute automatic loopback & obstacle-avoidance routes in real time
  const smartRoutes = useMemo(() => {
    return computeSmartEdgeRoutes(quests, edges);
  }, [quests, edges]);

  // Transform CampaignEdges into React Flow Edges
  const rfEdges: Edge[] = useMemo(() => {
    return edges
      .filter((edge) => {
        if (edge.type === 'UNLOCKS' && !edgeVisibility.unlocks) return false;
        if (edge.type === 'CHOICE_BRANCH' && !edgeVisibility.choices) return false;
        if (edge.type === 'MUTATION' && !edgeVisibility.mutations) return false;
        if (edge.type === 'LOCKOUT' && !edgeVisibility.lockouts) return false;

        // If viewing a specific Act canvas, filter edges to the active Act
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
  }, [edges, quests, activeActId, edgeVisibility, edgeRoutingStyle, simState.activeEdgeIds, selectedEdgeId, smartRoutes]);

  const reconnectCampaignEdge = useCampaignStore((s) => s.reconnectEdge);
  const updateEdgeWaypoints = useCampaignStore((s) => s.updateEdgeWaypoints);
  const { screenToFlowPosition, fitView } = useReactFlow();

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
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 400 });
    }, 50);
  }, [autoArrangeCampaign, fitView]);

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

  // Node position drag handler with optional 16px grid snap
  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          let { x, y } = change.position;
          if (snapToGrid) {
            x = Math.round(x / 16) * 16;
            y = Math.round(y / 16) * 16;
          }
          updateQuestPosition(change.id, { x, y });
        }
      });
    },
    [snapToGrid, updateQuestPosition]
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

  const connectingNodeRef = useRef<{ nodeId: string | null; handleId: string | null; handleType: string | null }>({
    nodeId: null,
    handleId: null,
    handleType: null
  });

  const onConnectStart = useCallback(
    (_: any, { nodeId, handleId, handleType }: { nodeId: string | null; handleId: string | null; handleType: string | null }) => {
      connectingNodeRef.current = { nodeId, handleId, handleType };
    },
    []
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!connectingNodeRef.current.nodeId) return;

      const { nodeId, handleId, handleType } = connectingNodeRef.current;
      connectingNodeRef.current = { nodeId: null, handleId: null, handleType: null };

      // Check if dropped on another handle or node
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

      // Generate next code
      const existing = new Set(Object.values(quests).map((q) => q.code.toUpperCase()));
      let prefix = sourceQuest.category === 'SIDE' ? 'S' : 'M';
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
            gold: 25,
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

  // Distinct progression tiers for header
  const tiers = useMemo(() => {
    const set = new Set<number>();
    Object.values(quests).forEach((q) => set.add(q.tier || 1));
    return Array.from(set).sort((a, b) => a - b);
  }, [quests]);

  const handleAddQuestInTier = (tier: number) => {
    openWizardWithConfig({ tier });
  };

  return (
    <div
      ref={reactFlowWrapper}
      className="flex-1 h-full min-w-0 relative bg-slate-950 overflow-hidden"
    >
      {/* Top Floating Canvas Toolbar (Progression Tiers + Routing & Layers Popovers) */}
      <div className="absolute top-2.5 left-2 sm:left-4 z-30 pointer-events-none flex items-center gap-2 overflow-visible">
        <TierSwimlaneHeader
          tiers={tiers.length > 0 ? tiers : [1, 2, 3]}
          onAddQuestInTier={handleAddQuestInTier}
        />
        <CanvasGraphToolbar />
      </div>

      <ReactFlow
        nodes={nodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
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
        edgesReconnectable={true}
        reconnectRadius={35}
        connectionRadius={35}
        panOnDrag={true}
        zoomOnPinch={true}
        edgesFocusable={true}
        selectNodesOnDrag={false}
        onPaneClick={() => {
          closeContextMenu();
          selectQuest(null);
          selectEdge(null);
        }}
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
          className="px-3 py-2 rounded-xl bg-slate-900/95 text-indigo-300 border border-indigo-500/60 shadow-2xl backdrop-blur-md active:scale-95 transition-all flex items-center gap-1.5 text-xs font-semibold"
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
          className="px-3 py-2 rounded-xl bg-slate-900/95 text-indigo-400 border border-slate-700/80 shadow-2xl backdrop-blur-md active:scale-95 transition-all flex items-center gap-1.5 text-xs font-semibold"
          title="Auto-Align Layout"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-200">Align</span>
        </button>

        <button
          type="button"
          onClick={() => fitView({ padding: 0.2, duration: 300 })}
          className="p-2 rounded-xl bg-slate-900/95 text-slate-300 border border-slate-700/80 shadow-2xl backdrop-blur-md active:scale-95 transition-all"
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
