export interface Point { x: number; y: number; t: number }

export interface Stroke {
  id: string; points: Point[]; color: string; width: number; timestamp: number
}

export type ShapeType = 'circle' | 'arrow' | 'line' | 'strikethrough' | 'underline' | 'freehand' | 'rectangle' | 'cross'

export interface Shape {
  type: ShapeType; stroke: Stroke
  bounds: { x: number; y: number; width: number; height: number }
  confidence: number; head?: Point; tail?: Point; note: string
}

export interface SpacingData {
  paddingTop: number; paddingRight: number; paddingBottom: number; paddingLeft: number
  marginTop: number; marginRight: number; marginBottom: number; marginLeft: number
}

export interface ContrastData {
  ratio: number; aa: boolean; aaa: boolean
  foreground: string; background: string
}

export interface ResolvedElement {
  selector: string; tag: string; classes: string; id: string
  text: string; rect: { x: number; y: number; width: number; height: number }
  component: string | null; source: string | null
  spacing: SpacingData | null; contrast: ContrastData | null
  computedStyles: Record<string, string> | null
}

export interface Annotation {
  id: string
  shape: Shape
  elements: ResolvedElement[]
  intent: string
  note: string
  timestamp: number
  mode: AnnotationMode
  selectedText?: string
}

export interface MarkupSession {
  url: string; title: string
  viewport: { width: number; height: number }
  annotations: Annotation[]; timestamp: number
}

export interface DrawEvent {
  stroke: Stroke; shape: ShapeType; confidence: number
  bounds: { x: number; y: number; width: number; height: number }
}

export type OutputDetail = 'compact' | 'standard' | 'detailed' | 'forensic'
export type ToolMode = 'draw' | 'arrow' | 'circle' | 'text' | 'eraser'
export type AnnotationMode = 'draw' | 'text' | 'click' | 'multi' | 'area' | 'pause'

export interface MarkupSettings {
  detail: OutputDetail
  color: string
  showSpacing: boolean
  showContrast: boolean
  reactDetection: boolean
  persistAnnotations: boolean
  clearOnCopy: boolean
  blockInteractions: boolean
  sourceDetection: boolean
}

export interface MarkupProps {
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

  onAnnotationAdd?: (annotation: Annotation) => void
  onAnnotationDelete?: (annotation: Annotation) => void
  onAnnotationUpdate?: (annotation: Annotation) => void
  onAnnotationsClear?: (annotations: Annotation[]) => void
  onCopy?: (markdown: string) => void
  onDraw?: (event: DrawEvent) => void

  endpoint?: string
  sessionId?: string
  onSessionCreated?: (sessionId: string) => void
}

export type MarkupState = 'idle' | 'drawing' | 'noting'
