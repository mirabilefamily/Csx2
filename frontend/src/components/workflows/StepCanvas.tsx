import { useCallback, useMemo, useState } from 'react'
import { BaseEdge, Background, Controls, EdgeLabelRenderer, Handle, MiniMap, Position, ReactFlow, ReactFlowProvider, getSmoothStepPath, useReactFlow, type Connection, type EdgeChange, type EdgeProps, type NodeChange, type NodeProps } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Wand2, Zap } from 'lucide-react'
import type { StepType, Workflow } from '@/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { STEP_GROUPS, STEP_LABEL, handlesOf, newStep, stepNumbers, tidy } from '@/lib/workflowGraph'
import { STEP_ICON, VarText, stepSummary } from './stepMeta'
import { AddStepMenu } from './StepList'

type W = Pick<Workflow, 'steps' | 'edges' | 'trigger'>
interface Props { wf: W; onInsert: (source: string, handle: string, type: StepType) => void; onChange: (wf: W) => void; selected: string | null; current: string | null; issueIds: Set<string>; onSelect: (id: string | null) => void }
type NodeData = { title: string; summary: string; type: StepType | 'trigger'; num?: number; handles: [string, string][]; selected: boolean; current: boolean; warn: boolean }

function StepNode({ data }: NodeProps) {
  const d = data as NodeData
  const I = d.type === 'trigger' ? Zap : STEP_ICON[d.type]
  return (
    <div className={cn('w-[260px] rounded-xl border bg-surface p-3 text-left shadow-[0_1px_2px_rgba(31,29,26,0.06)]', d.selected ? 'border-tobacco-500 ring-2 ring-tobacco-200' : 'border-border', d.current && 'ring-2 ring-amber-400', d.warn && 'border-2 border-dashed border-amber-500')} data-testid={`canvas-node-${d.type === 'trigger' ? 'trigger' : d.num}`}>
      {d.type !== 'trigger' && <Handle type="target" position={Position.Top} className="!h-3 !w-3 !bg-tobacco-500" />}
      <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">{d.num && <span className="rounded-full bg-surface-muted px-1.5 text-[11px] text-ink-muted">{d.num}</span>}<I className="h-4 w-4 text-ink-muted" aria-hidden />{d.title}</p>
      <p className="mt-1 line-clamp-2 text-xs text-ink-muted"><VarText text={d.summary} /></p>
      {d.handles.length > 1 && <div className="mt-2 flex justify-between gap-1 text-[10px] font-medium text-ink-muted">{d.handles.map(([, l]) => <span key={l} className="truncate">{l}</span>)}</div>}
      {d.handles.map(([h], i) => <Handle key={h} id={h} type="source" position={Position.Bottom} style={{ left: `${((i + 1) / (d.handles.length + 1)) * 100}%` }} className="!h-3 !w-3 !bg-brass-500" />)}
    </div>
  )
}
const nodeTypes = { step: StepNode }

// Edge with a "+" at its midpoint: inserts a step exactly here and rewires both ends.
function InsertEdge({ id, source, sourceHandleId, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label, markerEnd, style, data }: EdgeProps) {
  const [path, x, y] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })
  const onInsert = (data as { onInsert: Props['onInsert'] }).onInsert
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div className="nodrag nopan absolute flex items-center gap-1" style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`, pointerEvents: 'all' }}>
          {label && <span className="rounded bg-surface px-1.5 text-[11px] text-ink-muted ring-1 ring-border">{label}</span>}
          <AddStepMenu onPick={(t) => onInsert(source, sourceHandleId ?? 'next', t)} label="Insert step here" testId={`canvas-insert-${source}-${sourceHandleId ?? 'next'}`} />
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
const edgeTypes = { insert: InsertEdge }

function Board({ wf, onInsert, onChange, selected, current, issueIds, onSelect }: Props) {
  const rf = useReactFlow()
  const nums = useMemo(() => stepNumbers(wf), [wf])
  const [selEdges, setSelEdges] = useState<Set<string>>(new Set())
  const nodes = useMemo(() => [
    { id: 'trigger', type: 'step', position: { x: (wf.steps[0]?.position.x ?? 0), y: (wf.steps[0]?.position.y ?? 0) - 140 }, deletable: false, data: { title: `When the AI detects “${wf.trigger.intent || '…'}”`, summary: wf.trigger.channels.join(' · '), type: 'trigger', handles: [['next', 'Next']], selected: selected === 'trigger', current: false, warn: false } },
    ...wf.steps.map((s) => ({ id: s.id, type: 'step', position: s.position, data: { title: STEP_LABEL[s.type], summary: stepSummary(s), type: s.type, num: nums.get(s.id), handles: handlesOf(s), selected: selected === s.id, current: current === s.id, warn: issueIds.has(s.id) } })),
  ], [wf, nums, selected, current, issueIds])
  const edges = useMemo(() => wf.edges.map((e) => ({ id: e.id, source: e.source, sourceHandle: e.sourceHandle, target: e.target, label: e.sourceHandle === 'next' ? undefined : handlesOf(wf.steps.find((s) => s.id === e.source) ?? newStep('message')).find(([h]) => h === e.sourceHandle)?.[1], type: 'insert', selected: selEdges.has(e.id), data: { onInsert: (s: string, h: string, t: StepType) => { onInsert(s, h, t) } } })), [wf, onInsert, selEdges])

  const onNodesChange = useCallback((ch: NodeChange[]) => {
    let next = wf
    for (const c of ch) {
      if (c.type === 'position' && c.position && c.id !== 'trigger') next = { ...next, steps: next.steps.map((s) => (s.id === c.id ? { ...s, position: { x: Math.round(c.position!.x), y: Math.round(c.position!.y) } } : s)) }
      if (c.type === 'remove' && c.id !== 'trigger') next = { ...next, steps: next.steps.filter((s) => s.id !== c.id), edges: next.edges.filter((e) => e.source !== c.id && e.target !== c.id) }
      if (c.type === 'select' && c.selected) onSelect(c.id)
    }
    if (next !== wf) onChange(next)
  }, [wf, onChange, onSelect])
  const onEdgesChange = useCallback((ch: EdgeChange[]) => {
    const sel = ch.filter((c) => c.type === 'select')
    if (sel.length) setSelEdges((prev) => { const n = new Set(prev); for (const c of sel) if (c.type === 'select') { if (c.selected) n.add(c.id); else n.delete(c.id) } return n })
    const gone = new Set(ch.filter((c) => c.type === 'remove').map((c) => c.id))
    if (gone.size) onChange({ ...wf, edges: wf.edges.filter((e) => !gone.has(e.id)) })
  }, [wf, onChange])
  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target || c.source === c.target) return
    const h = c.sourceHandle ?? 'next'
    onChange({ ...wf, edges: wf.edges.filter((e) => !(e.source === c.source && e.sourceHandle === h)).concat({ id: `e-${Math.random().toString(36).slice(2, 8)}`, source: c.source, sourceHandle: h, target: c.target }) })
  }, [wf, onChange])
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const t = e.dataTransfer.getData('application/goorin-step') as StepType
    if (!t) return
    const st = newStep(t, rf.screenToFlowPosition({ x: e.clientX, y: e.clientY }))
    onChange({ ...wf, steps: [...wf.steps, st] })
    onSelect(st.id)
  }

  return (
    <div className="flex h-full min-h-[560px]" data-testid="step-canvas">
      <aside className="w-48 shrink-0 space-y-3 overflow-y-auto border-r border-border bg-surface p-3" aria-label="Add step" data-testid="canvas-palette">
        <p className="text-[13px] font-semibold text-ink">Add step</p>
        {STEP_GROUPS.map(([g, types]) => (
          <div key={g}><p className="mb-1 text-[11px] font-medium text-ink-subtle">{g}</p>
            {types.map((t) => { const I = STEP_ICON[t]; return <div key={t} draggable onDragStart={(e) => { e.dataTransfer.setData('application/goorin-step', t); e.dataTransfer.effectAllowed = 'move' }} className="mb-1 flex cursor-grab items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink hover:bg-surface-sunken" data-testid={`palette-${t}`}><I className="h-4 w-4 text-ink-muted" aria-hidden />{STEP_LABEL[t]}</div> })}
          </div>
        ))}
      </aside>
      <div className="relative min-w-0 flex-1" onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }} onDrop={onDrop}>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onPaneClick={() => onSelect(null)} deleteKeyCode={['Delete', 'Backspace']} fitView minZoom={0.2} proOptions={{ hideAttribution: true }}>
          <Background gap={20} color="#E6E0D7" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable className="!bg-surface" />
        </ReactFlow>
        <Button size="sm" variant="outline" className="absolute right-3 top-3 z-10 bg-surface" onClick={() => { onChange(tidy(wf)); setTimeout(() => rf.fitView({ duration: 300 }), 50) }} data-testid="canvas-tidy"><Wand2 aria-hidden /> Tidy up</Button>
      </div>
    </div>
  )
}

// Drag-and-drop Canvas view (REQ-738..742), same data as the List view.
export default function StepCanvas(p: Props) {
  return <ReactFlowProvider><Board {...p} /></ReactFlowProvider>
}
