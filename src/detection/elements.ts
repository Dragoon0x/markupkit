import type { Shape, ResolvedElement, Annotation } from '../types'

const IGNORE_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK', 'META', 'HEAD', 'HTML'])

/** Build CSS selector for an element */
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

/** Detect React component name */
function getComponent(el: Element): string | null {
  const keys = Object.keys(el)
  const fiberKey = keys.find(k => k.startsWith('__reactFiber$'))
  if (fiberKey) {
    const fiber = (el as any)[fiberKey]
    if (fiber?.type?.name) return fiber.type.name
    if (fiber?.type?.displayName) return fiber.type.displayName
  }
  return el.getAttribute('data-component') || el.getAttribute('data-testid') || null
}

/** Convert element to ResolvedElement */
function resolveElement(el: Element): ResolvedElement {
  const rect = el.getBoundingClientRect()
  return {
    selector: buildSelector(el),
    tag: el.tagName.toLowerCase(),
    classes: typeof el.className === 'string' ? el.className : '',
    id: el.id || '',
    text: (el.textContent || '').trim().slice(0, 100),
    rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
    component: getComponent(el),
  }
}

/** Find elements enclosed within a bounding box */
function findElementsInBounds(
  bounds: { x: number; y: number; width: number; height: number },
  root: string,
  ignore: string[]
): ResolvedElement[] {
  const rootEl = document.querySelector(root) || document.body
  const allEls = rootEl.querySelectorAll('*')
  const results: ResolvedElement[] = []
  const ignoreSet = new Set(ignore)

  for (const el of Array.from(allEls)) {
    if (IGNORE_TAGS.has(el.tagName)) continue
    if (el.closest('[data-markup]')) continue
    if (ignoreSet.has(el.tagName.toLowerCase())) continue

    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue

    // Check if element center is inside bounds
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    if (cx >= bounds.x && cx <= bounds.x + bounds.width &&
        cy >= bounds.y && cy <= bounds.y + bounds.height) {
      // Only take leaf-ish elements
      const hasText = Array.from(el.childNodes).some(n => n.nodeType === 3 && (n.textContent || '').trim().length > 0)
      const isInteractive = ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A', 'IMG', 'VIDEO'].includes(el.tagName)
      const hasBg = getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)'

      if (hasText || isInteractive || hasBg) {
        results.push(resolveElement(el))
      }
    }
  }

  return results
}

/** Find the single element closest to a point */
function findElementAtPoint(x: number, y: number): ResolvedElement | null {
  const el = document.elementFromPoint(x, y)
  if (!el || el.closest('[data-markup]') || IGNORE_TAGS.has(el.tagName)) return null
  return resolveElement(el)
}

/** Find elements along a horizontal line (for strikethroughs) */
function findElementsAlongLine(
  y: number,
  x1: number,
  x2: number,
  root: string
): ResolvedElement[] {
  const rootEl = document.querySelector(root) || document.body
  const allEls = rootEl.querySelectorAll('*')
  const results: ResolvedElement[] = []

  for (const el of Array.from(allEls)) {
    if (IGNORE_TAGS.has(el.tagName)) continue
    if (el.closest('[data-markup]')) continue
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue

    // Element overlaps with the line's y-range and x-range
    if (y >= rect.y && y <= rect.y + rect.height &&
        rect.x + rect.width >= x1 && rect.x <= x2) {
      const hasText = (el.textContent || '').trim().length > 0
      if (hasText && el.children.length === 0) {
        results.push(resolveElement(el))
      }
    }
  }

  return results
}

/** Resolve a shape to annotations with elements */
export function resolveShape(
  shape: Shape,
  root: string = 'body',
  ignore: string[] = []
): Annotation {
  const id = `a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  let elements: ResolvedElement[] = []
  let intent = ''

  switch (shape.type) {
    case 'circle':
    case 'rectangle':
      elements = findElementsInBounds(shape.bounds, root, ignore)
      intent = elements.length === 1
        ? `Circled ${elements[0].tag} element — wants attention on this`
        : `Circled ${elements.length} elements — area needs review`
      break

    case 'arrow': {
      const startEl = shape.tail ? findElementAtPoint(shape.tail.x, shape.tail.y) : null
      const endEl = shape.head ? findElementAtPoint(shape.head.x, shape.head.y) : null
      if (startEl) elements.push(startEl)
      if (endEl && endEl.selector !== startEl?.selector) elements.push(endEl)
      intent = startEl && endEl
        ? `Arrow from ${startEl.tag} to ${endEl.tag} — move, connect, or relate these`
        : `Arrow pointing — directional feedback`
      break
    }

    case 'strikethrough': {
      const midY = shape.bounds.y + shape.bounds.height / 2
      elements = findElementsAlongLine(midY, shape.bounds.x, shape.bounds.x + shape.bounds.width, root)
      intent = elements.length > 0
        ? `Strikethrough over "${elements[0].text?.slice(0, 40)}" — remove or replace this`
        : `Strikethrough — delete what's here`
      break
    }

    case 'underline': {
      const bottomY = shape.bounds.y + shape.bounds.height
      elements = findElementsAlongLine(bottomY - 5, shape.bounds.x, shape.bounds.x + shape.bounds.width, root)
      intent = elements.length > 0
        ? `Underlined "${elements[0].text?.slice(0, 40)}" — emphasize or keep this`
        : `Underline — this part is correct`
      break
    }

    case 'cross': {
      elements = findElementsInBounds(shape.bounds, root, ignore)
      intent = `Crossed out — remove this entirely`
      break
    }

    case 'line':
    case 'freehand':
    default: {
      // Find nearest element to the stroke center
      const cx = shape.bounds.x + shape.bounds.width / 2
      const cy = shape.bounds.y + shape.bounds.height / 2
      const el = findElementAtPoint(cx, cy)
      if (el) elements.push(el)
      intent = `Freehand annotation near ${el ? el.tag : 'area'}`
      break
    }
  }

  return {
    id,
    shape,
    elements,
    intent,
    note: shape.note,
    timestamp: Date.now(),
  }
}
