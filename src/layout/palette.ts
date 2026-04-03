import type { PaletteComponent, Rect } from './types'

/** Built-in wireframe components */
export const PALETTE: PaletteComponent[] = [
  // Structure
  {
    type: 'section',
    label: 'Section',
    icon: '▭',
    defaultSize: { width: 400, height: 200 },
    category: 'structure',
    render: (r: Rect) => `<div style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;border:2px dashed #94a3b8;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font:13px/1 system-ui;pointer-events:none">Section</div>`,
  },
  {
    type: 'container',
    label: 'Container',
    icon: '⬜',
    defaultSize: { width: 300, height: 150 },
    category: 'structure',
    render: (r: Rect) => `<div style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font:12px/1 system-ui;pointer-events:none">Container</div>`,
  },
  {
    type: 'card',
    label: 'Card',
    icon: '🃏',
    defaultSize: { width: 280, height: 160 },
    category: 'structure',
    render: (r: Rect) => `<div style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;background:white;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);padding:16px;pointer-events:none"><div style="width:40%;height:12px;background:#e2e8f0;border-radius:4px;margin-bottom:8px"></div><div style="width:70%;height:8px;background:#f1f5f9;border-radius:3px;margin-bottom:6px"></div><div style="width:55%;height:8px;background:#f1f5f9;border-radius:3px"></div></div>`,
  },
  // Content
  {
    type: 'heading',
    label: 'Heading',
    icon: 'H',
    defaultSize: { width: 300, height: 36 },
    category: 'content',
    render: (r: Rect) => `<div style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;display:flex;align-items:center;pointer-events:none"><div style="width:65%;height:16px;background:#1e293b;border-radius:4px"></div></div>`,
  },
  {
    type: 'paragraph',
    label: 'Text Block',
    icon: '¶',
    defaultSize: { width: 400, height: 80 },
    category: 'content',
    render: (r: Rect) => `<div style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;display:flex;flex-direction:column;gap:6px;pointer-events:none"><div style="width:100%;height:8px;background:#cbd5e1;border-radius:3px"></div><div style="width:92%;height:8px;background:#cbd5e1;border-radius:3px"></div><div style="width:85%;height:8px;background:#cbd5e1;border-radius:3px"></div><div style="width:60%;height:8px;background:#cbd5e1;border-radius:3px"></div></div>`,
  },
  {
    type: 'avatar',
    label: 'Avatar',
    icon: '👤',
    defaultSize: { width: 48, height: 48 },
    category: 'content',
    render: (r: Rect) => `<div style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;background:#e2e8f0;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:${Math.min(r.width,r.height)*0.4}px;pointer-events:none">👤</div>`,
  },
  // Input
  {
    type: 'button',
    label: 'Button',
    icon: '⬛',
    defaultSize: { width: 120, height: 40 },
    category: 'input',
    render: (r: Rect) => `<div style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;background:#1e293b;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font:13px/1 system-ui;font-weight:500;pointer-events:none">Button</div>`,
  },
  {
    type: 'input',
    label: 'Input',
    icon: '▁',
    defaultSize: { width: 240, height: 40 },
    category: 'input',
    render: (r: Rect) => `<div style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;background:white;border:1px solid #cbd5e1;border-radius:8px;display:flex;align-items:center;padding:0 12px;color:#94a3b8;font:13px/1 system-ui;pointer-events:none">Input field...</div>`,
  },
  {
    type: 'toggle',
    label: 'Toggle',
    icon: '⊙',
    defaultSize: { width: 44, height: 24 },
    category: 'input',
    render: (r: Rect) => `<div style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;background:#1e293b;border-radius:${r.height}px;display:flex;align-items:center;justify-content:flex-end;padding:0 3px;pointer-events:none"><div style="width:${r.height-6}px;height:${r.height-6}px;background:white;border-radius:50%"></div></div>`,
  },
  // Media
  {
    type: 'image',
    label: 'Image',
    icon: '🖼',
    defaultSize: { width: 320, height: 200 },
    category: 'media',
    render: (r: Rect) => `<div style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;display:flex;align-items:center;justify-content:center;pointer-events:none"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>`,
  },
  {
    type: 'icon',
    label: 'Icon',
    icon: '◆',
    defaultSize: { width: 24, height: 24 },
    category: 'media',
    render: (r: Rect) => `<div style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;background:#e2e8f0;border-radius:4px;pointer-events:none"></div>`,
  },
  // Navigation
  {
    type: 'navbar',
    label: 'Navbar',
    icon: '≡',
    defaultSize: { width: 600, height: 56 },
    category: 'navigation',
    render: (r: Rect) => `<div style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;background:white;border:1px solid #e2e8f0;border-radius:10px;display:flex;align-items:center;padding:0 20px;gap:24px;pointer-events:none"><div style="width:28px;height:28px;background:#1e293b;border-radius:6px"></div><div style="display:flex;gap:16px;margin-left:auto"><div style="width:40px;height:8px;background:#cbd5e1;border-radius:3px"></div><div style="width:40px;height:8px;background:#cbd5e1;border-radius:3px"></div><div style="width:40px;height:8px;background:#cbd5e1;border-radius:3px"></div></div><div style="width:72px;height:32px;background:#1e293b;border-radius:6px;margin-left:auto"></div></div>`,
  },
  {
    type: 'sidebar',
    label: 'Sidebar',
    icon: '|≡',
    defaultSize: { width: 240, height: 400 },
    category: 'navigation',
    render: (r: Rect) => `<div style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;display:flex;flex-direction:column;gap:12px;pointer-events:none"><div style="width:60%;height:10px;background:#1e293b;border-radius:3px;margin-bottom:8px"></div><div style="width:80%;height:8px;background:#cbd5e1;border-radius:3px"></div><div style="width:70%;height:8px;background:#cbd5e1;border-radius:3px"></div><div style="width:85%;height:8px;background:#94a3b8;border-radius:3px;background:#e0e7ff"></div><div style="width:65%;height:8px;background:#cbd5e1;border-radius:3px"></div><div style="width:75%;height:8px;background:#cbd5e1;border-radius:3px"></div></div>`,
  },
  {
    type: 'tabs',
    label: 'Tabs',
    icon: '⊞',
    defaultSize: { width: 360, height: 36 },
    category: 'navigation',
    render: (r: Rect) => `<div style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;background:#f1f5f9;border-radius:8px;display:flex;align-items:center;padding:3px;gap:2px;pointer-events:none"><div style="flex:1;height:100%;background:white;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,.06);display:flex;align-items:center;justify-content:center"><div style="width:32px;height:7px;background:#1e293b;border-radius:3px"></div></div><div style="flex:1;display:flex;align-items:center;justify-content:center"><div style="width:32px;height:7px;background:#94a3b8;border-radius:3px"></div></div><div style="flex:1;display:flex;align-items:center;justify-content:center"><div style="width:32px;height:7px;background:#94a3b8;border-radius:3px"></div></div></div>`,
  },
]

/** Get palette components by category */
export function getByCategory(category: PaletteComponent['category']): PaletteComponent[] {
  return PALETTE.filter(c => c.category === category)
}

/** Get all categories */
export function getCategories(): PaletteComponent['category'][] {
  return ['structure', 'content', 'input', 'media', 'navigation']
}

/** Find a component by type */
export function findComponent(type: string): PaletteComponent | undefined {
  return PALETTE.find(c => c.type === type)
}
