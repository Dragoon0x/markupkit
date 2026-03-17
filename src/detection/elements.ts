import type { Shape, ResolvedElement, Annotation, SpacingData, ContrastData, AnnotationMode } from '../types'
import { contrastRatio } from '../core/contrast'

const IGNORE_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK', 'META', 'HEAD', 'HTML'])

function buildSelector(el: Element): string {
  if (el.id) return `#${el.id}`
  const parts: string[] = []
  let cur: Element | null = el
  while (cur && cur !== document.body) {
    let s = cur.tagName.toLowerCase()
    if (cur.id) { parts.unshift(`#${cur.id}`); break }
    if (cur.className && typeof cur.className === 'string') {
      const cls = cur.className.trim().split(/\s+/).filter(c => !c.startsWith('markup-') && c.length < 40).slice(0, 2)
      if (cls.length) s += '.' + cls.join('.')
    }
    const p = cur.parentElement
    if (p) {
      const sibs = Array.from(p.children).filter(c => c.tagName === cur!.tagName)
      if (sibs.length > 1) s += `:nth-child(${sibs.indexOf(cur) + 1})`
    }
    parts.unshift(s)
    cur = cur.parentElement
  }
  return parts.join(' > ')
}

function getComponent(el: Element): string | null {
  const keys = Object.keys(el)
  const fk = keys.find(k => k.startsWith('__reactFiber$'))
  if (fk) {
    const f = (el as any)[fk]
    if (f?.type?.name) return f.type.name
    if (f?.type?.displayName) return f.type.displayName
  }
  return el.getAttribute('data-component') || el.getAttribute('data-testid') || null
}

/** Detect source file from React fiber debug info or data attributes */
function getSourceFile(el: Element): string | null {
  // React dev tools source
  const keys = Object.keys(el)
  const fk = keys.find(k => k.startsWith('__reactFiber$'))
  if (fk) {
    const f = (el as any)[fk]
    if (f?._debugSource) {
      const s = f._debugSource
      return `${s.fileName}:${s.lineNumber}`
    }
  }
  // Vite/Webpack data attributes
  return el.getAttribute('data-source') || el.getAttribute('data-file') || null
}

/** Get spacing (padding + margin) */
function getSpacing(el: Element): SpacingData {
  const cs = window.getComputedStyle(el)
  return {
    paddingTop: Math.round(parseFloat(cs.paddingTop) || 0),
    paddingRight: Math.round(parseFloat(cs.paddingRight) || 0),
    paddingBottom: Math.round(parseFloat(cs.paddingBottom) || 0),
    paddingLeft: Math.round(parseFloat(cs.paddingLeft) || 0),
    marginTop: Math.round(parseFloat(cs.marginTop) || 0),
    marginRight: Math.round(parseFloat(cs.marginRight) || 0),
    marginBottom: Math.round(parseFloat(cs.marginBottom) || 0),
    marginLeft: Math.round(parseFloat(cs.marginLeft) || 0),
  }
}

/** Get contrast data for text element */
function getContrast(el: Element): ContrastData | null {
  const cs = window.getComputedStyle(el)
  const fg = cs.color
  const bg = cs.backgroundColor
  if (!fg || !bg || bg === 'rgba(0, 0, 0, 0)') return null
  const ratio = contrastRatio(fg, bg)
  if (ratio === null) return null
  return { ratio, aa: ratio >= 4.5, aaa: ratio >= 7, foreground: fg, background: bg }
}

/** Get computed styles for forensic output */
function getComputedStyles(el: Element): Record<string, string> {
  const cs = window.getComputedStyle(el)
  const styles: Record<string, string> = {}
  const props = ['padding', 'margin', 'border', 'borderRadius', 'background', 'backgroundColor',
    'color', 'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'display', 'position',
    'width', 'height', 'opacity', 'transform', 'zIndex']
  for (const p of props) {
    const v = cs.getPropertyValue(p.replace(/[A-Z]/g, m => '-' + m.toLowerCase()))
    if (v && v !== 'none' && v !== 'normal' && v !== 'auto' && v !== '0px' && v !== 'rgba(0, 0, 0, 0)') {
      styles[p] = v
    }
  }
  return styles
}

function resolveElement(el: Element, detailed: boolean = false): ResolvedElement {
  const rect = el.getBoundingClientRect()
  return {
    selector: buildSelector(el),
    tag: el.tagName.toLowerCase(),
    classes: typeof el.className === 'string' ? el.className : '',
    id: el.id || '',
    text: (el.textContent || '').trim().slice(0, 100),
    rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
    component: getComponent(el),
    source: getSourceFile(el),
    spacing: detailed ? getSpacing(el) : null,
    contrast: getContrast(el),
    computedStyles: detailed ? getComputedStyles(el) : null,
  }
}

function findElementsInBounds(bounds: { x: number; y: number; width: number; height: number }, root: string, ignore: string[]): ResolvedElement[] {
  const rootEl = document.querySelector(root) || document.body
  const allEls = rootEl.querySelectorAll('*')
  const results: ResolvedElement[] = []; const ignoreSet = new Set(ignore)
  for (const el of Array.from(allEls)) {
    if (IGNORE_TAGS.has(el.tagName) || el.closest('[data-markup]') || ignoreSet.has(el.tagName.toLowerCase())) continue
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue
    const cx = rect.x + rect.width / 2, cy = rect.y + rect.height / 2
    if (cx >= bounds.x && cx <= bounds.x + bounds.width && cy >= bounds.y && cy <= bounds.y + bounds.height) {
      const hasText = Array.from(el.childNodes).some(n => n.nodeType === 3 && (n.textContent || '').trim().length > 0)
      const isInteractive = ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A', 'IMG', 'VIDEO'].includes(el.tagName)
      if (hasText || isInteractive) results.push(resolveElement(el, true))
    }
  }
  return results
}

function findElementAtPoint(x: number, y: number): ResolvedElement | null {
  const el = document.elementFromPoint(x, y)
  if (!el || el.closest('[data-markup]') || IGNORE_TAGS.has(el.tagName)) return null
  return resolveElement(el, true)
}

function findElementsAlongLine(y: number, x1: number, x2: number, root: string): ResolvedElement[] {
  const rootEl = document.querySelector(root) || document.body
  const allEls = rootEl.querySelectorAll('*'); const results: ResolvedElement[] = []
  for (const el of Array.from(allEls)) {
    if (IGNORE_TAGS.has(el.tagName) || el.closest('[data-markup]')) continue
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue
    if (y >= rect.y && y <= rect.y + rect.height && rect.x + rect.width >= x1 && rect.x <= x2) {
      const hasText = (el.textContent || '').trim().length > 0
      if (hasText && el.children.length === 0) results.push(resolveElement(el, true))
    }
  }
  return results
}

/** Resolve a shape to an annotation with elements */
export function resolveShape(shape: Shape, root: string = 'body', ignore: string[] = []): Annotation {
  const id = `a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  let elements: ResolvedElement[] = []; let intent = ''
  switch (shape.type) {
    case 'circle': case 'rectangle':
      elements = findElementsInBounds(shape.bounds, root, ignore)
      intent = elements.length === 1 ? `Circled ${elements[0].tag} element` : `Circled ${elements.length} elements — area needs review`
      break
    case 'arrow': {
      const s = shape.tail ? findElementAtPoint(shape.tail.x, shape.tail.y) : null
      const e = shape.head ? findElementAtPoint(shape.head.x, shape.head.y) : null
      if (s) elements.push(s); if (e && e.selector !== s?.selector) elements.push(e)
      intent = s && e ? `Arrow from ${s.tag} to ${e.tag} — move or relate` : `Arrow — directional feedback`
      break
    }
    case 'strikethrough': {
      const midY = shape.bounds.y + shape.bounds.height / 2
      elements = findElementsAlongLine(midY, shape.bounds.x, shape.bounds.x + shape.bounds.width, root)
      intent = elements.length > 0 ? `Strikethrough over "${elements[0].text?.slice(0, 40)}" — remove or replace` : `Strikethrough — delete this`
      break
    }
    case 'underline': {
      const bottomY = shape.bounds.y + shape.bounds.height
      elements = findElementsAlongLine(bottomY - 5, shape.bounds.x, shape.bounds.x + shape.bounds.width, root)
      intent = elements.length > 0 ? `Underlined "${elements[0].text?.slice(0, 40)}" — emphasize` : `Underline — keep this`
      break
    }
    case 'cross':
      elements = findElementsInBounds(shape.bounds, root, ignore)
      intent = `Crossed out — remove entirely`
      break
    default: {
      const cx = shape.bounds.x + shape.bounds.width / 2, cy = shape.bounds.y + shape.bounds.height / 2
      const el = findElementAtPoint(cx, cy)
      if (el) elements.push(el)
      intent = `Freehand near ${el ? el.tag : 'area'}`
    }
  }
  return { id, shape, elements, intent, note: shape.note, timestamp: Date.now(), mode: 'draw' }
}

/** Resolve a clicked element to an annotation */
export function resolveClickedElement(x: number, y: number): Annotation | null {
  const el = findElementAtPoint(x, y)
  if (!el) return null
  const id = `a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  return {
    id, note: '', timestamp: Date.now(), mode: 'click',
    shape: { type: 'freehand', stroke: { id: 'click', points: [{x, y, t: Date.now()}], color: '#171717', width: 0, timestamp: Date.now() },
      bounds: el.rect, confidence: 1, note: '' },
    elements: [el], intent: `Clicked ${el.tag} element — "${el.text.slice(0, 40)}"`
  }
}

/** Resolve selected text to an annotation */
export function resolveTextSelection(): Annotation | null {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed) return null
  const text = sel.toString().trim()
  if (!text) return null
  const range = sel.getRangeAt(0)
  const rect = range.getBoundingClientRect()
  const container = range.startContainer.parentElement
  const el = container ? resolveElement(container, true) : null
  const id = `a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  sel.removeAllRanges()
  return {
    id, note: '', timestamp: Date.now(), mode: 'text', selectedText: text,
    shape: { type: 'freehand', stroke: { id: 'text', points: [], color: '#171717', width: 0, timestamp: Date.now() },
      bounds: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
      confidence: 1, note: '' },
    elements: el ? [el] : [],
    intent: `Selected text: "${text.slice(0, 60)}"`
  }
}

/** Resolve area selection to an annotation */
export function resolveAreaSelection(bounds: { x: number; y: number; width: number; height: number }, root: string = 'body', ignore: string[] = []): Annotation {
  const elements = findElementsInBounds(bounds, root, ignore)
  const id = `a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  return {
    id, note: '', timestamp: Date.now(), mode: 'area',
    shape: { type: 'rectangle', stroke: { id: 'area', points: [], color: '#171717', width: 0, timestamp: Date.now() },
      bounds, confidence: 1, note: '' },
    elements,
    intent: `Selected area with ${elements.length} elements`
  }
}

/** Get spacing data for an element at a point (for hover visualization) */
export function getElementSpacingAtPoint(x: number, y: number): { el: Element; spacing: SpacingData; rect: DOMRect } | null {
  const el = document.elementFromPoint(x, y)
  if (!el || el.closest('[data-markup]')) return null
  return { el, spacing: getSpacing(el), rect: el.getBoundingClientRect() }
}

/** Get contrast data for an element at a point */
export function getElementContrastAtPoint(x: number, y: number): ContrastData | null {
  const el = document.elementFromPoint(x, y)
  if (!el || el.closest('[data-markup]')) return null
  return getContrast(el)
}
