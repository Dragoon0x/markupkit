import type { MarkupSession, Annotation, OutputDetail } from '../types'

const ICON: Record<string, string> = {
  circle:'⭕', arrow:'➡️', line:'—', strikethrough:'~~',
  underline:'__', freehand:'✏️', rectangle:'▭', cross:'✕',
}

function fmtCompact(a: Annotation, i: number): string {
  const icon = ICON[a.shape.type] || '•'
  const sels = a.elements.map(e => `\`${e.selector}\``).join(', ') || `area`
  const note = a.note ? ` — "${a.note}"` : ''
  const text = a.selectedText ? ` text "${a.selectedText.slice(0, 40)}"` : ''
  return `${i}. ${icon} ${a.shape.type} ${sels}${text}${note}`
}

function fmtAnnotation(a: Annotation, detail: OutputDetail): string {
  const lines: string[] = []; const icon = ICON[a.shape.type] || '•'
  const conf = (detail === 'detailed' || detail === 'forensic') ? ` (confidence: ${a.shape.confidence.toFixed(2)})` : ''
  lines.push(`### ${icon} ${a.shape.type}${conf}: ${a.intent}`)
  if (a.note) lines.push(`> ${a.note}`)
  if (a.selectedText) lines.push(`Selected: "${a.selectedText}"`)
  if (detail === 'forensic') {
    const b = a.shape.bounds
    lines.push(`Gesture bounds: ${Math.round(b.x)}, ${Math.round(b.y)}, ${Math.round(b.width)}×${Math.round(b.height)}`)
  }
  lines.push('')
  for (const el of a.elements) {
    lines.push(`- **\`${el.selector}\`**`)
    if (el.component) lines.push(`  Component: ${el.component}`)
    if (el.text) lines.push(`  Text: "${el.text.slice(0, 80)}"`)
    if (el.source && (detail === 'detailed' || detail === 'forensic')) lines.push(`  Source: ${el.source}`)
    if (detail === 'detailed' || detail === 'forensic') {
      lines.push(`  Rect: ${el.rect.x}, ${el.rect.y}, ${el.rect.width}×${el.rect.height}`)
      if (el.id) lines.push(`  ID: ${el.id}`)
      if (el.classes) lines.push(`  Classes: ${el.classes}`)
    }
    if (el.contrast && (detail === 'detailed' || detail === 'forensic')) {
      lines.push(`  Contrast: ${el.contrast.ratio}:1 ${el.contrast.aa ? '✓ AA' : '✗ AA'} ${el.contrast.aaa ? '✓ AAA' : '✗ AAA'}`)
    }
    if (el.spacing && detail === 'forensic') {
      const s = el.spacing
      lines.push(`  Spacing: pad ${s.paddingTop}/${s.paddingRight}/${s.paddingBottom}/${s.paddingLeft} · mar ${s.marginTop}/${s.marginRight}/${s.marginBottom}/${s.marginLeft}`)
    }
    if (el.computedStyles && detail === 'forensic') {
      lines.push(`  Styles:`)
      for (const [k, v] of Object.entries(el.computedStyles)) {
        lines.push(`    ${k}: ${v}`)
      }
    }
  }
  if (a.elements.length === 0) {
    lines.push(`- Area at (${Math.round(a.shape.bounds.x)}, ${Math.round(a.shape.bounds.y)}) — ${Math.round(a.shape.bounds.width)}×${Math.round(a.shape.bounds.height)}`)
  }
  return lines.join('\n')
}

export function formatSession(session: MarkupSession, detail: OutputDetail = 'standard'): string {
  const lines: string[] = []
  if (detail === 'compact') {
    lines.push(`# MarkupKit`); lines.push(`**${session.annotations.length} annotations** on ${session.url}`); lines.push('')
    session.annotations.forEach((a, i) => lines.push(fmtCompact(a, i + 1)))
    return lines.join('\n')
  }
  lines.push(detail === 'forensic' ? `# MarkupKit Feedback — Forensic` : `# MarkupKit Feedback`)
  lines.push(''); lines.push(`**${session.annotations.length} annotations** on ${session.url}`)
  lines.push(`Viewport: ${session.viewport.width}×${session.viewport.height}`)
  if (detail === 'forensic') {
    lines.push(`DPR: ${typeof window !== 'undefined' ? window.devicePixelRatio : 1} · Scroll: ${typeof window !== 'undefined' ? window.scrollX : 0}, ${typeof window !== 'undefined' ? window.scrollY : 0}`)
  }
  lines.push('')
  const types = new Map<string, number>()
  for (const a of session.annotations) types.set(a.shape.type, (types.get(a.shape.type) || 0) + 1)
  lines.push(`Summary: ${Array.from(types.entries()).map(([t, n]) => `${n} ${t}`).join(' · ')}`)
  lines.push(''); lines.push('---'); lines.push('')
  session.annotations.forEach((a, i) => {
    lines.push(`## Annotation ${i + 1}`); lines.push(''); lines.push(fmtAnnotation(a, detail)); lines.push('')
  })
  return lines.join('\n')
}

export function formatSingleAnnotation(a: Annotation, detail: OutputDetail = 'standard'): string {
  if (detail === 'compact') return fmtCompact(a, 1)
  return fmtAnnotation(a, detail)
}
