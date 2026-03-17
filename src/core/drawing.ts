import type { Point, Stroke } from '../types'

let strokeCounter = 0

/** Generate a unique stroke ID */
export function newStrokeId(): string {
  return `s_${Date.now()}_${++strokeCounter}`
}

/** Smooth a point array using a simple moving average */
export function smoothPoints(points: Point[], windowSize = 3): Point[] {
  if (points.length < windowSize) return points
  const smoothed: Point[] = []
  for (let i = 0; i < points.length; i++) {
    let sx = 0, sy = 0, count = 0
    for (let j = Math.max(0, i - windowSize); j <= Math.min(points.length - 1, i + windowSize); j++) {
      sx += points[j].x
      sy += points[j].y
      count++
    }
    smoothed.push({ x: sx / count, y: sy / count, t: points[i].t })
  }
  return smoothed
}

/** Render a stroke to canvas with variable width for natural feel */
export function renderStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  opts: { glow?: boolean; opacity?: number } = {}
) {
  const { points, color, width } = stroke
  if (points.length < 2) return

  const alpha = opts.opacity ?? 0.85

  // Glow pass
  if (opts.glow !== false) {
    ctx.globalAlpha = alpha * 0.2
    ctx.strokeStyle = color
    ctx.lineWidth = width + 6
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1]
      const p1 = points[i]
      const mx = (p0.x + p1.x) / 2
      const my = (p0.y + p1.y) / 2
      ctx.quadraticCurveTo(p0.x, p0.y, mx, my)
    }
    ctx.stroke()
  }

  // Main stroke with variable width based on speed
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1]
    const p1 = points[i]

    // Speed-based width variation
    const dx = p1.x - p0.x
    const dy = p1.y - p0.y
    const dt = Math.max(1, p1.t - p0.t)
    const speed = Math.sqrt(dx * dx + dy * dy) / dt
    const speedFactor = Math.max(0.5, Math.min(1.5, 1.2 - speed * 0.015))

    ctx.lineWidth = width * speedFactor
    ctx.beginPath()
    ctx.moveTo(p0.x, p0.y)

    if (i < points.length - 1) {
      const p2 = points[i + 1]
      const mx = (p1.x + p2.x) / 2
      const my = (p1.y + p2.y) / 2
      ctx.quadraticCurveTo(p1.x, p1.y, mx, my)
    } else {
      ctx.lineTo(p1.x, p1.y)
    }
    ctx.stroke()
  }

  ctx.globalAlpha = 1
}

/** Render an arrowhead at the end of a stroke */
export function renderArrowhead(
  ctx: CanvasRenderingContext2D,
  tip: Point,
  angle: number,
  size: number,
  color: string
) {
  ctx.fillStyle = color
  ctx.globalAlpha = 0.85
  ctx.beginPath()
  ctx.moveTo(tip.x, tip.y)
  ctx.lineTo(
    tip.x - size * Math.cos(angle - Math.PI / 6),
    tip.y - size * Math.sin(angle - Math.PI / 6)
  )
  ctx.lineTo(
    tip.x - size * Math.cos(angle + Math.PI / 6),
    tip.y - size * Math.sin(angle + Math.PI / 6)
  )
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1
}

/** Get the angle of the last segment of a stroke */
export function getEndAngle(points: Point[]): number {
  if (points.length < 2) return 0
  const p0 = points[points.length - 2]
  const p1 = points[points.length - 1]
  return Math.atan2(p1.y - p0.y, p1.x - p0.x)
}

/** Calculate bounding box of a stroke */
export function strokeBounds(points: Point[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}
