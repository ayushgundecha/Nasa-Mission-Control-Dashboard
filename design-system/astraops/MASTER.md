# AstraOps design system master

> Global source of truth. Before building a page, read this file and then
> `pages/<route-name>.md`; a page file may override only the rules it names.

- Version: 1.0.0
- Status: Accepted for Phase 1 implementation
- Updated: 2026-09-02
- Design dials: variance 7/10, motion 6/10, density 8/10
- Product category: independent live space-intelligence console
- Platform: responsive web, dark-first

## Product posture

AstraOps should feel like a beautifully engineered observatory instrument: cinematic at first glance, calm and legible under sustained use, and scrupulously honest about what is known. It is not a movie prop, a generic admin template, an official agency interface, or a professional flight-certification tool.

The visual signature is **orbital editorialism**: deep astronomical surfaces, crisp instrument lines, asymmetric editorial composition, dense but breathable data, and one restrained sky-blue signal color. The interface earns its “wow” through real information and spatial clarity rather than neon decoration.

Use the name **AstraOps** without NASA, SpaceX, or government insignia. Provider names appear only as source attribution. Persistent product language:

- “Live space intelligence” for provider-backed current data;
- “Mission Lab” for planning;
- “Operational estimate” for Earth, Moon, and Mars calculations;
- “Research concept — not flight ready” for exoplanet concepts;
- “Source · observed · fetched · freshness” wherever a factual claim is presented.

## Experience principles

1. **Reality before spectacle.** The primary number, event, or decision is readable without opening a visualization.
2. **Provenance is interface.** Source and freshness are first-class UI, not footer trivia.
3. **One dramatic moment per view.** A globe, trajectory, countdown, or dossier cover can lead; surrounding UI stays quiet.
4. **Progressive density.** Mobile shows the decision and status first; evidence expands below or on demand.
5. **No dead ends.** Loading, empty, stale, partial, unavailable, and invalid states each explain what happened and what the user can do.
6. **Motion confirms causality.** Animation explains a transition or spatial relationship and never delays work.

## Information architecture

Primary destinations are limited to five:

| Destination | Purpose                                            | Route          |
| ----------- | -------------------------------------------------- | -------------- |
| Command     | Global operational overview                        | `/`            |
| Launches    | Search, filter, and inspect global launches        | `/launches`    |
| Environment | Space weather, orbital objects, and NEO approaches | `/environment` |
| Mission Lab | Guided, explainable mission planning               | `/mission-lab` |
| About data  | Methods, sources, limits, and product independence | `/methodology` |

Entity and artifact routes are deep links, not primary navigation: `/launches/[id]`, `/objects/[id]`, `/approaches/[id]`, `/missions/[id]`, and `/dossiers/[id]`.

At `>=1024px`, use a persistent 240px navigation rail with wordmark, five labeled destinations, compact data-health summary, and settings/help at the bottom. At `<1024px`, use a 64px top bar and a bottom navigation with four destinations: Command, Launches, Environment, Lab. Methodology moves to the overflow menu. Never show a sidebar and bottom navigation at the same hierarchy.

Every page includes a skip link, one `h1`, a stable main landmark, and an optional breadcrumb only for depth three or greater. Route changes move focus to the main heading without breaking browser back/scroll restoration.

## First viewport

The first viewport answers three questions in this order:

1. What matters now?
2. How fresh and trustworthy is it?
3. What can I investigate or plan next?

On desktop, reserve roughly 60–68% width for the page’s signature visual or primary decision and 32–40% for the live briefing. On mobile, render the briefing before the visual. The primary CTA is unique per page; all other actions are secondary or quiet links.

## Color tokens

Do not place raw hex values in components. These dark-mode pairs have been contrast-checked; normal text targets WCAG 2.2 AA at 4.5:1 and meaningful graphics/boundaries target 3:1.

| Semantic token           |     Value | Use                                   |
| ------------------------ | --------: | ------------------------------------- |
| `--color-cosmos`         | `#07090F` | page background                       |
| `--color-void`           | `#0A0D14` | recessed regions                      |
| `--color-surface`        | `#0D111B` | primary panels                        |
| `--color-surface-raised` | `#141B29` | popovers and emphasized panels        |
| `--color-surface-hover`  | `#192234` | interactive hover/pressed surface     |
| `--color-line`           | `#263247` | meaningful borders and chart axes     |
| `--color-line-subtle`    | `#1A2333` | grouping dividers only                |
| `--color-text`           | `#F4F7FB` | primary text; 18.52:1 on cosmos       |
| `--color-text-secondary` | `#AAB7C9` | supporting text; 9.79:1               |
| `--color-text-muted`     | `#7F8DA3` | metadata; 5.92:1                      |
| `--color-signal`         | `#5CD6FF` | primary action and selection; 11.87:1 |
| `--color-orbit`          | `#5B8CFF` | secondary series and links            |
| `--color-concept`        | `#B89CFF` | modeled/concept values                |
| `--color-caution`        | `#F4B860` | stale, warning, user assumption       |
| `--color-positive`       | `#5BD6A2` | current/success/nominal               |
| `--color-critical`       | `#FF6B7A` | failed/danger/destructive             |
| `--color-focus`          | `#F4F7FB` | keyboard focus ring                   |

Use signal colors at low area coverage. No gradients, rainbow neon, full-panel status tints, scanlines, glitch effects, or text glow. Status always combines color with a label and icon/shape.

### Evidence grammar

| Evidence class         | Token   | Marker            | Required label                |
| ---------------------- | ------- | ----------------- | ----------------------------- |
| Provider observed      | signal  | solid circle      | Observed                      |
| Authoritative computed | orbit   | diamond           | JPL computed / authority name |
| AstraOps computed      | concept | outlined hexagon  | AstraOps estimate             |
| User assumed           | caution | outlined triangle | Your assumption               |

## Typography

Load fonts with `next/font`; do not use CSS `@import`.

- Display/UI: **Space Grotesk**, 400–700, fallback `Arial, sans-serif`.
- Data/labels: **JetBrains Mono**, 400–600, fallback `ui-monospace, monospace`.
- Body uses Space Grotesk, never monospaced prose.
- Numbers in clocks, tables, measurements, and coordinates use tabular figures.

| Role       | Mobile | Desktop | Line height | Weight |
| ---------- | -----: | ------: | ----------: | -----: |
| Display    |   40px |    64px |        0.98 |    600 |
| H1         |   32px |    48px |        1.05 |    600 |
| H2         |   24px |    32px |        1.15 |    600 |
| H3         |   19px |    22px |        1.25 |    600 |
| Body       |   16px |    16px |         1.6 |    400 |
| Small      |   14px |    14px |         1.5 |    400 |
| Label/data |   12px |    12px |        1.35 |    500 |

Short headings may use `text-wrap: balance`; prose is limited to 68 characters. Labels are concise, uppercase only for short telemetry labels, and use `0.06em` tracking. Never set body copy below 14px or use all-caps paragraphs.

## Spacing, grid, and shape

Base unit is 4px. Tokens: `1=4`, `2=8`, `3=12`, `4=16`, `5=20`, `6=24`, `8=32`, `10=40`, `12=48`, `16=64`, `24=96` pixels.

- Mobile gutter: 16px; tablet: 24px; desktop: 32px; wide: 48px.
- Content max width: 1600px; reading max width: 720px.
- Dashboard grid: 4 columns mobile, 8 tablet, 12 desktop, 16 wide.
- Grid gaps: 12px mobile, 16px tablet, 20px desktop.
- Panel padding: 16px mobile, 20px desktop; dense rows may use 12px vertically.
- Radii: 6px controls, 10px panels, 999px status pills. Avoid excessive pill-shaped containers.
- Border: 1px line; selected panels may use a 2px signal inset.
- Elevation: borders and surface contrast first; shadows only for floating layers.

Asymmetry belongs at page-composition level, not inside repeated data rows. Never use masonry for operational data. Prevent horizontal page scrolling; a wide data table may own a labeled horizontal scroller with a card/list alternative on mobile.

## Component contracts

### Buttons

- Minimum target 44×44 CSS px; 48px default height.
- Primary: signal background, cosmos text, one per screen region.
- Secondary: transparent surface, line border, text foreground.
- Quiet: text/icon only with visible hover and focus surface.
- Destructive: critical color and explicit verb.
- Loading retains width, disables repeat submission, and announces progress.
- Hover/pressed changes color or elevation without moving layout bounds.

### Panels and cards

Panels group information and are not automatically clickable. Interactive cards use a real link/button, include a directional affordance, and receive a whole-card focus outline. Default panels have surface background and subtle line; hero panels use surface-raised. Do not give every panel equal prominence.

### Data strip

The reusable fact row contains label, value, unit, evidence marker, optional trend, and source/freshness affordance. Value precedes decoration. Long values wrap; IDs use `overflow-wrap:anywhere`. A changed live value updates one atomic status phrase without moving focus.

### Source and freshness badge

Always render source name plus freshness text, never an unexplained colored dot. Expanded detail includes source link, observed timestamp, fetched timestamp, adapter version, and stale/error explanation. The compact control is a button with `aria-expanded`.

### Filters and search

Search is a labeled native search field. Filters wrap before truncating; active values remain visible and removable by keyboard. Mobile filters open in a dismissible sheet with Apply and Clear actions; desktop filters may use a stable side panel. URL query parameters preserve state for deep links and browser back.

### Tables and lists

Headers remain visible but cannot obscure focus. Sort controls are buttons with `aria-sort`. Rows are at least 44px high. Mobile prioritizes a card list; never squeeze six columns into 375px. Virtualize only after 50 rows and preserve screen-reader access.

### Forms and planner steps

Every input has a visible label, persistent helper text for scientific parameters, units beside values, and inline errors connected with `aria-describedby`. Validate on blur and submit, not on each keystroke. Multi-error submit focuses a linked error summary. Long planning flows autosave locally, show step progress, allow Back, and confirm before discarding meaningful input.

## State system

| State         | Required treatment                                                   |
| ------------- | -------------------------------------------------------------------- |
| Loading <1s   | Preserve layout; no flashing spinner                                 |
| Loading >1s   | Content-shaped skeleton, status text, no fake values                 |
| Empty         | Explain why, suggest one relevant action, preserve filters           |
| Stale         | Keep last-known-good data, caution label, timestamps, Refresh action |
| Partial       | Render available sections and identify missing providers inline      |
| Unavailable   | Plain-language cause if known, Retry, and methodology link           |
| Invalid input | Inline cause and repair instruction; error summary when multiple     |
| Success       | Brief non-blocking status; do not steal focus                        |

Never replace a failed chart with empty axes. Toasts are supplementary, `aria-live="polite"`, dismissible, and never the only place an error appears.

## Charts and spatial visualization

- Trend: line chart; actual values solid, estimate dashed, uncertainty a named band.
- Comparison: sorted bars up to 15 categories, then table/search.
- Approaches/orbits: spatial view plus synchronized event list and fact table.
- Every chart has a visible title, units, legend/direct labels, concise insight summary, and accessible data table.
- Series differ by line style/marker as well as color. Gridlines use line-subtle; data marks maintain 3:1.
- Tooltips work on pointer, focus, and tap. Zoom has `+`, `−`, and Reset controls; streaming views have Pause.
- Use SVG below 1,000 points; aggregate/downsample beyond it. Heavy Canvas/WebGL loads only when its panel enters the viewport.

3D is progressive enhancement. Before loading WebGL, render the title, current facts, event list, and a static 2D orbital schematic. Detect unsupported WebGL or rendering failure and keep the 2D mode fully operable. Provide a persistent “2D / 3D” control, keyboard alternatives to drag/zoom, Reset view, and an explanation of scale. Compress models/textures and set a strict asset budget. Reduced-motion mode disables auto-rotation and camera fly-throughs.

## Motion and audio

Motion tokens:

- `instant`: 80ms for press feedback;
- `fast`: 140ms for color/state changes;
- `base`: 220ms for disclosure and small spatial changes;
- `slow`: 360ms for one signature view transition.

Use deceleration on enter and acceleration on exit. Animate opacity and transform only. Data tables do not stagger or overshoot. At most two elements animate on initial view. Animations are interruptible and state correctness never waits for `animationend`.

Under `prefers-reduced-motion: reduce`, remove parallax, auto-rotation, count-up effects, animated paths, and large translations; render the final state immediately. Retain short color/focus feedback.

Audio is off by default, controlled by a labeled global toggle, and never communicates unique information. No typing loops, warning sirens, or autoplay. If enabled, sounds are short, infrequent, volume-controlled, and paired with visible status. Respect the setting across sessions.

## Accessibility and responsive acceptance

- WCAG 2.2 AA target; text 4.5:1, large text/non-text UI 3:1.
- Visible 2px focus ring with 2px offset and at least 3:1 state contrast.
- Logical DOM/tab order matches visual order. No positive `tabindex`.
- Sticky UI uses `scroll-padding` and never fully obscures focus.
- Icon-only controls have accessible names; decorative Phosphor icons are hidden.
- Drag, hover, color, animation, audio, or 3D is never the only path.
- Native controls and semantic HTML precede ARIA/custom widgets.
- Zoom remains enabled and content tolerates 200% text zoom.
- Required verification widths: 375, 768, 1024, and 1440px; also 320px and mobile landscape smoke checks.
- No horizontal page scroll, clipped focus, hidden content under fixed navigation, or primary pointer target below 44×44px.

## Iconography and imagery

Use Phosphor outline icons at regular weight. Sizes: 16px inline, 20px controls, 24px primary navigation, 32px feature illustration. Filled icons are reserved for the active navigation state. No emoji icons, mixed icon families, invented agency seals, or decorative rockets everywhere.

Imagery is sparse: physically plausible Earth/space imagery, original schematics, or properly attributed provider media. Prefer data-driven visuals. Avoid generic astronaut stock photography, purple SaaS blobs, fake stars behind every panel, and unlicensed mission photography.

## Implementation anti-patterns

- No official NASA/SpaceX lookalike branding or “mission control certified” claims.
- No raw provider payloads in UI components.
- No hardcoded colors, spacing, arbitrary z-index values, or one-off animation durations.
- No glassmorphism blur as decoration, gradients, glowing body text, scanline overlays, or cyberpunk glitch.
- No placeholder-only labels, color-only statuses, hover-only actions, or clickable `div` elements.
- No mandatory WebGL, autoplay media/audio, scroll-jacking, or blocking intro sequence.
- No “real time” label unless the source cadence supports it; use exact freshness language.

## Quality checklist

Before a UI issue closes, verify semantic landmarks and headings, keyboard-only operation, focus visibility, source/freshness treatment, all state variants, reduced motion, 2D fallback where relevant, 200% zoom, the four required widths, touch targets, contrast, and a chart/table alternative. Record exceptions in Beads rather than making an undocumented local design decision.
