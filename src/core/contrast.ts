/** Parse rgb/rgba string to [r,g,b] */
export function parseRGB(c: string): [number, number, number] | null {
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  return m ? [+m[1], +m[2], +m[3]] : null
}

/** Relative luminance per WCAG 2.1 */
export function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/** Contrast ratio between two CSS color strings */
export function contrastRatio(fg: string, bg: string): number | null {
  const a = parseRGB(fg), b = parseRGB(bg)
  if (!a || !b) return null
  const l1 = luminance(...a), l2 = luminance(...b)
  return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100
}
