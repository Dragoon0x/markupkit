# Publish & Deploy Guide

## 1. Create repo
```bash
gh repo create markupkit --public --description "Draw on your live website. Freehand feedback for AI agents."
```

## 2. Push
```bash
cd markupkit
git init && git add . && git commit -m "v1.0.0 — markupkit"
git branch -M main
git remote add origin https://github.com/dragoon0x/markupkit.git
git push -u origin main
```

## 3. Publish to npm
```bash
npm login
npm publish --access public
```

## 4. Enable GitHub Pages
Settings -> Pages -> Source -> GitHub Actions

## 5. Verify
- npm: https://www.npmjs.com/package/markupkit
- Essay: https://dragoon0x.github.io/markupkit/
- GitHub: https://github.com/dragoon0x/markupkit
