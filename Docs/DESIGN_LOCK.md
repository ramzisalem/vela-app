# Vela Design Lock — Visual Identity

**Locked May 2026.** Any deviation from the rules below in implementation or marketing is a bug.

---

## The four rules

1. **Cream surfaces, never white-as-page.** The page background is the cream radial wash (`CreamWash` token, file 15). White is reserved for raised cards.
2. **Espresso text, never pure black.** `text.primary` = `espresso900` (`#241F1A`). `#000000` is forbidden in product UI. Hardware-frame mockups and the camera viewfinder background may use `charcoal950` (`#16110D`).
3. **Serif for editorial moments.** Welcome, score reveal, paywall promise, milestone copy, and the "Morning"/"Evening" section markers in the routine. Never for body, labels, navigation, or data.
4. **One gradient, one signature.** `VelaPrimary` is a 135° linear gradient: pink300 (`#E8B5C4`) → mauve500 (`#B098B8`) → blue300 (`#7AA6CB`). Used on:
   - Primary CTAs (Begin, Start trial, Save, Continue)
   - Active toggle / segment states
   - "Done" indicators on routine tasks
   - Selected-option borders (paywall plan)
   - Daily / weekly progress bar fill
   - Comparison slider divider + handle fill
   - Brand wordmark in lockup variant (splash, paywall hero, share-card watermark only)

   It is **not** used on card backgrounds, body text, sub-score dots, status colors, or anywhere else.

## Tokens

All values live in **`15_DESIGN_SYSTEM.md`**:
- Palette → `Palette` (raw values; never use directly)
- Semantic colors → `lightColors` / `darkColors` (via `useColors()`)
- Gradients → `VelaPrimary`, `VelaPrimarySoft`, `CreamWash` (`gradients.ts`)
- Typography → `Typography` (sans by default; serif tokens are `displaySerif`, `headlineSerif`, `serifItalic`, `sectionMarker`, plus the `score*` family)
- Spacing → `Spacing.{xxs..massive}`
- Radii → `Radii.{sm..xxxl, full}` — buttons use `full` (pill); cards use `xl` or `xxl`
- Shadows → `getShadow(intensity, mode)` (espresso-tinted, never pure black)

## What changed from the prior pass

| Was | Is |
|---|---|
| `#FAFAF8` warm-white page bg | `CreamWash` radial (`#F1E8DA → #FAF6EE`) |
| `#1A1A1A` (gray800) primary text | `#241F1A` espresso900 |
| Solid blue accent button | `VelaPrimary` gradient pill |
| Sans-only headlines | Serif for editorial moments |
| 700-weight type | All weights pegged at 400 / 500 |
| `#000` shadows | Espresso-tinted shadows |
| `Wordmark` weight 300/700 sans | Wordmark serif italic 500, optional gradient lockup |

## Verification

- `npm run check:contrast` (file 15) — fails CI if any token pair drops below WCAG AA.
- ESLint `no-restricted-imports` (file 01) — blocks direct `Palette.*` outside `colors.ts`.
- Manual: every screen in light AND dark mode (file 17 QA checklist).

## Files updated for the lock

- `00_INDEX.md` — visual-identity line + canonical-source matrix references
- `15_DESIGN_SYSTEM.md` — palette, gradients, typography, button, shadows, contrast matrix, principles
- `21_BRAND_SYSTEM.md` — visual-identity section, wordmark spec, app icon
- `07_ONBOARDING.md` — welcome screen uses `<DisplaySerif>` + `<CreamWashView>` + gradient `<Button>`
- `08_PAYWALL.md` — RC dashboard config notes for the gradient CTA + cream paywall surface
- `09_ROUTINE.md` — UI styling notes for streak / done / section markers
- `13_SHARE_CARDS.md` — share card uses gradient wordmark lockup, espresso bg

## What still needs implementation work

- `<CreamWashView>` component (referenced from file 07; thin wrapper over `expo-linear-gradient`)
- `<GradientBorderPill>` component (referenced from file 09; conic-gradient border trick or a stacked LinearGradient + inner View)
- Install `@react-native-masked-view/masked-view` for the gradient wordmark lockup
- Install `expo-linear-gradient` if not already in dependencies (file 01)
- App-icon master file at 1024×1024 with the gradient glyph (file 21 spec)
