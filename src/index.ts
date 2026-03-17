export { Markup } from './Markup'
export { detectShape } from './detection/shapes'
export { resolveShape, resolveClickedElement, resolveTextSelection, resolveAreaSelection, getElementSpacingAtPoint, getElementContrastAtPoint } from './detection/elements'
export { formatSession, formatSingleAnnotation } from './output/format'
export { renderStroke, smoothPoints, strokeBounds } from './core/drawing'
export { contrastRatio, luminance, parseRGB } from './core/contrast'

export type {
  MarkupProps, MarkupState, ToolMode, AnnotationMode, MarkupSettings,
  Stroke, Point, Shape, ShapeType,
  Annotation, ResolvedElement, MarkupSession,
  OutputDetail, DrawEvent, SpacingData, ContrastData,
} from './types'
