# usemarkupkit

draw on your live website. freehand feedback for ai agents.

**[Landing Page →](https://dragoon0x.github.io/markupkit)**

[![npm](https://img.shields.io/npm/v/usemarkupkit)](https://npmjs.com/package/usemarkupkit)
[![license](https://img.shields.io/npm/l/usemarkupkit)](https://github.com/Dragoon0x/markupkit/blob/main/LICENSE)

---

## why this exists

[@benjitaylor](https://x.com/benjitaylor). he's one of the few people i genuinely look up to in this space. the way he thinks about problems, the craft he puts into agentation, the essays, it all made me want to build something.

agentation showed me that pointing at things beats describing them. markupkit started because i wanted to understand how that actually works under the hood. then i kept pulling the thread.

draw freehand on your live page. circle a bug. arrow between elements. strikethrough a typo. drag elements where you want them. resize. drop wireframe components. snap guides. the agent gets structured diffs with selectors and coordinates, not paragraphs.

this is a learning project. built in public, out of curiosity, because benji's work made me care about the problem.

---

## install

```bash
npm i usemarkupkit -D
```

## quick start

```tsx
import { Markup } from 'usemarkupkit'

function App() {
  return (
    <>
      <YourApp />
      {process.env.NODE_ENV === "development" && <Markup />}
    </>
  )
}
```

zero config. drop it in, hit `Ctrl+Shift+D`, start drawing.

want layout mode too? add the prop:

```tsx
<Markup layout />
```

---

## what it does

### six annotation modes

| mode | what it captures |
|------|------------------|
| **draw** | freehand strokes, classified into 7 shape types |
| **text** | exact selected string + element selector |
| **click** | any element, identified by content with computed context |
| **multi** | multiple elements grouped in one annotation |
| **area** | drag a rectangle, get every element inside it |
| **pause** | freezes all CSS animations and transitions globally |

### seven shape types

every stroke gets classified with a confidence score. circle (enclose), arrow (relate two things), strikethrough (delete text), underline (emphasize), cross (remove), rectangle (select region), freehand (fallback). the classifier scores all seven and picks the highest above 0.35.

### smart identification

selectors built the way you'd actually search for them in code. id first, then `data-testid`, then meaningful classes, then nth-child as last resort. nothing brittle.

### react component detection

reads the fiber tree via `__reactFiber$` keys, falls back to `data-component` and `data-testid`. component names appear in the output next to selectors.

### source file detection

reads `_debugSource` from the react fiber and `data-source` / `data-file` attributes. the agent gets the actual file path, not just a selector.

### spacing visualization

hover any element. padding renders as green zones, margin as amber zones, with pixel values labeled. computed live from `getComputedStyle`.

### contrast checking

every text element gets its WCAG 2.1 contrast ratio calculated from `color` and `backgroundColor`. AA pass/fail, AAA pass/fail, both shown.

### screenshot capture

click the camera icon. annotation canvas downloads as PNG.

### localStorage persistence

annotations survive page refresh. stored under `markupkit_annotations`. toggle on/off in settings.

---

## layout mode

annotations tell the agent *this is wrong.* layout mode tells the agent *here's what i want instead.*

select an element. drag it somewhere new. resize it. drop a wireframe component from the palette. every change is tracked with precise coordinates. hit copy, paste into claude code or cursor, the agent applies it in one pass.

| feature | what it does |
|---------|-------------|
| **drag to move** | snaps to sibling edges and centers. delta captured as `→12px, ↓8px` |
| **resize handles** | 8 handles. drag edges or corners. 24px minimum enforced |
| **alignment guides** | blue dashed lines snap at 6px threshold. optional 8px grid |
| **component palette** | 9 wireframe primitives: section, card, heading, text, button, input, image, navbar, tabs |
| **structured diffs** | type, selector, from/to rects, pixel deltas per change |
| **css suggestions** | `detailed` level outputs transform and dimension CSS |

enable it:

```tsx
<Markup layout />
```

---

## four output levels

same annotations, four levels of detail. pick what your agent actually needs.

- **compact** — quick fixes, minimal context
- **standard** — selector + note, the default
- **detailed** — full computed styles, contrast, spacing, source file
- **forensic** — everything plus dom path, layout debug data, parent context

set it via prop or in the settings panel.

---

## settings panel

⚙ button in the toolbar. eight toggles, all wired live:

- output detail level
- spacing visualization
- contrast check
- react component detection
- source detection
- persist to localStorage
- clear on copy
- block interactions during annotation

---

## keyboard shortcuts

| key | action |
|-----|--------|
| `Ctrl + Shift + D` | toggle on/off |
| `Esc` | cancel / close |
| `P` | pause/resume animations |
| `H` | hide/show markers |
| `C` | copy annotations |
| `X` | clear all |

---

## props

all optional. works with zero config.

| prop | description |
|------|-------------|
| `enabled` | enable/disable (default: `true`) |
| `layout` | enable layout mode (default: `false`) |
| `color` | stroke color (default: `"#171717"`) |
| `strokeWidth` | stroke width in px (default: `3`) |
| `tool` | `"draw"` \| `"arrow"` \| `"circle"` \| `"eraser"` |
| `detail` | `"compact"` \| `"standard"` \| `"detailed"` \| `"forensic"` |
| `toolbar` | show toolbar (default: `true`) |
| `position` | toolbar corner (default: `"bottom-right"`) |
| `root` | scope selector (default: `"body"`) |
| `ignore` | tags to skip (default: `[]`) |
| `shortcut` | toggle shortcut (default: `"ctrl+shift+d"`) |
| `copyToClipboard` | write to clipboard (default: `true`) |
| `endpoint` | server URL for syncing annotations |
| `sessionId` | pre-existing session to rejoin |
| `onAnnotationAdd` | called when annotation created |
| `onAnnotationDelete` | called when annotation removed |
| `onAnnotationUpdate` | called when note edited |
| `onAnnotationsClear` | called when all cleared |
| `onCopy` | called when copy clicked, receives markdown |
| `onDraw` | called per-stroke with `DrawEvent` |
| `onSessionCreated` | called when a new session is created |

---

## agent sync

pass `endpoint` to sync annotations to your server. sessions get created on mount, annotations POSTed on change. pass `sessionId` to rejoin an existing session.

```tsx
<Markup
  endpoint="http://localhost:4747"
  onSessionCreated={(id) => console.log("Session:", id)}
/>
```

---

## programmatic API

if you want to use the engine without the UI:

```ts
import {
  detectShape, resolveShape, formatSession,
  resolveClickedElement, resolveTextSelection,
  resolveAreaSelection, getElementSpacingAtPoint,
  contrastRatio, smoothPoints, strokeBounds
} from 'usemarkupkit'

// shape detection
detectShape(stroke) // → { type: 'circle', confidence: 0.87 }

// element resolution per mode
resolveClickedElement(x, y)   // → Annotation from click
resolveTextSelection()        // → Annotation from window.getSelection()
resolveAreaSelection(bounds)  // → Annotation from rectangle

// spacing + contrast
getElementSpacingAtPoint(x, y) // → { spacing, rect }
contrastRatio('rgb(23,23,23)', 'rgb(255,255,255)') // → 16.0
```

---

## stack

~10kb gzipped. zero dependencies. react 18+. typescript. MIT.

---

## disclaimer

experimental software. built as a learning project, in public. see [DISCLAIMER.md](./DISCLAIMER.md) for the full version. use at your own risk. DYOR.

## security

see [SECURITY.md](./SECURITY.md) for reporting vulnerabilities.

## contributing

see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines. issues, PRs, and ideas welcome.

## license

MIT, see [LICENSE](./LICENSE).

---

made by [@dragoon0x](https://github.com/dragoon0x). inspired by [@benjitaylor](https://x.com/benjitaylor) and [agentation](https://agentation.com).
