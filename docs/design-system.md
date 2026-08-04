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
