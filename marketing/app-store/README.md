# Campus Cats app previews

Eight portrait marketing previews are in `../../assets/images/app_previews/`.
Each PNG is 1320 × 2868 pixels, rendered at 3× from a 440 × 956 layout.

| Image                          | Focus                                                        |
| ------------------------------ | ------------------------------------------------------------ |
| `01-live-sighting-map.png`     | Sightings, age filters, map pins, and reporting              |
| `02-community-hub.png`         | Alerts, chat, events, surveys, votes, and donations          |
| `03-presidential-election.png` | Club president nominees and a private ballot                 |
| `04-feeding-stations.png`      | Stock status and known cats                                  |
| `05-cat-catalog.png`           | Search, sort, filters, favorites, and recent activity        |
| `06-cat-sighting-history.png`  | Cat information, mapped sightings, and a timeline            |
| `07-member-profile.png`        | Achievements, displayed titles, and contributed sightings    |
| `08-donation-setup.png`        | Finished donation page, club story, photo, and donate action |

[View the collection](preview-sheet.png). The repository README also links each
full-resolution image.

## Regenerate

Run from the repository root with Chromium installed:

```bash
bash marketing/app-store/render-previews.sh
```

The renderer uses a temporary Chromium profile, waits for local assets, and writes
all eight PNGs. To refresh the overview with ImageMagick installed:

```bash
magick montage assets/images/app_previews/*.png -thumbnail 440x956 -tile 4x2 -geometry +8+8 marketing/app-store/preview-sheet.png
```

## Artwork and product accuracy

These are **illustrative marketing compositions, not captures of the running native
app**. `source/preview.html` reproduces current UI patterns with fictional members,
election dates, reports, and club content. Each composition carries a demo-data
label. Native glass rendering varies by device; CSS blur and translucency approximate
that material in these previews.

The compositions use the app's default icon, Campus Field Guide colors, floating
glass navigation and controls, and bundled Ionicons glyphs. The map comes from the
existing Apple Maps capture of Georgia Tech; map attribution is retained. The
cat-history line joins discrete recorded locations: it does not represent continuous
GPS tracking or an inferred route. Achievements and titles use the definitions in
`core/domain/achievements.ts`.

The donation image shows the finished member-facing donation page with an external donation button. It makes no claims of
in-app payment processing, donation analytics, automatic outreach, or guaranteed
fundraising results. The election is an internal club presidential election.

The three existing AI-generated cat photos are supporting demo content, reused from
the earlier preview set. No new generated images were required. Jordan's profile
photo is a fictional member's chosen cat photo.

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
