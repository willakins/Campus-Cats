# Campus Cats App Store previews

The four final PNGs in `../../assets/images/app_previews/` are portrait iPhone
screenshots at 1320 × 2868 pixels. They use opaque RGB color and are ordered as a
suggested App Store sequence:

1. Live sighting map — reporting and exploring sightings
2. Cat-alog — profiles, sightings, favorites, and recent activity
3. Feeding stations — stock status and known cats
4. Community hub — announcements, chat, events, surveys, votes, and donations

The interface artwork is rendered deterministically from `source/preview.html` using
the application's default app icon, Campus Field Guide colors, and shipped UI
patterns. The three cat photos in `source/cats/` are AI-generated supporting content
used only inside the catalog cards and map pins; they do not replace the product UI.
The live-map preview uses an Apple Maps capture centered on the Georgia Tech campus.
Interface icons use the same bundled Ionicons font and glyph names as the React Native
application.

## Generated photo prompts

- `goldie.png`: Candid documentary-style portrait of a friendly orange tabby
  community cat on a leafy university campus; square-friendly framing; soft golden
  daylight; no people, logos, text, watermark, UI, or extra animals.
- `mimi.png`: Candid documentary-style portrait of a calm black-and-white tuxedo
  community cat on campus stone steps; square-friendly framing; soft overcast
  daylight; no people, logos, text, watermark, UI, or extra animals.
- `alex.png`: Candid documentary-style portrait of a gentle gray tabby community cat
  beside a low brick campus wall; square-friendly framing; soft morning daylight;
  no people, logos, text, watermark, UI, or extra animals.

The photos were generated with the built-in image-generation tool. The final App
Store preview frames were rendered from HTML/CSS and captured through Chromium so
all interface text remains exact and legible.
