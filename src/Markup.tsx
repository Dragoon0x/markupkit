import { useState, useRef, useCallback, useEffect } from 'react'
import type { MarkupProps, MarkupState, Stroke, Point, Annotation, MarkupSession, ToolMode, OutputDetail, DrawEvent } from './types'
import { newStrokeId, smoothPoints, renderStroke, renderArrowhead, getEndAngle, strokeBounds } from './core/drawing'
import { detectShape } from './detection/shapes'
import { resolveShape } from './detection/elements'
import { formatSession } from './output/format'

const POS = {
  'bottom-right': { bottom: 16, right: 16 },
  'bottom-left': { bottom: 16, left: 16 },
  'top-right': { top: 72, right: 16 },
  'top-left': { top: 72, left: 16 },
} as const

/**
 * MarkupKit — Draw on your live website.
 * Freehand feedback for AI agents.
 */
export function Markup({
  enabled = true,
  color: initColor = '#171717',
  strokeWidth: initWidth = 3,
  tool: initTool = 'draw',
  detail: initDetail = 'standard',
  toolbar = true,
  position = 'bottom-right',
  root = 'body',
  ignore = [],
  onAnnotationAdd,
  onAnnotationDelete,
  onAnnotationUpdate,
  onAnnotationsClear,
  onCopy,
  onDraw,
  copyToClipboard = true,
  endpoint,
  sessionId: initSessionId,
  onSessionCreated,
  shortcut = 'ctrl+shift+d',
  className,
}: MarkupProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<MarkupState>('idle')
  const [tool, setTool] = useState<ToolMode>(initTool)
  const [color, setColor] = useState(initColor)
  const [detail, setDetail] = useState<OutputDetail>(initDetail)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [currentPoints, setCurrentPoints] = useState<Point[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const [noteTarget, setNoteTarget] = useState<Stroke | null>(null)
  const [copied, setCopied] = useState(false)
  const [active, setActive] = useState(false)
  const ignoreRef = useRef(ignore)
  ignoreRef.current = ignore

  // Agent sync: create or join session when endpoint is provided
  useEffect(() => {
    if (!endpoint) return
    const url = endpoint.replace(/\/$/, '')
    const init = async () => {
      try {
        if (initSessionId) {
          // Join existing session
          const res = await fetch(`${url}/sessions/${initSessionId}`)
          if (res.ok) return
        }
        // Create new session
        const res = await fetch(`${url}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: window.location.href,
            title: document.title,
            viewport: { width: window.innerWidth, height: window.innerHeight },
          }),
        })
        if (res.ok) {
          const data = await res.json()
          onSessionCreated?.(data.id || data.sessionId)
        }
      } catch { /* endpoint not available, continue local-only */ }
    }
    init()
  }, [endpoint, initSessionId, onSessionCreated])

  // Sync annotations to endpoint when they change
  useEffect(() => {
    if (!endpoint || annotations.length === 0) return
    const url = endpoint.replace(/\/$/, '')
    const latest = annotations[annotations.length - 1]
    fetch(`${url}/sessions/${initSessionId || 'default'}/annotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(latest),
    }).catch(() => { /* silent fail for offline */ })
  }, [endpoint, annotations, initSessionId])

  // Resize canvas
  const resize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }, [])

  useEffect(() => {
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [resize])

  // Redraw all strokes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1))

    for (const stroke of strokes) {
      renderStroke(ctx, stroke)
      // Arrow heads
      if (stroke.points.length > 3) {
        const shape = detectShape(stroke)
        if (shape.type === 'arrow') {
          const angle = getEndAngle(stroke.points)
          const tip = stroke.points[stroke.points.length - 1]
          renderArrowhead(ctx, tip, angle, 12, stroke.color)
        }
      }
    }

    // Current stroke being drawn
    if (currentPoints.length > 1) {
      renderStroke(ctx, {
        id: 'current',
        points: currentPoints,
        color,
        width: initWidth,
        timestamp: Date.now(),
      })
    }

    // Annotation badges
    for (let i = 0; i < annotations.length; i++) {
      const a = annotations[i]
      const b = a.shape.bounds
      ctx.fillStyle = color
      ctx.globalAlpha = 0.9
      const bx = b.x + b.width + 4
      const by = b.y - 4
      ctx.beginPath()
      ctx.arc(bx, by, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 9px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${i + 1}`, bx, by + 3)
      ctx.textAlign = 'start'
    }
  }, [strokes, currentPoints, annotations, color, initWidth])

  useEffect(() => { if (active) redraw() }, [active, redraw])

  // Pointer handlers
  const handleDown = useCallback((e: PointerEvent) => {
    if (!active || noteTarget) return
    setIsDrawing(true)
    const p = { x: e.clientX, y: e.clientY, t: Date.now() }
    setCurrentPoints([p])
  }, [active, noteTarget])

  const handleMove = useCallback((e: PointerEvent) => {
    if (!isDrawing) return
    const p = { x: e.clientX, y: e.clientY, t: Date.now() }
    setCurrentPoints(prev => [...prev, p])
    redraw()
  }, [isDrawing, redraw])

  const handleUp = useCallback(() => {
    if (!isDrawing) return
    setIsDrawing(false)

    if (currentPoints.length < 3) {
      setCurrentPoints([])
      return
    }

    const smoothed = smoothPoints(currentPoints)
    const stroke: Stroke = {
      id: newStrokeId(),
      points: smoothed,
      color,
      width: initWidth,
      timestamp: Date.now(),
    }

    if (tool === 'eraser') {
      // Remove strokes near the drawn path
      const bounds = strokeBounds(smoothed)
      setStrokes(prev => prev.filter(s => {
        const sb = strokeBounds(s.points)
        return !(sb.x < bounds.x + bounds.width && sb.x + sb.width > bounds.x &&
                 sb.y < bounds.y + bounds.height && sb.y + sb.height > bounds.y)
      }))
      setAnnotations(prev => prev.filter(a => {
        const ab = a.shape.bounds
        return !(ab.x < bounds.x + bounds.width && ab.x + ab.width > bounds.x &&
                 ab.y < bounds.y + bounds.height && ab.y + ab.height > bounds.y)
      }))
    } else {
      setStrokes(prev => [...prev, stroke])
      // Fire onDraw callback with shape detection
      if (onDraw) {
        const detected = detectShape(stroke)
        onDraw({
          stroke,
          shape: detected.type,
          confidence: detected.confidence,
          bounds: detected.bounds,
        })
      }
      setNoteTarget(stroke)
      setState('noting')
    }

    setCurrentPoints([])
    redraw()
  }, [isDrawing, currentPoints, color, initWidth, tool, redraw])

  // Attach/detach pointer listeners
  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('pointerdown', handleDown)
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      canvas.removeEventListener('pointerdown', handleDown)
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [active, handleDown, handleMove, handleUp])

  // Submit note
  const submitNote = useCallback(() => {
    if (!noteTarget) return
    const shape = detectShape(noteTarget)
    shape.note = noteInput
    const annotation = resolveShape(shape, root, ignoreRef.current)
    annotation.note = noteInput
    setAnnotations(prev => [...prev, annotation])
    onAnnotationAdd?.(annotation)
    setNoteInput('')
    setNoteTarget(null)
    setState('drawing')
    setTimeout(redraw, 50)
  }, [noteTarget, noteInput, root, onAnnotationAdd, redraw])

  const skipNote = useCallback(() => {
    if (!noteTarget) return
    const shape = detectShape(noteTarget)
    const annotation = resolveShape(shape, root, ignoreRef.current)
    setAnnotations(prev => [...prev, annotation])
    onAnnotationAdd?.(annotation)
    setNoteTarget(null)
    setState('drawing')
    setTimeout(redraw, 50)
  }, [noteTarget, root, onAnnotationAdd, redraw])

  // Copy session
  const handleCopy = useCallback(() => {
    const session: MarkupSession = {
      url: window.location.href,
      title: document.title,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      annotations,
      timestamp: Date.now(),
    }
    const md = formatSession(session, detail)
    if (copyToClipboard) {
      navigator.clipboard.writeText(md).then(() => {
        setCopied(true)
        onCopy?.(md)
        setTimeout(() => setCopied(false), 2000)
      })
    } else {
      onCopy?.(md)
    }
  }, [annotations, detail, onCopy, copyToClipboard])

  // Clear all
  const handleClear = useCallback(() => {
    const cleared = [...annotations]
    setStrokes([])
    setAnnotations([])
    setNoteTarget(null)
    setNoteInput('')
    setState('idle')
    onAnnotationsClear?.(cleared)
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [annotations, onAnnotationsClear])

  // Toggle active
  const toggle = useCallback(() => {
    setActive(prev => {
      if (prev) {
        document.body.style.cursor = ''
        return false
      }
      document.body.style.cursor = 'crosshair'
      return true
    })
  }, [])

  // Keyboard shortcut
  useEffect(() => {
    if (!enabled) return
    const parts = shortcut.toLowerCase().split('+')
    const handler = (e: KeyboardEvent) => {
      const ctrl = parts.includes('ctrl') ? (e.ctrlKey || e.metaKey) : true
      const shift = parts.includes('shift') ? e.shiftKey : true
      const key = parts.find(p => !['ctrl', 'shift', 'alt', 'meta'].includes(p))
      if (ctrl && shift && key && e.key.toLowerCase() === key) {
        e.preventDefault()
        toggle()
      }
      if (e.key === 'Escape') {
        if (noteTarget) { skipNote() }
        else if (active) { toggle() }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, shortcut, toggle, active, noteTarget, skipNote])

  if (!enabled) return null

  const posStyle = POS[position]

  return (
    <>
      {/* Drawing canvas */}
      <canvas
        ref={canvasRef}
        data-markup
        style={{
          position: 'fixed', inset: 0, width: '100vw', height: '100vh',
          pointerEvents: active ? 'auto' : 'none',
          zIndex: 99998, cursor: active ? 'crosshair' : 'default',
        }}
      />

      {/* Note input overlay */}
      {noteTarget && (
        <div data-markup style={{
          position: 'fixed',
          left: Math.min(noteTarget.points[0]?.x || 100, window.innerWidth - 300),
          top: Math.min((strokeBounds(noteTarget.points).y + strokeBounds(noteTarget.points).height + 8), window.innerHeight - 80),
          zIndex: 99999,
          background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(16px)',
          border: `1px solid ${color}44`, borderRadius: 10,
          padding: 12, display: 'flex', gap: 8, alignItems: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <input
            autoFocus
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitNote(); if (e.key === 'Escape') skipNote() }}
            placeholder="Add a note (optional)"
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#e2e8f0', padding: '6px 12px', borderRadius: 6, fontSize: 13,
              outline: 'none', width: 180, fontFamily: 'inherit',
            }}
          />
          <button onClick={submitNote} style={{
            background: color, color: '#fff', border: 'none', borderRadius: 6,
            padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
          }}>Add</button>
          <button onClick={skipNote} style={{
            background: 'transparent', color: '#64748b', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '6px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
          }}>Skip</button>
        </div>
      )}

      {/* Toolbar */}
      {toolbar && (
        <div data-markup className={className} style={{
          position: 'fixed', ...posStyle, zIndex: 99999,
          fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 11, userSelect: 'none',
        }}>
          {/* Tool palette (when active) */}
          {active && (
            <div style={{
              background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(16px)',
              border: `1px solid ${color}33`, borderRadius: 12,
              padding: 10, marginBottom: 8, display: 'flex', gap: 4, flexDirection: 'column',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}>
              {/* Tool buttons */}
              <div style={{ display: 'flex', gap: 4 }}>
                {([['draw', '✏️'], ['arrow', '➡️'], ['circle', '⭕'], ['eraser', '🧹']] as [ToolMode, string][]).map(([t, icon]) => (
                  <button key={t} onClick={() => setTool(t)} style={{
                    width: 34, height: 34, borderRadius: 8, border: `1px solid ${tool === t ? color : 'rgba(255,255,255,0.1)'}`,
                    background: tool === t ? color + '22' : 'transparent',
                    color: '#e2e8f0', cursor: 'pointer', fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{icon}</button>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 4 }}>
                {annotations.length > 0 && (
                  <button onClick={handleCopy} style={{
                    flex: 1, background: copied ? '#22c55e22' : color + '22',
                    border: `1px solid ${copied ? '#22c55e' : color}`,
                    color: copied ? '#22c55e' : color, borderRadius: 6,
                    padding: '5px 8px', fontSize: 10, cursor: 'pointer', fontWeight: 600,
                    fontFamily: 'inherit',
                  }}>
                    {copied ? '✓ Copied' : `⎘ Copy (${annotations.length})`}
                  </button>
                )}
                <button onClick={handleClear} style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#64748b', borderRadius: 6, padding: '5px 8px', fontSize: 10,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>Clear</button>
              </div>
            </div>
          )}

          {/* Main toggle */}
          <button onClick={toggle} style={{
            width: 48, height: 48, borderRadius: 14,
            background: active ? color : 'rgba(10,10,15,0.9)',
            border: `2px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
            color: active ? '#fff' : '#94a3b8', cursor: 'pointer',
            fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)', transition: 'all 0.2s',
          }}>
            {active ? '✕' : '✏️'}
          </button>
          <div style={{
            textAlign: 'center', marginTop: 4, fontSize: 9, letterSpacing: 1,
            color: active ? color : '#475569', textTransform: 'uppercase',
          }}>
            {active ? `${annotations.length} marks` : 'Draw'}
          </div>
        </div>
      )}
    </>
  )
}
