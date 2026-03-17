import { useState, useRef, useCallback, useEffect } from 'react'
import type { MarkupProps, MarkupState, Stroke, Point, Annotation, MarkupSession, ToolMode, OutputDetail, AnnotationMode, MarkupSettings, DrawEvent } from './types'
import { newStrokeId, smoothPoints, renderStroke, renderArrowhead, getEndAngle, strokeBounds } from './core/drawing'
import { detectShape } from './detection/shapes'
import { resolveShape, resolveClickedElement, resolveTextSelection, resolveAreaSelection, getElementSpacingAtPoint } from './detection/elements'
import { formatSession } from './output/format'

const POS = {
  'bottom-right': { bottom: 16, right: 16 } as const,
  'bottom-left': { bottom: 16, left: 16 } as const,
  'top-right': { top: 72, right: 16 } as const,
  'top-left': { top: 72, left: 16 } as const,
}

const STORAGE_KEY = 'markupkit_annotations'
const MODES: { key: AnnotationMode; icon: string; label: string }[] = [
  { key: 'draw', icon: '✏️', label: 'Draw' },
  { key: 'text', icon: '✂️', label: 'Text' },
  { key: 'click', icon: '👆', label: 'Click' },
  { key: 'multi', icon: '⊞', label: 'Multi' },
  { key: 'area', icon: '⬚', label: 'Area' },
  { key: 'pause', icon: '⏸', label: 'Pause' },
]

export function Markup({
  enabled = true, color: initColor = '#171717', strokeWidth: initWidth = 3,
  tool: initTool = 'draw', detail: initDetail = 'standard',
  toolbar = true, position = 'bottom-right', root = 'body', ignore = [],
  onAnnotationAdd, onAnnotationDelete, onAnnotationUpdate, onAnnotationsClear,
  onCopy, onDraw, copyToClipboard = true,
  endpoint, sessionId: initSessionId, onSessionCreated,
  shortcut = 'ctrl+shift+d', className,
}: MarkupProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<MarkupState>('idle')
  const [mode, setMode] = useState<AnnotationMode>('draw')
  const [tool, setTool] = useState<ToolMode>(initTool)
  const [settings, setSettings] = useState<MarkupSettings>({
    detail: initDetail, color: initColor, showSpacing: true, showContrast: true,
    reactDetection: true, persistAnnotations: true, clearOnCopy: false,
    blockInteractions: false, sourceDetection: true,
  })
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [currentPoints, setCurrentPoints] = useState<Point[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const [noteTarget, setNoteTarget] = useState<{ annotation: Annotation } | { stroke: Stroke } | null>(null)
  const [copied, setCopied] = useState(false)
  const [active, setActive] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [paused, setPaused] = useState(false)
  const [markersVisible, setMarkersVisible] = useState(true)
  const [areaStart, setAreaStart] = useState<Point | null>(null)
  const [areaRect, setAreaRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [spacingOverlay, setSpacingOverlay] = useState<{ rect: DOMRect; spacing: any } | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(initSessionId || null)
  const ignoreRef = useRef(ignore); ignoreRef.current = ignore

  // ===== LOCALSTORAGE PERSISTENCE =====
  useEffect(() => {
    if (!settings.persistAnnotations) return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length) setAnnotations(parsed)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!settings.persistAnnotations) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations)) } catch { /* ignore */ }
  }, [annotations, settings.persistAnnotations])

  // ===== ENDPOINT SYNC =====
  useEffect(() => {
    if (!endpoint) return
    const url = endpoint.replace(/\/$/, '')
    const init = async () => {
      try {
        if (initSessionId) {
          const res = await fetch(`${url}/sessions/${initSessionId}`)
          if (res.ok) { setSessionId(initSessionId); return }
        }
        const res = await fetch(`${url}/sessions`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: window.location.href, title: document.title, viewport: { width: window.innerWidth, height: window.innerHeight } }),
        })
        if (res.ok) { const d = await res.json(); const sid = d.id || d.sessionId; setSessionId(sid); onSessionCreated?.(sid) }
      } catch { /* offline */ }
    }
    init()
  }, [endpoint, initSessionId, onSessionCreated])

  useEffect(() => {
    if (!endpoint || !sessionId || annotations.length === 0) return
    const url = endpoint.replace(/\/$/, '')
    const latest = annotations[annotations.length - 1]
    fetch(`${url}/sessions/${sessionId}/annotations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(latest),
    }).catch(() => {})
  }, [endpoint, sessionId, annotations])

  // ===== ANIMATION PAUSE =====
  useEffect(() => {
    const styleId = 'markupkit-pause-style'
    if (paused) {
      if (!document.getElementById(styleId)) {
        const s = document.createElement('style'); s.id = styleId
        s.textContent = '*, *::before, *::after { animation-play-state: paused !important; transition: none !important; }'
        document.head.appendChild(s)
      }
    } else {
      document.getElementById(styleId)?.remove()
    }
    return () => { document.getElementById(styleId)?.remove() }
  }, [paused])

  // ===== CANVAS RESIZE =====
  const resize = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr
    const ctx = canvas.getContext('2d'); if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }, [])
  useEffect(() => { resize(); window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize) }, [resize])

  // ===== REDRAW =====
  const redraw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const w = window.innerWidth, h = window.innerHeight
    ctx.clearRect(0, 0, w, h)
    if (!markersVisible) return

    for (const stroke of strokes) {
      renderStroke(ctx, stroke)
      if (stroke.points.length > 3) {
        const shape = detectShape(stroke)
        if (shape.type === 'arrow') { renderArrowhead(ctx, stroke.points[stroke.points.length - 1], getEndAngle(stroke.points), 12, stroke.color) }
      }
    }
    if (currentPoints.length > 1) {
      renderStroke(ctx, { id: 'current', points: currentPoints, color: settings.color, width: initWidth, timestamp: Date.now() })
    }
    // Area selection rectangle
    if (areaRect) {
      ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2; ctx.setLineDash([6, 4])
      ctx.strokeRect(areaRect.x, areaRect.y, areaRect.w, areaRect.h)
      ctx.fillStyle = 'rgba(22,163,74,0.05)'; ctx.fillRect(areaRect.x, areaRect.y, areaRect.w, areaRect.h)
      ctx.setLineDash([])
    }
    // Spacing overlay
    if (spacingOverlay && settings.showSpacing) {
      const { rect: r, spacing: s } = spacingOverlay
      // Margin (amber)
      ctx.fillStyle = 'rgba(202,138,4,0.08)'
      ctx.fillRect(r.x - s.marginLeft, r.y - s.marginTop, r.width + s.marginLeft + s.marginRight, r.height + s.marginTop + s.marginBottom)
      ctx.strokeStyle = 'rgba(202,138,4,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([4, 3])
      ctx.strokeRect(r.x - s.marginLeft, r.y - s.marginTop, r.width + s.marginLeft + s.marginRight, r.height + s.marginTop + s.marginBottom)
      // Padding (green)
      ctx.fillStyle = 'rgba(22,163,74,0.08)'; ctx.fillRect(r.x, r.y, r.width, r.height)
      ctx.strokeStyle = 'rgba(22,163,74,0.3)'; ctx.strokeRect(r.x, r.y, r.width, r.height)
      ctx.setLineDash([])
      // Labels
      ctx.font = '9px monospace'; ctx.fillStyle = '#ca8a04'; ctx.globalAlpha = 0.8
      if (s.marginTop) ctx.fillText(`${s.marginTop}`, r.x + 2, r.y - s.marginTop + 10)
      if (s.marginLeft) ctx.fillText(`${s.marginLeft}`, r.x - s.marginLeft + 2, r.y + 10)
      ctx.fillStyle = '#16a34a'
      if (s.paddingTop) ctx.fillText(`${s.paddingTop}`, r.x + 2, r.y + 10)
      if (s.paddingLeft) ctx.fillText(`${s.paddingLeft}`, r.x + 2, r.y + r.height - 4)
      ctx.globalAlpha = 1
    }
    // Annotation badges
    for (let i = 0; i < annotations.length; i++) {
      const a = annotations[i], b = a.shape.bounds
      const bx = b.x + b.width + 4, by = b.y - 4
      const col = a.mode === 'multi' || a.mode === 'area' ? '#16a34a' : settings.color
      ctx.fillStyle = col; ctx.globalAlpha = 0.9
      ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(`${i + 1}`, bx, by + 3); ctx.textAlign = 'start'
    }
  }, [strokes, currentPoints, annotations, settings, initWidth, markersVisible, areaRect, spacingOverlay])

  useEffect(() => { if (active) redraw() }, [active, redraw])

  // ===== ADD ANNOTATION (shared) =====
  const addAnnotation = useCallback((annotation: Annotation, note: string) => {
    annotation.note = note
    setAnnotations(prev => [...prev, annotation])
    onAnnotationAdd?.(annotation)
    setTimeout(redraw, 50)
  }, [onAnnotationAdd, redraw])

  // ===== DRAW MODE HANDLERS =====
  const handleDown = useCallback((e: PointerEvent) => {
    if (!active || noteTarget) return
    if (mode === 'area') {
      setAreaStart({ x: e.clientX, y: e.clientY, t: Date.now() }); return
    }
    if (mode !== 'draw') return
    setIsDrawing(true)
    setCurrentPoints([{ x: e.clientX, y: e.clientY, t: Date.now() }])
  }, [active, noteTarget, mode])

  const handleMove = useCallback((e: PointerEvent) => {
    if (mode === 'area' && areaStart) {
      const x = Math.min(areaStart.x, e.clientX), y = Math.min(areaStart.y, e.clientY)
      const w = Math.abs(e.clientX - areaStart.x), h = Math.abs(e.clientY - areaStart.y)
      setAreaRect({ x, y, w, h }); redraw(); return
    }
    // Spacing hover (when active but not drawing)
    if (active && !isDrawing && settings.showSpacing && mode !== 'draw') {
      const data = getElementSpacingAtPoint(e.clientX, e.clientY)
      if (data) setSpacingOverlay({ rect: data.rect, spacing: data.spacing })
      else setSpacingOverlay(null)
      redraw()
    }
    if (!isDrawing) return
    setCurrentPoints(prev => [...prev, { x: e.clientX, y: e.clientY, t: Date.now() }])
    redraw()
  }, [isDrawing, mode, areaStart, active, settings.showSpacing, redraw])

  const handleUp = useCallback((e: PointerEvent) => {
    // Area mode: finish selection
    if (mode === 'area' && areaStart && areaRect) {
      const anno = resolveAreaSelection(
        { x: areaRect.x, y: areaRect.y, width: areaRect.w, height: areaRect.h },
        root, ignoreRef.current
      )
      setNoteTarget({ annotation: anno })
      setState('noting'); setAreaStart(null); setAreaRect(null); return
    }
    // Click mode
    if (mode === 'click' || mode === 'multi') {
      const anno = resolveClickedElement(e.clientX, e.clientY)
      if (anno) { anno.mode = mode; setNoteTarget({ annotation: anno }); setState('noting') }
      return
    }
    // Text mode
    if (mode === 'text') {
      const anno = resolveTextSelection()
      if (anno) { setNoteTarget({ annotation: anno }); setState('noting') }
      return
    }
    // Draw mode
    if (!isDrawing) return
    setIsDrawing(false)
    if (currentPoints.length < 3) { setCurrentPoints([]); return }
    const smoothed = smoothPoints(currentPoints)
    const stroke: Stroke = { id: newStrokeId(), points: smoothed, color: settings.color, width: initWidth, timestamp: Date.now() }
    if (tool === 'eraser') {
      const bounds = strokeBounds(smoothed)
      setStrokes(prev => prev.filter(s => {
        const sb = strokeBounds(s.points)
        return !(sb.x < bounds.x + bounds.width && sb.x + sb.width > bounds.x && sb.y < bounds.y + bounds.height && sb.y + sb.height > bounds.y)
      }))
      setAnnotations(prev => prev.filter(a => {
        const ab = a.shape.bounds
        return !(ab.x < bounds.x + bounds.width && ab.x + ab.width > bounds.x && ab.y < bounds.y + bounds.height && ab.y + ab.height > bounds.y)
      }))
    } else {
      setStrokes(prev => [...prev, stroke])
      if (onDraw) {
        const detected = detectShape(stroke)
        onDraw({ stroke, shape: detected.type, confidence: detected.confidence, bounds: detected.bounds })
      }
      const shape = detectShape(stroke)
      const anno = resolveShape(shape, root, ignoreRef.current)
      setNoteTarget({ annotation: anno })
      setState('noting')
    }
    setCurrentPoints([]); redraw()
  }, [isDrawing, currentPoints, settings.color, initWidth, tool, mode, areaStart, areaRect, root, redraw, onDraw])

  // Attach pointer listeners
  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current; if (!canvas) return
    canvas.addEventListener('pointerdown', handleDown)
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => { canvas.removeEventListener('pointerdown', handleDown); window.removeEventListener('pointermove', handleMove); window.removeEventListener('pointerup', handleUp) }
  }, [active, handleDown, handleMove, handleUp])

  // ===== NOTE SUBMIT =====
  const submitNote = useCallback(() => {
    if (!noteTarget) return
    const note = noteInput
    if ('annotation' in noteTarget) {
      addAnnotation(noteTarget.annotation, note)
    } else {
      const shape = detectShape(noteTarget.stroke); shape.note = note
      const anno = resolveShape(shape, root, ignoreRef.current); anno.note = note
      addAnnotation(anno, note)
    }
    setNoteInput(''); setNoteTarget(null); setState('drawing')
  }, [noteTarget, noteInput, root, addAnnotation])

  const skipNote = useCallback(() => {
    if (!noteTarget) return
    if ('annotation' in noteTarget) {
      addAnnotation(noteTarget.annotation, '')
    } else {
      const shape = detectShape(noteTarget.stroke)
      const anno = resolveShape(shape, root, ignoreRef.current)
      addAnnotation(anno, '')
    }
    setNoteTarget(null); setState('drawing')
  }, [noteTarget, root, addAnnotation])

  // ===== DELETE ANNOTATION =====
  const deleteAnnotation = useCallback((id: string) => {
    setAnnotations(prev => {
      const anno = prev.find(a => a.id === id)
      if (anno) onAnnotationDelete?.(anno)
      return prev.filter(a => a.id !== id)
    })
    setTimeout(redraw, 50)
  }, [onAnnotationDelete, redraw])

  // ===== UPDATE ANNOTATION =====
  const updateAnnotation = useCallback((id: string, note: string) => {
    setAnnotations(prev => prev.map(a => {
      if (a.id === id) { const updated = { ...a, note }; onAnnotationUpdate?.(updated); return updated }
      return a
    }))
  }, [onAnnotationUpdate])

  // ===== COPY =====
  const handleCopy = useCallback(() => {
    const session: MarkupSession = {
      url: window.location.href, title: document.title,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      annotations, timestamp: Date.now(),
    }
    const md = formatSession(session, settings.detail)
    if (copyToClipboard) {
      navigator.clipboard.writeText(md).then(() => { setCopied(true); onCopy?.(md); setTimeout(() => setCopied(false), 2000) })
    } else { onCopy?.(md) }
    if (settings.clearOnCopy) handleClear()
  }, [annotations, settings.detail, settings.clearOnCopy, onCopy, copyToClipboard])

  // ===== CLEAR =====
  const handleClear = useCallback(() => {
    const cleared = [...annotations]
    setStrokes([]); setAnnotations([]); setNoteTarget(null); setNoteInput(''); setState('idle')
    onAnnotationsClear?.(cleared)
    if (settings.persistAnnotations) { try { localStorage.removeItem(STORAGE_KEY) } catch {} }
    const canvas = canvasRef.current; if (canvas) { const ctx = canvas.getContext('2d'); if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height) }
  }, [annotations, onAnnotationsClear, settings.persistAnnotations])

  // ===== SCREENSHOT =====
  const handleScreenshot = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    try {
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a'); link.download = `markupkit-${Date.now()}.png`; link.href = dataUrl; link.click()
    } catch { /* cross-origin or security error */ }
  }, [])

  // ===== TOGGLE =====
  const toggle = useCallback(() => {
    setActive(prev => {
      if (prev) { document.body.style.cursor = ''; setSpacingOverlay(null); return false }
      document.body.style.cursor = 'crosshair'; return true
    })
  }, [])

  // ===== KEYBOARD SHORTCUTS =====
  useEffect(() => {
    if (!enabled) return
    const parts = shortcut.toLowerCase().split('+')
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return
      const ctrl = parts.includes('ctrl') ? (e.ctrlKey || e.metaKey) : true
      const shift = parts.includes('shift') ? e.shiftKey : true
      const key = parts.find(p => !['ctrl', 'shift', 'alt', 'meta'].includes(p))
      if (ctrl && shift && key && e.key.toLowerCase() === key) { e.preventDefault(); toggle() }
      if (e.key === 'Escape') { if (noteTarget) skipNote(); else if (showSettings) setShowSettings(false); else if (active) toggle() }
      if (!active) return
      if (e.key.toLowerCase() === 'p') { e.preventDefault(); setPaused(p => !p) }
      if (e.key.toLowerCase() === 'h') { e.preventDefault(); setMarkersVisible(v => !v); setTimeout(redraw, 50) }
      if (e.key.toLowerCase() === 'c') { e.preventDefault(); handleCopy() }
      if (e.key.toLowerCase() === 'x') { e.preventDefault(); handleClear() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, shortcut, toggle, active, noteTarget, skipNote, showSettings, handleCopy, handleClear, redraw])

  if (!enabled) return null

  const posStyle = POS[position]
  const notePos = noteTarget && 'annotation' in noteTarget
    ? { x: Math.min(noteTarget.annotation.shape.bounds.x, window.innerWidth - 300), y: noteTarget.annotation.shape.bounds.y + noteTarget.annotation.shape.bounds.height + 8 }
    : noteTarget && 'stroke' in noteTarget
    ? (() => { const b = strokeBounds(noteTarget.stroke.points); return { x: Math.min(b.x, window.innerWidth - 300), y: b.y + b.height + 8 } })()
    : null

  return (
    <>
      {/* Drawing canvas */}
      <canvas ref={canvasRef} data-markup style={{
        position: 'fixed', inset: 0, width: '100vw', height: '100vh',
        pointerEvents: active ? 'auto' : 'none', zIndex: 99998,
        cursor: active ? (mode === 'text' ? 'text' : mode === 'click' || mode === 'multi' ? 'pointer' : 'crosshair') : 'default',
      }} />

      {/* Note input */}
      {noteTarget && notePos && (
        <div data-markup style={{
          position: 'fixed', left: Math.max(8, Math.min(notePos.x, window.innerWidth - 310)),
          top: Math.min(notePos.y, window.innerHeight - 60), zIndex: 99999,
          background: '#171717', border: '1px solid #444', borderRadius: 10,
          padding: 8, display: 'flex', gap: 6, alignItems: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,.2)', fontFamily: "'Inter',system-ui,sans-serif",
        }}>
          <input autoFocus value={noteInput} onChange={e => setNoteInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitNote(); if (e.key === 'Escape') skipNote() }}
            placeholder="Add a note..." style={{
              background: '#333', border: '1px solid #555', color: '#fff', padding: '6px 10px',
              borderRadius: 6, fontSize: 12, outline: 'none', width: 160, fontFamily: 'inherit',
            }} />
          <button onClick={submitNote} style={{
            background: '#fff', color: '#171717', border: 'none', borderRadius: 6,
            padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
          }}>Add</button>
          <button onClick={skipNote} style={{
            background: 'transparent', color: '#888', border: '1px solid #555', borderRadius: 6,
            padding: '6px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
          }}>Skip</button>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div data-markup style={{
          position: 'fixed', ...posStyle, zIndex: 99999, marginBottom: 120,
          background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12,
          padding: 16, minWidth: 260, boxShadow: '0 4px 20px rgba(0,0,0,.08)',
          fontFamily: "'Inter',system-ui,sans-serif", fontSize: 13,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Settings
            <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#999' }}>×</button>
          </div>
          {[
            ['detail', 'Output Detail', null, settings.detail],
            ['showSpacing', 'Spacing Viz', settings.showSpacing, null],
            ['showContrast', 'Contrast Check', settings.showContrast, null],
            ['reactDetection', 'React Components', settings.reactDetection, null],
            ['sourceDetection', 'Source Detection', settings.sourceDetection, null],
            ['persistAnnotations', 'Persist (localStorage)', settings.persistAnnotations, null],
            ['clearOnCopy', 'Clear on Copy', settings.clearOnCopy, null],
            ['blockInteractions', 'Block Interactions', settings.blockInteractions, null],
          ].map(([key, label, boolVal, strVal]) => (
            <div key={key as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ color: '#525252' }}>{label as string}</span>
              {boolVal !== null ? (
                <div onClick={() => setSettings(s => ({ ...s, [key as string]: !s[key as keyof MarkupSettings] }))}
                  style={{ width: 36, height: 20, borderRadius: 10, background: boolVal ? '#171717' : '#d4d4d4', position: 'relative', cursor: 'pointer', transition: 'background .15s' }}>
                  <div style={{ position: 'absolute', top: 2, left: boolVal ? 18 : 2, width: 16, height: 16, borderRadius: 8, background: '#fff', transition: 'left .15s' }} />
                </div>
              ) : (
                <select value={strVal as string} onChange={e => setSettings(s => ({ ...s, detail: e.target.value as OutputDetail }))}
                  style={{ fontFamily: 'monospace', fontSize: 11, border: '1px solid #e8e8e8', borderRadius: 4, padding: '2px 6px', color: '#525252' }}>
                  <option value="compact">Compact</option><option value="standard">Standard</option>
                  <option value="detailed">Detailed</option><option value="forensic">Forensic</option>
                </select>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      {toolbar && (
        <div data-markup className={className} style={{
          position: 'fixed', ...posStyle, zIndex: 99999,
          fontFamily: "'Inter',system-ui,sans-serif", fontSize: 11, userSelect: 'none',
        }}>
          {active && (
            <div style={{
              background: 'rgba(255,255,255,.96)', backdropFilter: 'blur(12px)',
              border: '1px solid #e8e8e8', borderRadius: 12, padding: 10, marginBottom: 8,
              boxShadow: '0 4px 20px rgba(0,0,0,.06)', minWidth: 200,
            }}>
              {/* Mode switcher */}
              <div style={{ display: 'flex', gap: 2, marginBottom: 8, flexWrap: 'wrap' }}>
                {MODES.map(m => (
                  <button key={m.key} onClick={() => { setMode(m.key); if (m.key === 'pause') setPaused(p => !p) }}
                    style={{
                      padding: '4px 8px', borderRadius: 5, fontSize: 10, border: `1px solid ${mode === m.key ? '#171717' : '#e8e8e8'}`,
                      background: mode === m.key ? '#17171710' : 'transparent', color: mode === m.key ? '#171717' : '#999',
                      cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3,
                    }}>{m.icon} {m.label}{m.key === 'pause' && paused ? ' ▶' : ''}</button>
                ))}
              </div>
              {/* Tool buttons (draw mode only) */}
              {mode === 'draw' && (
                <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
                  {([['draw', '✏️'], ['arrow', '➡️'], ['circle', '⭕'], ['eraser', '🧹']] as [ToolMode, string][]).map(([t, icon]) => (
                    <button key={t} onClick={() => setTool(t)} style={{
                      width: 32, height: 32, borderRadius: 7, border: `1px solid ${tool === t ? '#171717' : '#e8e8e8'}`,
                      background: tool === t ? '#17171710' : 'transparent', color: '#525252', cursor: 'pointer', fontSize: 13,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{icon}</button>
                  ))}
                </div>
              )}
              {/* Actions */}
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {annotations.length > 0 && (
                  <button onClick={handleCopy} style={{
                    flex: 1, background: copied ? '#f0fdf4' : '#f5f5f5', border: `1px solid ${copied ? '#86efac' : '#e8e8e8'}`,
                    color: copied ? '#166534' : '#525252', borderRadius: 6, padding: '5px 8px', fontSize: 10, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
                  }}>{copied ? '✓ Copied' : `⎘ Copy (${annotations.length})`}</button>
                )}
                <button onClick={() => setMarkersVisible(v => !v)} style={{
                  background: '#f5f5f5', border: '1px solid #e8e8e8', color: markersVisible ? '#525252' : '#999',
                  borderRadius: 6, padding: '5px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit',
                }}>{markersVisible ? '👁' : '👁‍🗨'}</button>
                <button onClick={handleScreenshot} style={{
                  background: '#f5f5f5', border: '1px solid #e8e8e8', color: '#525252',
                  borderRadius: 6, padding: '5px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit',
                }}>📷</button>
                <button onClick={handleClear} style={{
                  background: '#f5f5f5', border: '1px solid #e8e8e8', color: '#dc2626',
                  borderRadius: 6, padding: '5px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit',
                }}>✕</button>
                <button onClick={() => setShowSettings(s => !s)} style={{
                  background: '#f5f5f5', border: '1px solid #e8e8e8', color: '#525252',
                  borderRadius: 6, padding: '5px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit',
                }}>⚙</button>
              </div>
            </div>
          )}
          {/* Main toggle */}
          <button onClick={toggle} style={{
            width: 48, height: 48, borderRadius: 14,
            background: active ? '#171717' : '#fff', border: `1px solid ${active ? '#171717' : '#e8e8e8'}`,
            color: active ? '#fff' : '#525252', cursor: 'pointer', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(0,0,0,.06)', transition: 'all 0.15s',
          }}>{active ? '✕' : '✏️'}</button>
          <div style={{ textAlign: 'center', marginTop: 3, fontSize: 9, letterSpacing: 1, color: active ? '#171717' : '#999', textTransform: 'uppercase' }}>
            {active ? `${annotations.length} marks` : 'Draw'}
          </div>
        </div>
      )}
    </>
  )
}
