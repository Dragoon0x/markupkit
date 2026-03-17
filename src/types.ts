/** A single point in a stroke */
export interface Point { x: number; y: number; t: number }

/** A raw stroke drawn by the user */
export interface Stroke {
  id: string
  points: Point[]
  color: string
  width: number
  timestamp: number
}

/** Detected shape type */
export type ShapeType = 'circle' | 'arrow' | 'line' | 'strikethrough' | 'underline' | 'freehand' | 'rectangle' | 'cross'

/** A recognized shape from a stroke */
export interface Shape {
  type: ShapeType
  stroke: Stroke
  /** Bounding box of the shape */
  bounds: { x: number; y: number; width: number; height: number }
  /** Confidence score 0-1 */
  confidence: number
  /** For arrows: start and end points */
  head?: Point
  tail?: Point
  /** User's text note attached to this shape */
  note: string
}

/** A resolved element that a shape refers to */
export interface ResolvedElement {
  selector: string
  tag: string
  classes: string
  id: string
  text: string
  rect: { x: number; y: number; width: number; height: number }
  component: string | null
}

/** A complete annotation: shape + resolved elements + note */
export interface Annotation {
  id: string
  shape: Shape
  /** Elements enclosed/targeted by the shape */
  elements: ResolvedElement[]
  /** Spatial relationship description */
  intent: string
  note: string
  timestamp: number
}

/** Full markup session output */
export interface MarkupSession {
  url: string
  title: string
  viewport: { width: number; height: number }
  annotations: Annotation[]
  timestamp: number
}

/** Draw event passed to onDraw callback */
export interface DrawEvent {
  stroke: Stroke
  shape: ShapeType
  confidence: number
  bounds: { x: number; y: number; width: number; height: number }
}

export type OutputDetail = 'compact' | 'standard' | 'detailed' | 'forensic'

export type ToolMode = 'draw' | 'arrow' | 'circle' | 'text' | 'eraser'

export interface MarkupProps {
  // ---- Behavior ----
  enabled?: boolean
  color?: string
  strokeWidth?: number
  tool?: ToolMode
  detail?: OutputDetail
  toolbar?: boolean
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  root?: string
  ignore?: string[]
  shortcut?: string
  className?: string
  copyToClipboard?: boolean

  // ---- Callbacks ----
  onAnnotationAdd?: (annotation: Annotation) => void
  onAnnotationDelete?: (annotation: Annotation) => void
  onAnnotationUpdate?: (annotation: Annotation) => void
  onAnnotationsClear?: (annotations: Annotation[]) => void
  onCopy?: (markdown: string) => void
  onDraw?: (event: DrawEvent) => void

  // ---- Agent Sync ----
  endpoint?: string
  sessionId?: string
  onSessionCreated?: (sessionId: string) => void
}

export type MarkupState = 'idle' | 'drawing' | 'noting'
