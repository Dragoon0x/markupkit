# usemarkupkit

Draw on your live website. Freehand feedback for AI agents.

**[Landing Page →](https://dragoon0x.github.io/markupkit)**

[![npm](https://img.shields.io/npm/v/usemarkupkit)](https://npmjs.com/package/usemarkupkit)
[![license](https://img.shields.io/npm/l/usemarkupkit)](./LICENSE)

## Install

```bash
npm i usemarkupkit -D
```

## Quick Start

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

## Features

- **6 annotation modes** — draw, text, click, multi, area, pause
- **7 shape types** — circle, arrow, strikethrough, underline, cross, rectangle, freehand
- **4 output levels** — compact, standard, detailed, forensic
- **Spacing visualization** — live padding/margin overlay
- **Contrast checking** — WCAG 2.1 AA/AAA ratio calculation
- **React detection** — reads fiber tree for component names
- **Source file detection** — reads `_debugSource` from React fiber
- **Screenshot capture** — download annotation canvas as PNG
- **localStorage persistence** — annotations survive page refresh
- **Animation pause** — freeze CSS animations for annotation
- **Settings panel** — 8 toggleable options
- **Endpoint sync** — POST annotations to your server
- **Keyboard shortcuts** — Ctrl+Shift+D toggle, P pause, H hide, C copy, X clear

## Programmatic API

```ts
import {
  detectShape, resolveShape, formatSession,
  resolveClickedElement, resolveTextSelection, resolveAreaSelection,
  contrastRatio, smoothPoints, strokeBounds
} from 'usemarkupkit'
```

## Disclaimer

This is experimental software. See [DISCLAIMER.md](./DISCLAIMER.md) for full details. Use at your own risk. DYOR.

## Security

See [SECURITY.md](./SECURITY.md) for reporting vulnerabilities.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT — see [LICENSE](./LICENSE)

---

Made by [@dragoon0x](https://github.com/dragoon0x)
