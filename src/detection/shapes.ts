import type { Point, Stroke, Shape, ShapeType } from '../types'
import { strokeBounds, getEndAngle } from '../core/drawing'

/** Detect what shape a stroke represents */
export function detectShape(stroke: Stroke): Shape {
  const { points } = stroke
  const bounds = strokeBounds(points)
  const base: Omit<Shape, 'type' | 'confidence'> = {
    stroke,
    bounds,
    note: '',
  }

  if (points.length < 3) {
    return { ...base, type: 'freehand', confidence: 0.5 }
  }

  // Score each shape type
  const scores: Array<{ type: ShapeType; confidence: number; extra?: Partial<Shape> }> = [
    { type: 'circle', confidence: scoreCircle(points, bounds) },
    { type: 'arrow', confidence: scoreArrow(points), extra: {
      tail: points[0],
      head: points[points.length - 1],
    }},
    { type: 'line', confidence: scoreLine(points, bounds) },
    { type: 'strikethrough', confidence: scoreStrikethrough(points, bounds) },
    { type: 'underline', confidence: scoreUnderline(points, bounds) },
    { type: 'rectangle', confidence: scoreRectangle(points, bounds) },
    { type: 'cross', confidence: scoreCross(points, bounds) },
  ]

  // Pick highest scoring shape
  scores.sort((a, b) => b.confidence - a.confidence)
  const best = scores[0]

  // Fallback to freehand if confidence is too low
  if (best.confidence < 0.35) {
    return { ...base, type: 'freehand', confidence: 0.3 }
  }

  return {
    ...base,
    type: best.type,
    confidence: best.confidence,
    ...best.extra,
  }
}

// --- Shape scorers ---

function scoreCircle(points: Point[], bounds: { width: number; height: number; x: number; y: number }): number {
  if (points.length < 8) return 0

  // Check if stroke is roughly closed (start near end)
  const start = points[0]
  const end = points[points.length - 1]
  const closeDist = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2)
  const perimeter = Math.max(bounds.width, bounds.height) * Math.PI
  const closeRatio = closeDist / perimeter

  // Check aspect ratio (should be roughly square)
  const aspect = bounds.width / Math.max(1, bounds.height)
  const aspectScore = 1 - Math.abs(1 - aspect) * 0.5

  // Check if points are roughly equidistant from center
  const cx = bounds.x + bounds.width / 2
  const cy = bounds.y + bounds.height / 2
  const avgRadius = (bounds.width + bounds.height) / 4
  let radiusVariance = 0
  for (const p of points) {
    const r = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2)
    radiusVariance += Math.abs(r - avgRadius) / avgRadius
  }
  radiusVariance /= points.length
  const radiusScore = Math.max(0, 1 - radiusVariance * 2)

  // Minimum size
  if (bounds.width < 20 || bounds.height < 20) return 0

  const closedScore = closeRatio < 0.3 ? 1 : closeRatio < 0.5 ? 0.5 : 0
  return (closedScore * 0.3 + aspectScore * 0.3 + radiusScore * 0.4) * (points.length > 12 ? 1 : 0.7)
}

function scoreArrow(points: Point[]): number {
  if (points.length < 5) return 0

  // Check if generally straight with a direction change at the end (arrowhead)
  const totalLen = pathLength(points)
  const directLen = dist(points[0], points[points.length - 1])
  const straightness = directLen / Math.max(1, totalLen)

  // Check for direction change near end (indicating arrowhead drawing)
  const lastQuarter = points.slice(Math.floor(points.length * 0.75))
  let dirChanges = 0
  for (let i = 2; i < lastQuarter.length; i++) {
    const a1 = Math.atan2(lastQuarter[i - 1].y - lastQuarter[i - 2].y, lastQuarter[i - 1].x - lastQuarter[i - 2].x)
    const a2 = Math.atan2(lastQuarter[i].y - lastQuarter[i - 1].y, lastQuarter[i].x - lastQuarter[i - 1].x)
    if (Math.abs(angleDiff(a1, a2)) > 0.5) dirChanges++
  }

  // Arrows tend to be relatively straight with some end flourish
  if (straightness > 0.7 && totalLen > 40) return 0.5 + (dirChanges > 0 ? 0.2 : 0)
  if (straightness > 0.85 && totalLen > 60) return 0.7
  return straightness * 0.4
}

function scoreLine(points: Point[], bounds: { width: number; height: number }): number {
  if (points.length < 3) return 0
  const totalLen = pathLength(points)
  const directLen = dist(points[0], points[points.length - 1])
  const straightness = directLen / Math.max(1, totalLen)
  if (straightness < 0.85) return 0
  if (totalLen < 20) return 0
  return straightness * 0.8
}

function scoreStrikethrough(points: Point[], bounds: { width: number; height: number }): number {
  // Mostly horizontal, wider than tall
  if (bounds.width < 30) return 0
  const ratio = bounds.width / Math.max(1, bounds.height)
  if (ratio < 3) return 0

  const straightness = dist(points[0], points[points.length - 1]) / Math.max(1, pathLength(points))
  if (straightness < 0.8) return 0

  // Check if roughly horizontal
  const angle = Math.abs(Math.atan2(
    points[points.length - 1].y - points[0].y,
    points[points.length - 1].x - points[0].x
  ))
  if (angle > 0.4 && angle < Math.PI - 0.4) return 0

  return Math.min(1, ratio / 8) * straightness
}

function scoreUnderline(points: Point[], bounds: { width: number; height: number }): number {
  // Same as strikethrough but we'll differentiate by position relative to elements later
  return scoreStrikethrough(points, bounds) * 0.9
}

function scoreRectangle(points: Point[], bounds: { width: number; height: number }): number {
  if (points.length < 10) return 0
  if (bounds.width < 20 || bounds.height < 20) return 0

  // Check closure
  const closeDist = dist(points[0], points[points.length - 1])
  if (closeDist > bounds.width * 0.3) return 0

  // Check for ~4 corners (sharp direction changes)
  let corners = 0
  for (let i = 2; i < points.length; i++) {
    const a1 = Math.atan2(points[i - 1].y - points[i - 2].y, points[i - 1].x - points[i - 2].x)
    const a2 = Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x)
    if (Math.abs(angleDiff(a1, a2)) > 0.8) corners++
  }

  const aspect = bounds.width / Math.max(1, bounds.height)
  if (aspect > 0.3 && aspect < 3 && corners >= 3) return 0.6
  return 0
}

function scoreCross(points: Point[], bounds: { x: number; y: number; width: number; height: number }): number {
  // Small-ish, roughly square bounds, with intersecting strokes
  if (bounds.width < 15 || bounds.height < 15) return 0
  if (bounds.width > 100 || bounds.height > 100) return 0
  const aspect = bounds.width / Math.max(1, bounds.height)
  if (aspect < 0.4 || aspect > 2.5) return 0

  // Check for self-intersection
  // Simple: check if path crosses through center multiple times
  const cx = bounds.x + bounds.width / 2
  const cy = bounds.y + bounds.height / 2
  let centerCrossings = 0
  const threshold = Math.min(bounds.width, bounds.height) * 0.25
  for (const p of points) {
    if (Math.abs(p.x - cx) < threshold && Math.abs(p.y - cy) < threshold) centerCrossings++
  }
  return centerCrossings > points.length * 0.15 ? 0.5 : 0
}

// --- Helpers ---

function dist(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

function pathLength(points: Point[]): number {
  let len = 0
  for (let i = 1; i < points.length; i++) len += dist(points[i - 1], points[i])
  return len
}

function angleDiff(a: number, b: number): number {
  let d = b - a
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return d
}
