import type { Rect, LayoutChange, LayoutSession, ElementSnapshot, DragState, ResizeHandle } from './types'
import { collectGuides, snapToGuides, snapToGrid } from './guides'

/** Generate a unique ID for elements */
let _counter = 0
export function newLayoutId(): string {
  return `mk-layout-${++_counter}-${Date.now().toString(36)}`
}

/** Capture a snapshot of an element's current state */
export function snapshotElement(el: HTMLElement): ElementSnapshot {
  const rect = el.getBoundingClientRect()
  const computed = getComputedStyle(el)
  const selector = buildSelector(el)

  return {
    id: el.dataset.mkId || selector,
    selector,
    tag: el.tagName.toLowerCase(),
    classes: Array.from(el.classList),
    text: (el.textContent || '').slice(0, 100).trim(),
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    computedStyles: {
      display: computed.display,
      position: computed.position,
      flexDirection: computed.flexDirection,
      gap: computed.gap,
      padding: computed.padding,
      margin: computed.margin,
      width: computed.width,
      height: computed.height,
    },
    children: Array.from(el.children).map(c => buildSelector(c as HTMLElement)),
    parent: el.parentElement ? buildSelector(el.parentElement) : null,
    reactComponent: detectReactComponent(el),
  }
}

/** Build a CSS selector for an element */
function buildSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`
  
  const tag = el.tagName.toLowerCase()
  const classes = Array.from(el.classList)
    .filter(c => !c.startsWith('mk-'))
    .slice(0, 3)
    .join('.')

  if (classes) return `${tag}.${classes}`

  // Use nth-child
  const parent = el.parentElement
  if (parent) {
    const index = Array.from(parent.children).indexOf(el) + 1
    return `${tag}:nth-child(${index})`
  }

  return tag
}

/** Detect React component name via fiber */
function detectReactComponent(el: HTMLElement): string | undefined {
  const key = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'))
  if (!key) return undefined

  let fiber = (el as any)[key]
  while (fiber) {
    if (fiber.type && typeof fiber.type === 'function') {
      return fiber.type.displayName || fiber.type.name || undefined
    }
    fiber = fiber.return
  }
  return undefined
}

/** Calculate resize cursor based on handle position */
export function getResizeCursor(handle: ResizeHandle): string {
  const map: Record<ResizeHandle, string> = {
    n: 'ns-resize', s: 'ns-resize',
    e: 'ew-resize', w: 'ew-resize',
    ne: 'nesw-resize', sw: 'nesw-resize',
    nw: 'nwse-resize', se: 'nwse-resize',
  }
  return map[handle]
}

/** Detect which resize handle a point is near */
export function hitTestResizeHandle(
  point: { x: number; y: number },
  rect: Rect,
  handleSize: number = 8
): ResizeHandle | null {
  const hs = handleSize
  const { x, y, width, height } = rect
  const mx = x + width / 2
  const my = y + height / 2

  // Corners first
  if (Math.abs(point.x - x) < hs && Math.abs(point.y - y) < hs) return 'nw'
  if (Math.abs(point.x - (x + width)) < hs && Math.abs(point.y - y) < hs) return 'ne'
  if (Math.abs(point.x - x) < hs && Math.abs(point.y - (y + height)) < hs) return 'sw'
  if (Math.abs(point.x - (x + width)) < hs && Math.abs(point.y - (y + height)) < hs) return 'se'

  // Edges
  if (Math.abs(point.y - y) < hs && point.x > x && point.x < x + width) return 'n'
  if (Math.abs(point.y - (y + height)) < hs && point.x > x && point.x < x + width) return 's'
  if (Math.abs(point.x - x) < hs && point.y > y && point.y < y + height) return 'w'
  if (Math.abs(point.x - (x + width)) < hs && point.y > y && point.y < y + height) return 'e'

  return null
}

/** Apply resize handle delta to a rect */
export function applyResize(
  rect: Rect,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  minSize: number = 24
): Rect {
  const r = { ...rect }

  if (handle.includes('e')) {
    r.width = Math.max(minSize, rect.width + dx)
  }
  if (handle.includes('w')) {
    const newWidth = Math.max(minSize, rect.width - dx)
    r.x = rect.x + rect.width - newWidth
    r.width = newWidth
  }
  if (handle.includes('s')) {
    r.height = Math.max(minSize, rect.height + dy)
  }
  if (handle.includes('n')) {
    const newHeight = Math.max(minSize, rect.height - dy)
    r.y = rect.y + rect.height - newHeight
    r.height = newHeight
  }

  return r
}

/** Create a layout change record */
export function createChange(
  type: LayoutChange['type'],
  el: HTMLElement | null,
  from: Rect | null,
  to: Rect | null,
  options?: Partial<LayoutChange>
): LayoutChange {
  return {
    type,
    elementId: el?.dataset.mkId || '',
    selector: el ? buildSelector(el) : options?.selector || '',
    tag: el?.tagName.toLowerCase() || '',
    from: from || undefined,
    to: to || undefined,
    delta: from && to ? {
      dx: Math.round(to.x - from.x),
      dy: Math.round(to.y - from.y),
      dw: Math.round(to.width - from.width),
      dh: Math.round(to.height - from.height),
    } : undefined,
    timestamp: Date.now(),
    ...options,
  }
}

/** Create a new layout session */
export function createSession(): LayoutSession {
  return {
    url: typeof window !== 'undefined' ? window.location.href : '',
    viewport: typeof window !== 'undefined'
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 0, height: 0 },
    changes: [],
    snapshots: {
      before: new Map(),
      after: new Map(),
    },
    startedAt: Date.now(),
    updatedAt: Date.now(),
  }
}
