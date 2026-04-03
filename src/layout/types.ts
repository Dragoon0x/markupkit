/** Layout Mode types for MarkupKit */

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface ElementSnapshot {
  id: string
  selector: string
  tag: string
  classes: string[]
  text: string
  rect: Rect
  computedStyles: Record<string, string>
  children: string[]
  parent: string | null
  reactComponent?: string
}

export interface LayoutChange {
  type: 'move' | 'resize' | 'add' | 'remove' | 'reorder' | 'swap'
  elementId: string
  selector: string
  tag: string
  from?: Rect
  to?: Rect
  delta?: { dx: number; dy: number; dw: number; dh: number }
  note?: string
  timestamp: number
  /** For 'add' changes */
  componentType?: string
  /** For 'reorder' changes */
  newIndex?: number
  oldIndex?: number
  /** For 'swap' changes */
  swapWith?: string
}

export interface LayoutSession {
  url: string
  viewport: { width: number; height: number }
  changes: LayoutChange[]
  snapshots: {
    before: Map<string, ElementSnapshot>
    after: Map<string, ElementSnapshot>
  }
  startedAt: number
  updatedAt: number
}

export interface Guide {
  type: 'horizontal' | 'vertical'
  position: number
  source: string
  kind: 'edge' | 'center' | 'spacing'
}

export interface SnapResult {
  x: number
  y: number
  guides: Guide[]
  snappedX: boolean
  snappedY: boolean
}

export interface PaletteComponent {
  type: string
  label: string
  icon: string
  defaultSize: { width: number; height: number }
  render: (rect: Rect) => string
  category: 'structure' | 'content' | 'input' | 'media' | 'navigation'
}

export interface DragState {
  active: boolean
  elementId: string | null
  element: HTMLElement | null
  startRect: Rect | null
  startMouse: { x: number; y: number }
  currentRect: Rect | null
  guides: Guide[]
  mode: 'move' | 'resize'
  resizeHandle: ResizeHandle | null
}

export type ResizeHandle = 
  | 'n' | 's' | 'e' | 'w'
  | 'ne' | 'nw' | 'se' | 'sw'

export interface LayoutModeState {
  active: boolean
  selectedElement: string | null
  hoveredElement: string | null
  drag: DragState
  changes: LayoutChange[]
  showPalette: boolean
  showGuides: boolean
  snapThreshold: number
  gridSize: number
  showGrid: boolean
}
