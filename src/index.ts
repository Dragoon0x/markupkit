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

// Layout Mode (v2.0)
export type {
  Rect, LayoutChange, LayoutSession, ElementSnapshot,
  DragState, ResizeHandle, LayoutModeState,
  Guide, SnapResult, PaletteComponent,
} from './layout/types'

export {
  newLayoutId, snapshotElement, getResizeCursor,
  hitTestResizeHandle, applyResize, createChange, createSession,
} from './layout/engine'

export { collectGuides, snapToGuides, snapToGrid, measureSpacing } from './layout/guides'
export { PALETTE, getByCategory, getCategories, findComponent } from './layout/palette'
export { formatLayoutSession, formatLayoutJSON } from './layout/format'
