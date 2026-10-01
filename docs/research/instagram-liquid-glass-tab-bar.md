# Instagram-style Liquid Glass tab bar

Research scope: identify the current Instagram mobile bottom-navigation treatment and
translate it into implementable visual guidance for Campus Cats. Sources are current
first-party Instagram/Apple imagery and official Apple and Expo documentation, checked
September 29, 2026.

## What the current Instagram reference shows

Instagram's current official iPhone App Store artwork shows a bottom navigation bar
floating over full-bleed Reel content. It is a single wide, translucent, strongly rounded
platter with five evenly spaced icon-only destinations. The selected Reels destination
adds a smaller translucent rounded highlight behind its icon; its glyph is filled, while
the other destinations use outline glyphs. The monochrome icons adapt to the dark video
behind them, and notification state is conveyed separately with a small red dot. See the
[Instagram App Store listing](https://apps.apple.com/us/app/instagram/id389801252) and
its [first official iPhone screenshot](https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/f0/66/9b/f0669b33-9a09-8c6c-513a-3213b92cb1cc/1_iOS_6.5.jpg/600x1300bb.webp).

Measurements from that screenshot are estimates, not published Instagram design tokens:

- The outer platter spans about 87% of the visible phone width, or roughly 16–24 points
  of horizontal inset on a typical phone.
- Its visible height is about 64 points with a capsule radius near half the height.
- Each icon is approximately 24–28 points, centered in an equal-width target.
- The selected highlight is approximately 52–56 points wide/high and uses the same soft,
  fully rounded geometry as the outer platter.
- There is no top divider, rectangular background, shadow-heavy card, or visible label.

The screenshot establishes appearance, but does not reveal Instagram's internal UI
framework or prove that it uses Apple's native glass APIs.

## Liquid Glass constraints

Apple describes Liquid Glass as a separate functional layer for controls and navigation
that floats above content and allows content to peek through. It specifically identifies
tab bars as a suitable use, and advises against using glass in the content layer or
stacking glass on glass. See Apple's [Materials guidance](https://developer.apple.com/design/human-interface-guidelines/materials)
and [Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/).

For iPhone tab bars, Apple says the bar floats above bottom content and its items rest on
a Liquid Glass background. Standard tab bars can also minimize on downward scroll, though
that behavior is optional and should not be conflated with the visual redesign. See the
[Tab bars guidance](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
and [Build a UIKit app with the new design](https://developer.apple.com/videos/play/wwdc2025/284/).

Apple's regular glass variant is the appropriate default because it adapts for legibility
over arbitrary content. The clear variant is intended only for media-rich backgrounds
with a compatible dimming layer and bold foreground content. Apple also notes that native
glass adapts to Reduce Transparency, Increase Contrast, and Reduce Motion settings.

## Actionable Campus Cats specification

1. Use one floating outer capsule with 16-point side margins, an 8-point visual gap above
   the bottom safe area, and a 64-point content height. Remove the current edge-to-edge
   rectangle and top border. Let map/list content render behind it, but give scrollable
   content enough bottom inset that the last item is never obscured.
2. Use native regular Liquid Glass on iOS 26 when available. The repo already depends on
   `expo-glass-effect` 57, whose `GlassView` wraps native `UIVisualEffectView`, supports
   regular/clear styles and interactive feedback, and falls back to a regular `View` on
   unsupported systems. Guard native use with the documented availability checks. See
   [Expo GlassEffect](https://docs.expo.dev/versions/latest/sdk/glass-effect/).
3. Give Android, web, and older iOS an intentionally designed fallback: a highly
   translucent theme surface, subtle border, restrained elevation, and the same capsule
   geometry. Increase opacity when Reduce Transparency is enabled. Do not attempt to
   simulate refraction with stacked semi-transparent layers.
4. Keep five or fewer equal-width icon-only destinations. Preserve the existing explicit
   accessibility labels and at least 44-by-44-point touch targets even though visual labels
   are hidden.
5. Differentiate state in at least two ways: use outline Ionicons for inactive tabs and
   their filled counterparts for the active tab; also place the active icon in a roughly
   52-point rounded translucent/tinted highlight. Use strong theme foreground contrast for
   active state and muted foreground contrast for inactive state. Do not rely on color
   alone.
6. Let the active highlight change position with the selected destination, and use native
   interactive glass feedback or the design system's short 140 ms press feedback. Disable
   nonessential transforms under Reduce Motion.
7. Keep the treatment theme-adaptive. Avoid a permanently light blur because the map,
   photos, light mode, and dark mode can all appear beneath the bar.

Expo Router also offers system-native tabs in SDK 57 through
`expo-router/unstable-native-tabs`; on iOS 26 these receive native Liquid Glass and support
outline/filled icon pairs. However, Expo distinguishes native tabs from custom tabs and
notes that native tabs have less visual customization. Since the Instagram-like selected
inner capsule is a specific requirement, the existing JavaScript tab navigator plus a
custom tab-bar background is the lower-risk implementation unless the project is willing
to accept the platform's exact native selection treatment. See Expo's
[Native tabs guide](https://docs.expo.dev/router/advanced/native-tabs/) and
[JavaScript tabs guide](https://docs.expo.dev/router/advanced/tabs/).
