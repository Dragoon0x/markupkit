import type { MarkupSession, Annotation, OutputDetail } from '../types'

const SHAPE_ICON: Record<string, string> = {
  circle: '⭕', arrow: '➡️', line: '—', strikethrough: '~~',
  underline: '__', freehand: '✏️', rectangle: '▭', cross: '✕',
}

function formatAnnotationCompact(a: Annotation, index: number): string {
  const icon = SHAPE_ICON[a.shape.type] || '•'
  const sels = a.elements.map(e => `\`${e.selector}\``).join(', ') || `area (${Math.round(a.shape.bounds.x)},${Math.round(a.shape.bounds.y)})`
  const note = a.note ? ` — "${a.note}"` : ''
  return `${index}. ${icon} ${a.shape.type} ${sels}${note}`
}

function formatAnnotation(a: Annotation, detail: OutputDetail): string {
  const lines: string[] = []
  const icon = SHAPE_ICON[a.shape.type] || '•'

  // Header with confidence for detailed/forensic
  if (detail === 'detailed' || detail === 'forensic') {
    lines.push(`### ${icon} ${a.shape.type} (confidence: ${a.shape.confidence.toFixed(2)}): ${a.intent}`)
  } else {
    lines.push(`### ${icon} ${a.shape.type}: ${a.intent}`)
  }

  if (a.note) lines.push(`> ${a.note}`)

  // Gesture bounds for forensic
  if (detail === 'forensic') {
    const b = a.shape.bounds
    lines.push(`Gesture bounds: ${Math.round(b.x)}, ${Math.round(b.y)}, ${Math.round(b.width)}×${Math.round(b.height)}`)
  }

  lines.push('')

  for (const el of a.elements) {
    lines.push(`- **\`${el.selector}\`**`)
    if (el.component) lines.push(`  Component: ${el.component}`)
    if (el.text) lines.push(`  Text: "${el.text.slice(0, 80)}"`)

    if (detail === 'detailed' || detail === 'forensic') {
      lines.push(`  Rect: ${el.rect.x}, ${el.rect.y}, ${el.rect.width}×${el.rect.height}`)
      if (el.id) lines.push(`  ID: ${el.id}`)
      if (el.classes) lines.push(`  Classes: ${el.classes}`)
    }

    // Forensic: attempt to read computed styles from DOM
    if (detail === 'forensic') {
      try {
        const domEl = document.querySelector(el.selector)
        if (domEl) {
          const cs = window.getComputedStyle(domEl)
          const styles = [
            `padding: ${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
            `margin: ${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`,
            `border-radius: ${cs.borderRadius}`,
            `background: ${cs.backgroundColor}`,
            `color: ${cs.color}`,
            `font-size: ${cs.fontSize}`,
            `font-weight: ${cs.fontWeight}`,
          ].filter(s => !s.endsWith('0px 0px 0px 0px') && !s.endsWith('rgba(0, 0, 0, 0)'))
          if (styles.length) {
            lines.push(`  Styles:`)
            for (const s of styles) lines.push(`    ${s}`)
          }
        }
      } catch { /* DOM not available in non-browser contexts */ }
    }
  }

  if (a.elements.length === 0) {
    lines.push(`- Area at (${Math.round(a.shape.bounds.x)}, ${Math.round(a.shape.bounds.y)}) — ${Math.round(a.shape.bounds.width)}×${Math.round(a.shape.bounds.height)}`)
  }

  return lines.join('\n')
}

/** Generate full session markdown */
export function formatSession(session: MarkupSession, detail: OutputDetail = 'standard'): string {
  const lines: string[] = []

  // Compact: minimal header
  if (detail === 'compact') {
    lines.push(`# MarkupKit`)
    lines.push(`**${session.annotations.length} annotations** on ${session.url}`)
    lines.push('')
    for (let i = 0; i < session.annotations.length; i++) {
      lines.push(formatAnnotationCompact(session.annotations[i], i + 1))
    }
    return lines.join('\n')
  }

  // Standard/Detailed/Forensic
  if (detail === 'forensic') {
    lines.push(`# MarkupKit Feedback — Forensic`)
  } else {
    lines.push(`# MarkupKit Feedback`)
  }
  lines.push('')
  lines.push(`**${session.annotations.length} annotations** on ${session.url}`)
  lines.push(`Viewport: ${session.viewport.width}×${session.viewport.height}`)

  if (detail === 'forensic') {
    lines.push(`DPR: ${typeof window !== 'undefined' ? window.devicePixelRatio : 1} · Scroll: ${typeof window !== 'undefined' ? window.scrollX : 0}, ${typeof window !== 'undefined' ? window.scrollY : 0}`)
  }

  lines.push('')

  // Summary by type
  const types = new Map<string, number>()
  for (const a of session.annotations) {
    types.set(a.shape.type, (types.get(a.shape.type) || 0) + 1)
  }
  const summary = Array.from(types.entries()).map(([t, n]) => `${n} ${t}`).join(' · ')
  lines.push(`Summary: ${summary}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  for (let i = 0; i < session.annotations.length; i++) {
    lines.push(`## Annotation ${i + 1}`)
    lines.push('')
    lines.push(formatAnnotation(session.annotations[i], detail))
    lines.push('')
  }

  return lines.join('\n')
}

/** Generate a single annotation as markdown */
export function formatSingleAnnotation(a: Annotation, detail: OutputDetail = 'standard'): string {
  if (detail === 'compact') return formatAnnotationCompact(a, 1)
  return formatAnnotation(a, detail)
}
