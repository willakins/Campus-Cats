# Campus Cats design system

The Campus Field Guide interface is warm, colorful, and operationally clear. Cream
paper-like canvases and subtle Georgia Tech navy/gold cues establish continuity, while
small feature accents distinguish sightings, announcements, catalog cats, feeding
stations, and administration.

## Principles

- Use semantic theme tokens; screens and components do not contain raw colors.
- Let cat photography and content lead. Accent colors belong on icons, chips, status
  labels, and narrow card edges rather than large saturated backgrounds.
- Pair every status color with explicit text and an icon.
- Preserve system font scaling, a minimum 44-by-44 point target, and WCAG AA contrast.
- Follow the device light/dark appearance and reduce nonessential motion when requested.

## Foundations

The typed themes in `theme/` define the approved palettes, 4-point spacing scale,
typography, radii, elevation, responsive widths, and motion durations. React Native
Paper receives the same semantic colors so its native controls and feedback surfaces
remain visually consistent.

The existing hand-drawn Campus Cats logo remains the heritage mark. The redesign does
not add an official Georgia Tech seal or wording that implies institutional endorsement.

## Semantic palette

| Purpose             | Light appearance | Dark appearance |
| ------------------- | ---------------- | --------------- |
| Canvas              | Cream            | Ink             |
| Surface             | White            | Slate           |
| Primary text/action | Navy             | Gold            |
| Sightings           | Coral            | Coral           |
| Announcements       | Gold             | Gold            |
| Cat catalog         | Teal             | Teal            |
| Feeding stations    | Green            | Green           |
| Administration      | Violet           | Violet          |

Use the named values exposed by `useAppTheme`; feature code must not copy palette
literals. `npm run ui:check` scans all files under `app/`, `components/`, and `forms/`
and rejects raw colors. The typed palette and Google-compatible map style are the only
definitions allowed to contain color literals.

## Public presentation APIs

- `AppThemeProvider`, `useAppTheme`, and `useThemedStyles` resolve the system light or
  dark appearance and provide the matching React Native Paper theme.
- `Screen` owns safe areas, responsive content width, scrolling, keyboard avoidance,
  and sticky footers. `AppHeader` owns page identity, back navigation, and authorized
  actions.
- `AppText`, `Card`, and `ListRow` establish consistent information hierarchy.
- `Button`, `IconButton`, `Chip`, `SegmentedControl`, and `StatusPill` provide named,
  accessible actions and states.
- `FormField`, `FormSection`, the controls in `components/forms`, and `MediaPicker`
  keep labels persistent and photo promotion/removal explicit.
- `Skeleton`, `EmptyState`, `ErrorState`, `AccessDeniedState`, and `FeedbackBanner`
  make asynchronous and permission states visible and screen-reader friendly.

Presentation components accept labels, values, callbacks, and semantic variants. They
do not accept Firebase values or own feature mutations. Native confirmation dialogs
remain the boundary for destructive and role-changing actions.

## Responsive and accessible behavior

- System text supports scaling through 200 percent. Controls use fixed semantic type
  roles rather than viewport-derived font sizes and reflow instead of clipping.
- Catalog grids use one column below 360 points or at large text scales, two on normal
  phones, and three at tablet/web widths of 768 points and above.
- Interactive controls have at least a 44-by-44 point target. Icon-only controls
  require an accessibility label, feedback uses live regions, and statuses always
  include text plus an icon.
- Press feedback uses the 140 ms motion token; content transitions use 220 ms.
  `AppThemeProvider` follows the platform Reduce Motion setting and removes
  nonessential button transforms when it is enabled.
- Destructive actions are not identified by color alone and retain native
  confirmation dialogs. Required light/dark text pairs are covered by automated WCAG
  AA contrast tests.
