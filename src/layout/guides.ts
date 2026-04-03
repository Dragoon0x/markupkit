import type { Rect, Guide, SnapResult } from './types'

/** Collect alignment guides from sibling elements */
export function collectGuides(
  elements: { id: string; rect: Rect }[],
  excludeId: string
): Guide[] {
  const guides: Guide[] = []

  for (const el of elements) {
    if (el.id === excludeId) continue

    // Vertical guides (x positions)
    guides.push({ type: 'vertical', position: el.rect.x, source: el.id, kind: 'edge' })
    guides.push({ type: 'vertical', position: el.rect.x + el.rect.width, source: el.id, kind: 'edge' })
    guides.push({ type: 'vertical', position: el.rect.x + el.rect.width / 2, source: el.id, kind: 'center' })

    // Horizontal guides (y positions)
    guides.push({ type: 'horizontal', position: el.rect.y, source: el.id, kind: 'edge' })
    guides.push({ type: 'horizontal', position: el.rect.y + el.rect.height, source: el.id, kind: 'edge' })
    guides.push({ type: 'horizontal', position: el.rect.y + el.rect.height / 2, source: el.id, kind: 'center' })
  }

  return guides
}

/** Snap a rect to nearby guides */
export function snapToGuides(
  rect: Rect,
  guides: Guide[],
  threshold: number = 6
): SnapResult {
  let snappedX = false
  let snappedY = false
  let bestDx = Infinity
  let bestDy = Infinity
  let finalX = rect.x
  let finalY = rect.y
  const activeGuides: Guide[] = []

  // X edges to check
  const xEdges = [rect.x, rect.x + rect.width / 2, rect.x + rect.width]

  for (const guide of guides) {
    if (guide.type === 'vertical') {
      for (const edge of xEdges) {
        const dist = Math.abs(edge - guide.position)
        if (dist < threshold && dist < bestDx) {
          bestDx = dist
          finalX = rect.x + (guide.position - edge)
          snappedX = true
          // Replace or add guide
          const idx = activeGuides.findIndex(g => g.type === 'vertical')
          if (idx >= 0) activeGuides[idx] = guide
          else activeGuides.push(guide)
        }
      }
    }
  }

  // Y edges to check
  const yEdges = [rect.y, rect.y + rect.height / 2, rect.y + rect.height]

  for (const guide of guides) {
    if (guide.type === 'horizontal') {
      for (const edge of yEdges) {
        const dist = Math.abs(edge - guide.position)
        if (dist < threshold && dist < bestDy) {
          bestDy = dist
          finalY = rect.y + (guide.position - edge)
          snappedY = true
          const idx = activeGuides.findIndex(g => g.type === 'horizontal')
          if (idx >= 0) activeGuides[idx] = guide
          else activeGuides.push(guide)
        }
      }
    }
  }

  return { x: finalX, y: finalY, guides: activeGuides, snappedX, snappedY }
}

/** Snap to an 8px grid */
export function snapToGrid(x: number, y: number, gridSize: number = 8): { x: number; y: number } {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize,
  }
}

/** Calculate spacing between two rects */
export function measureSpacing(a: Rect, b: Rect): {
  horizontal: number | null
  vertical: number | null
  direction: 'left' | 'right' | 'above' | 'below' | 'overlap'
} {
  const aRight = a.x + a.width
  const bRight = b.x + b.width
  const aBottom = a.y + a.height
  const bBottom = b.y + b.height

  let horizontal: number | null = null
  let vertical: number | null = null
  let direction: 'left' | 'right' | 'above' | 'below' | 'overlap' = 'overlap'

  if (aRight <= b.x) {
    horizontal = b.x - aRight
    direction = 'right'
  } else if (bRight <= a.x) {
    horizontal = a.x - bRight
    direction = 'left'
  }

  if (aBottom <= b.y) {
    vertical = b.y - aBottom
    direction = 'below'
  } else if (bBottom <= a.y) {
    vertical = a.y - bBottom
    direction = 'above'
  }

  return { horizontal, vertical, direction }
}
