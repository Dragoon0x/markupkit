# usemarkupkit

Draw on your live website. Freehand feedback for AI agents. Circles detect elements, arrows map relationships, strikethroughs flag removals.

**[Interactive Essay →](https://dragoon0x.github.io/markupkit)**

## Why

Agentation proved pointing beats describing. MarkupKit pushes that further: **drawing beats pointing**. A circle says "these elements." An arrow says "move this there." A strikethrough says "delete this." Every gesture carries semantic meaning that words have to spell out laboriously.

## Install

```bash
npm i usemarkupkit
```

## Quick Start

```tsx
import { Markup } from 'usemarkupkit'

export default function Layout({ children }) {
  return (
    <>
      {children}
      {process.env.NODE_ENV === "development" && <Markup />}
    </>
  )
}
```

A toolbar appears in the corner. Click the pencil to start drawing. Draw on your page. Add optional notes. Copy structured output for agents.

## Shape Detection

MarkupKit recognizes seven gesture types, each with distinct semantic meaning:

| Gesture | Detected As | Agent Intent |
|---------|-------------|--------------|
| Circle around elements | `circle` | "Fix/review these elements" |
| Arrow between elements | `arrow` | "Move/connect/relate these" |
| Horizontal line through text | `strikethrough` | "Remove or replace this" |
| Underline beneath text | `underline` | "Emphasize or keep this" |
| X mark over element | `cross` | "Delete this entirely" |
| Rectangle around area | `rectangle` | "This area needs attention" |
| Any other stroke | `freehand` | Captures nearest element |

Each shape auto-resolves to DOM elements with CSS selectors.

## What Agents Get

```markdown
## Annotation 1

### ⭕ circle: Circled 2 elements — area needs review
> Make these cards the same height

- `div.card:nth-child(1)`
  Text: "Monthly Revenue — $124,500"
- `div.card:nth-child(2)`
  Text: "Active Users — 8,241"
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable/disable |
| `color` | `string` | `"#e53e3e"` | Stroke color |
| `strokeWidth` | `number` | `3` | Stroke width |
| `tool` | `ToolMode` | `"draw"` | Active tool |
| `detail` | `OutputDetail` | `"standard"` | Output detail |
| `toolbar` | `boolean` | `true` | Show toolbar |
| `position` | `string` | `"bottom-right"` | Toolbar position |
| `root` | `string` | `"body"` | Scope selector |
| `ignore` | `string[]` | `[]` | Selectors to skip |
| `onAnnotation` | `(a) => void` | — | Per-annotation callback |
| `onCopy` | `(md) => void` | — | Copy callback |
| `shortcut` | `string` | `"ctrl+shift+d"` | Keyboard shortcut |

## Tools

| Tool | Icon | Behavior |
|------|------|----------|
| `draw` | ✏️ | Freehand drawing with shape detection |
| `arrow` | ➡️ | Draws with arrowhead rendering |
| `circle` | ⭕ | Freehand with circle bias |
| `eraser` | 🧹 | Removes strokes in drawn area |

## Programmatic API

```ts
import { detectShape, resolveShape, formatSession } from 'usemarkupkit'

// Detect shape from a stroke
const shape = detectShape(stroke)
// → { type: 'circle', confidence: 0.82, bounds: {...} }

// Resolve to DOM elements
const annotation = resolveShape(shape)
// → { elements: [{ selector: 'div.card', text: '...' }], intent: 'Circled 2 elements' }
```

## Technical

- **~6kb gzipped** — Tree-shakeable ESM and CJS
- **Zero dependencies** — React 18+ and React DOM only
- **Pressure-sensitive** — Variable-width strokes based on speed
- **Shape recognition** — 7 gesture types with confidence scoring
- **Element resolution** — Circles find enclosed elements, arrows resolve endpoints, strikethroughs find text underneath
- **Full TypeScript** — Every type exported

## License

MIT © [dragoon0x](https://github.com/dragoon0x)
