# Design System: College Attendance System

## 1. Visual Theme & Atmosphere
A balanced, high-fidelity college utility dashboard with a clean dark aesthetic. The interface uses a clinical yet warm canvas (Zinc-950) with glassmorphism overlays and a high-contrast Teal accent. Layouts are structured but asymmetric, prioritizing clarity and fast interaction. Motion is weighty and responsive, utilising custom spring physics for state transitions.

## 2. Color Palette & Roles
*   **Canvas Dark** (`#09090B`) — Primary dark background
*   **Pure Surface** (`#18181B`) — Surface elements, panels, cards
*   **Text Primary** (`#F4F4F5`) — High contrast white text for headlines and content
*   **Text Muted** (`#A1A1AA`) — Medium contrast grey text for metadata, labels, and timestamps
*   **Border Subtle** (`rgba(63, 63, 70, 0.4)`) — Thin 1px structural dividing lines
*   **Teal Accent** (`#0D9488`) — Singular accent color for active states, primary CTA buttons, selection indicators, and successful verifications
*   **Crimson Alert** (`#E11D48`) — Functional alert color for absences and errors

## 3. Typography Rules
*   **Display / Headlines:** `Outfit` (sans-serif) — Track-tight, controlled scale, bold weights.
*   **Body:** `Satoshi` (sans-serif) — Relaxed line height (`leading-relaxed`), max 65 characters per line (`max-w-[65ch]`), utilizing muted gray (`#A1A1AA`) for secondary paragraphs.
*   **Mono:** `Geist Mono` — Reserved for register numbers, timetables, percentages, and session period tags.
*   **Banned:** `Inter` is strictly forbidden. Generic system fonts (`Arial`, `Times New Roman`) are banned. Serif fonts are banned across all dashboard screens.

## 4. Component Stylings
*   **Buttons:** Flat, solid Teal Accent fill or subtle border outlines. No neon drop shadows or outer glows. Active state has a tactile `-1px` translation feedback. Touch target size is a minimum of `44px` on mobile.
*   **Cards:** Rounded corners (`1.5rem`). Whisper thin border outlines (`#27272A`) with negative space separating sections. High-density timetables use border-top dividers rather than nested boxes.
*   **Inputs:** Label positioned above the input in `Text Muted`, error messages below in `Crimson Alert`. Subtle focus borders using the `Teal Accent`. No floating labels or placeholders.
*   **Loaders:** Skeletal layout shimmers matching the card/grid structures. No circular spinning wheels.
*   **Realtime Banners:** Top-anchored banner showing "Active Roll in Progress" with a gentle pulse animation.

## 5. Layout & Spacing
*   **Timetable Grid:** Standard 7-row (periods) x 6-column (days) layout on desktop, collapsing to a tabbed day view (Monday to Saturday) on mobile devices to prevent horizontal scrolling.
*   **Grid System:** Responsive CSS grids with default max-width container (`1400px` centered) and proportional gap scale using `clamp()` (e.g. `gap-[clamp(1rem,2vw,2rem)]`).
*   **Containment:** Standard screen sections must use `min-h-[100dvh]` instead of `h-screen` to prevent scrolling offsets on mobile browsers.

## 6. Motion & Interaction
*   **Transition Default:** Spring physics transitions (`stiffness: 100, damping: 20`) for dialog modal overlays and card expansions.
*   **Active States:** Perpetual micro-animations (subtle glow pulse or shimmer) are used on active cards (like the currently active period slot).
*   **Page Transitions:** Waterfall stagger loading for lists of students and timetable items.

## 7. Anti-Patterns (Banned)
*   No emojis anywhere in the system.
*   No generic system fonts or `Inter` font.
*   No pure black (`#000000`) surfaces.
*   No neon outer-glow effects.
*   No generic card columns of equal width.
*   No fake names (`John Doe`), class names (`Class A`), or subjects (`Subject 1`). Use realistic datasets (`Dr. Robert Chen`, `CS-A`, `Operating Systems CS-302`).
*   No fabricated metrics (`99.9% Uptime`). If real statistics are unavailable, use descriptive placeholder brackets like `[attendance percentage]` or `[absent count]`.
*   No AI copywriting clichés like "seamlessly," "unleash," "next-gen," or "elevate."
