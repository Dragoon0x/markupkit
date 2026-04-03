import type { LayoutChange, LayoutSession } from './types'

type LayoutOutputDetail = 'compact' | 'standard' | 'detailed'

/** Format a single layout change */
function formatChange(c: LayoutChange, detail: LayoutOutputDetail): string {
  const lines: string[] = []

  switch (c.type) {
    case 'move': {
      const tag = c.tag ? `<${c.tag}>` : ''
      lines.push(`**Moved** \`${c.selector}\` ${tag}`)
      if (c.delta) {
        lines.push(`  ${c.delta.dx > 0 ? '→' : '←'} ${Math.abs(c.delta.dx)}px, ${c.delta.dy > 0 ? '↓' : '↑'} ${Math.abs(c.delta.dy)}px`)
      }
      if (detail !== 'compact' && c.from && c.to) {
        lines.push(`  From: (${Math.round(c.from.x)}, ${Math.round(c.from.y)})`)
        lines.push(`  To: (${Math.round(c.to.x)}, ${Math.round(c.to.y)})`)
      }
      if (detail === 'detailed' && c.to) {
        lines.push(`  Final size: ${Math.round(c.to.width)}×${Math.round(c.to.height)}`)
      }
      break
    }

    case 'resize': {
      lines.push(`**Resized** \`${c.selector}\``)
      if (c.from && c.to) {
        lines.push(`  ${Math.round(c.from.width)}×${Math.round(c.from.height)} → ${Math.round(c.to.width)}×${Math.round(c.to.height)}`)
      }
      if (c.delta) {
        if (c.delta.dw !== 0) lines.push(`  Width: ${c.delta.dw > 0 ? '+' : ''}${c.delta.dw}px`)
        if (c.delta.dh !== 0) lines.push(`  Height: ${c.delta.dh > 0 ? '+' : ''}${c.delta.dh}px`)
      }
      break
    }

    case 'add': {
      lines.push(`**Added** \`${c.componentType || 'component'}\``)
      if (c.to) {
        lines.push(`  Position: (${Math.round(c.to.x)}, ${Math.round(c.to.y)})`)
        lines.push(`  Size: ${Math.round(c.to.width)}×${Math.round(c.to.height)}`)
      }
      break
    }

    case 'remove': {
      lines.push(`**Removed** \`${c.selector}\``)
      if (detail !== 'compact' && c.from) {
        lines.push(`  Was at: (${Math.round(c.from.x)}, ${Math.round(c.from.y)}) — ${Math.round(c.from.width)}×${Math.round(c.from.height)}`)
      }
      break
    }

    case 'reorder': {
      lines.push(`**Reordered** \`${c.selector}\``)
      if (c.oldIndex !== undefined && c.newIndex !== undefined) {
        lines.push(`  Position ${c.oldIndex} → ${c.newIndex}`)
      }
      break
    }

    case 'swap': {
      lines.push(`**Swapped** \`${c.selector}\` with \`${c.swapWith}\``)
      break
    }
  }

  if (c.note) {
    lines.push(`  Note: "${c.note}"`)
  }

  return lines.join('\n')
}

/** Format a complete layout session for agent consumption */
export function formatLayoutSession(
  session: LayoutSession,
  detail: LayoutOutputDetail = 'standard'
): string {
  if (session.changes.length === 0) return '# Layout Mode — No changes'

  const lines: string[] = []

  lines.push('# Layout Mode Feedback')
  lines.push('')
  lines.push(`**${session.changes.length} changes** on ${session.url}`)
  lines.push(`Viewport: ${session.viewport.width}×${session.viewport.height}`)
  lines.push('')

  // Summary
  const types = new Map<string, number>()
  for (const c of session.changes) {
    types.set(c.type, (types.get(c.type) || 0) + 1)
  }
  const summary = Array.from(types.entries())
    .map(([t, n]) => `${n} ${t}${n > 1 ? 's' : ''}`)
    .join(' · ')
  lines.push(`Summary: ${summary}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  for (let i = 0; i < session.changes.length; i++) {
    lines.push(`## Change ${i + 1}`)
    lines.push('')
    lines.push(formatChange(session.changes[i], detail))
    lines.push('')
  }

  // CSS suggestions
  if (detail === 'detailed') {
    lines.push('---')
    lines.push('')
    lines.push('## Suggested CSS')
    lines.push('')
    lines.push('```css')
    for (const c of session.changes) {
      if (c.type === 'move' && c.to) {
        lines.push(`${c.selector} {`)
        lines.push(`  position: relative;`)
        if (c.delta) {
          lines.push(`  transform: translate(${c.delta.dx}px, ${c.delta.dy}px);`)
        }
        lines.push(`}`)
        lines.push('')
      }
      if (c.type === 'resize' && c.to) {
        lines.push(`${c.selector} {`)
        lines.push(`  width: ${Math.round(c.to.width)}px;`)
        lines.push(`  height: ${Math.round(c.to.height)}px;`)
        lines.push(`}`)
        lines.push('')
      }
    }
    lines.push('```')
  }

  return lines.join('\n')
}

/** Format changes as a JSON patch for programmatic use */
export function formatLayoutJSON(session: LayoutSession): object {
  return {
    type: 'layout-feedback',
    version: '1.0',
    url: session.url,
    viewport: session.viewport,
    changeCount: session.changes.length,
    changes: session.changes.map(c => ({
      type: c.type,
      selector: c.selector,
      tag: c.tag,
      from: c.from,
      to: c.to,
      delta: c.delta,
      note: c.note,
      componentType: c.componentType,
    })),
    timestamp: session.updatedAt,
  }
}
