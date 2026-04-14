# Design System Strategy: The Living Sanctuary

## 1. Overview & Creative North Star
This design system moves away from the sterile, rigid grids typically associated with healthcare. Our Creative North Star is **"The Living Sanctuary."** We are crafting a digital environment that breathes, heals, and guides. 

By blending **Soft Minimalism** with **Editorial Sophistication**, we replace clinical coldness with organic warmth. We achieve a "high-end" feel not through decorative excess, but through intentional asymmetry, generous white space (breathing room), and a rejection of traditional UI "boxes." The interface should feel like a premium wellness journal—authoritative yet deeply human.

---

## 2. Color Philosophy & Tonal Architecture
The palette is a curated journey through nature: mossy greens (`primary`), sky blues (`secondary`), and earth-toned beiges (`tertiary`).

### The "No-Line" Rule
To achieve a signature, premium aesthetic, **1px solid borders are strictly prohibited** for defining sections or containers. We define boundaries through:
*   **Background Shifts:** Distinguish content areas by transitioning from `surface` to `surface_container_low`.
*   **Tonal Depth:** Use the `surface_container` tiers to suggest hierarchy. A card doesn't need an outline if it sits on a subtly darker or lighter background.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of organic material. 
*   **Base:** `surface` (#f9faf6) or `surface_bright`.
*   **Content Blocks:** `surface_container_low` (#f2f4f0).
*   **Elevated Elements:** `surface_container_highest` (#dfe4df) for interactive regions.
*   **The "Glass & Gradient" Rule:** For floating headers or navigation overlays, use Glassmorphism. Apply a backdrop blur (20px+) to `surface` at 80% opacity. For CTAs, use a subtle linear gradient from `primary` (#2d6a4f) to `primary_dim` (#1f5e44) to add "soul" and dimension.

---

## 3. Typography: The Editorial Voice
We utilize a dual-typeface system to balance professional authority with approachable warmth.

*   **Display & Headlines (Manrope):** This is our "Editorial Voice." Manrope’s geometric yet friendly structure provides clarity. Use `display-lg` (3.5rem) with tighter letter-spacing for hero sections to create a high-end magazine impact.
*   **Body & Labels (Plus Jakarta Sans):** This is our "Human Whisper." Plus Jakarta Sans has a modern, open aperture that ensures high legibility and a welcoming personality.
*   **Hierarchy Tip:** Always maintain a high contrast between headline sizes and body text. Large headlines paired with ample padding create the "premium" feel of a high-end publication.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are often too "heavy" for a wellness-focused system. We use **Tonal Layering** to create a sense of lift.

*   **The Layering Principle:** Depth is achieved by stacking. Place a `surface_container_lowest` (#ffffff) card onto a `surface_container` (#ecefea) background. This creates a soft, natural "pop" without visual clutter.
*   **Ambient Shadows:** If a floating element (like a FAB or Menu) requires a shadow, use a "Tinted Ambient" approach:
    *   Blur: 40px-60px.
    *   Opacity: 4-6%.
    *   Color: Use a darkened version of the surface color (e.g., a hint of `on_surface` mixed with `primary_dim`) rather than neutral grey.
*   **The "Ghost Border" Fallback:** If a container absolutely requires a boundary for accessibility, use the `outline_variant` (#afb3af) at **15% opacity**. It should be felt, not seen.

---

## 5. Component Foundations

### Buttons & Interaction
*   **Primary Action:** `full` rounded corners (9999px). Background: `primary`. Text: `on_primary`. No shadow; use a subtle scale-up (1.02x) on hover.
*   **Secondary Action:** `full` rounded corners. Background: `secondary_container`. Text: `on_secondary_container`.
*   **Tertiary/Ghost:** No background. Text: `primary`. Use `body-lg` weight for prominence.

### Cards & Content Containers
*   **Standard Card:** Use `surface_container_low`. Corner radius: `lg` (2rem). 
*   **The No-Divider Rule:** Never use horizontal lines to separate content within a card. Use vertical white space or a change in typography weight (`title-md` vs `body-sm`).

### Input Fields
*   **Style:** Filled containers using `surface_container_high`. Corner radius: `sm` (0.5rem).
*   **Focus State:** Transition the background to `surface_container_lowest` and add a 2px "Ghost Border" using `primary`.
*   **Error State:** Use `error` (#a73b21) for the label and `error_container` for a subtle background tint to indicate urgency without causing anxiety.

### Chips & Tags
*   **Anatomy:** `full` rounded corners.
*   **Logic:** Use `tertiary_container` for neutral tags and `primary_container` for active selection. Keep icons "light and friendly" with a 1.5px stroke weight.

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace Asymmetry:** Align a large headline to the left and offset the body text to the right to create an editorial, non-template look.
*   **Use "Human" Spacing:** Give elements 20% more padding than you think they need. Space is a luxury in digital design.
*   **Soft Transitions:** All hover and active states should have a minimum of 300ms ease-in-out transitions to reflect the "well-being" focus.

### Don’t:
*   **Avoid "Pure" Black:** Never use #000000. Use `on_surface` (#2f3430) for text to keep the interface soft on the eyes.
*   **No Sharp Corners:** Avoid the `none` or `sm` radius for main UI containers. Everything should feel "huggable" and safe.
*   **Zero High-Contrast Grids:** Do not use heavy borders or high-contrast background shifts (e.g., bright white on dark grey). Keep the "Living Sanctuary" tonal and harmonious.

---

## 7. Signature Elements
*   **Well-being Accents:** Integrate soft, organic shapes (blobs) using `secondary_container` at 20% opacity behind key imagery to break the grid.
*   **Interactive Fluidity:** Use the `xl` (3rem) corner radius for bottom sheets and large modals to make them feel like "soft petals" rising from the bottom of the screen.