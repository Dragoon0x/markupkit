export { Markup } from './Markup'
export { detectShape } from './detection/shapes'
export { resolveShape } from './detection/elements'
export { formatSession, formatSingleAnnotation } from './output/format'
export { renderStroke, smoothPoints, strokeBounds } from './core/drawing'

export type {
  MarkupProps, MarkupState, ToolMode,
  Stroke, Point, Shape, ShapeType,
  Annotation, ResolvedElement, MarkupSession,
  OutputDetail, DrawEvent,
} from './types'
