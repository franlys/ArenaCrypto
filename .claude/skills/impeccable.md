---
name: impeccable
description: "Create distinctive, production-grade frontend interfaces with high design quality. Generates creative, polished code that avoids generic AI aesthetics. Use when building components, pages, or UI features. Invoke with 'craft' for shape-then-build, 'teach' for design context, 'polish' for final cleanup before shipping."
argument-hint: "[craft|teach|polish|audit|animate|bolder|overdrive]"
---

# Impeccable Design Skill

Source: https://github.com/pbakaus/impeccable — Apache 2.0 License

## What This Skill Does
Guides creation of **distinctive, production-grade** interfaces that avoid generic "AI slop" aesthetics.

---

## For ArenaCrypto — Design Context

### Brand Personality: "Fast, Dark, Electric"
- **Audience**: Gamers and crypto enthusiasts who bet on tournaments and sports
- **Tone**: High-octane, premium eSports — like being inside a neon-lit arena at night
- **3 words**: *Electric · Competitive · Exclusive*
- **Theme**: Always dark. Dark mode is correct for this product — users play late at night.

### Absolute Color Rules
- ✅ Use `oklch()` over `hsl()` for perceptual uniformity
- ✅ Tint neutrals toward the brand cyan (`oklch(0.85 0.15 195)`)
- ❌ NO pure black (#000) or pure white (#fff) — always tint
- ❌ NO gray text on colored backgrounds — use a shade of the bg color instead
- ❌ NEVER use purple-to-blue gradients as the primary accent (overused AI tell)

### Typography Rules (ArenaCrypto-specific)
- **Display/Headers**: Orbitron (already installed) — keep as brand font
- **Stats/Numbers**: Rajdhani — high-contrast, technical feel
- **Body/UI**: Use non-reflex fonts. NOT Inter, NOT DM Sans, NOT Outfit.
  Acceptable alternatives: Geist, Figtree, Nunito, Barlow Condensed
- Use `clamp()` for marketing pages, fixed `rem` for game/dashboard UIs
- Line height +0.05 for light text on dark background (readability)

### Layout Principles
```css
/* Use 4pt scale with semantic names */
--space-xs:  4px;
--space-sm:  8px;
--space-md:  16px;
--space-lg:  24px;
--space-xl:  48px;
--space-2xl: 96px;

/* Self-adjusting grids */
grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
```
- Use `gap` not `margin` between siblings
- Vary spacing for hierarchy — NOT the same padding everywhere
- Left-align text — not centered UI

### Absolute Bans (from impeccable)
1. **NO side-stripe borders** on cards: `border-left: 3px solid var(--color-x)` — always
2. **NO gradient text**: `background-clip: text` + gradient background
3. **NO glassmorphism abuse** — use it intentionally (BetSlip panel only)
4. **NO bounce/elastic easing** — use `cubic-bezier(0.23, 1, 0.32, 1)` (ease-out-quart)
5. **NO modals** unless no alternative — use drawers, inline reveals, or panels
6. **NO cards inside cards** — flatten hierarchy
7. **NO identical card grids** (same icon + heading + text repeated)

---

## Commands Available

### `/polish [component]`
Final pass before deploying. Check:
1. Typography hierarchy clear? (≥1.25 ratio between scale steps)
2. Color contrast accessible? (WCAG AA minimum)
3. Every interactive state covered? (hover, focus, active, disabled, loading)
4. Motion respects `prefers-reduced-motion`?
5. No absolute bans violated?
6. Empty/error states designed?
7. Mobile layout not "amputated" — full functionality preserved

### `/audit [area]`
Run quality checks (no edits, just report):
- Detect side-stripe borders, gradient text, purple gradients
- Check font choices against reflex_fonts_to_reject
- Identify `transition: all` (must use specific properties)
- Find identical card patterns
- Flag missing focus states

### `/animate [component]`
Add purposeful motion:
- Entrances: `opacity 0→1` + `transform: translateY(8px)→0`
- Use `ease-out-quart` for deceleration
- Stagger sibling animations: `delay: i * 40ms`
- State changes: use `grid-template-rows` for height transitions
- NEVER animate layout properties (width, padding, margin)

### `/bolder [component]`
Amplify an underdesigned component:
- Increase contrast ratio between hierarchy levels
- Add unexpected scale jumps (go from 1rem to 2rem, skip the middle)
- Replace muted colors with decisive accents
- Add a single high-impact decorative element

### `/overdrive [component]`
Add technically extraordinary effects (use with intention):
- CSS-only particle trails on hover
- 3D transform card flips
- Custom SVG clip-paths
- Canvas-based backgrounds (Plinko ball physics, etc.)

### `/craft [feature]`
Full shape-then-build flow:
1. Define 3 brand words for this specific feature
2. Choose typography that DOES NOT appear in reflex_fonts_to_reject
3. Design the palette using oklch()
4. Build working, production-grade code

---

## The AI Slop Test
Before shipping any component, ask: *"If someone saw this and said 'AI made it,' would they be right?"*

Red flags that scream AI slop:
- Inter font
- Purple gradient accents
- Cyan glow on dark cards (use intentionally, not reflexively)
- `border-left: 4px solid` on every alert/card
- Every button is the same size/weight
- Cards: icon → heading → 2-line description, repeated 6 times
- Gradient text in headings
