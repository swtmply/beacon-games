# Beacon Games icons

Upload `google-play-icon.png` to the app icon field in Google Play Console. It is a full square, opaque 512 × 512, 32-bit RGBA PNG with no baked outer corner rounding or shadow, below the 1024 KB limit.

App assets configured in `app.json`:

- `../images/beacon-icon.png`: 1024 × 1024 app icon.
- `../images/beacon-android-foreground.png`: 1024 × 1024 Android adaptive foreground, with extra margin for launcher masks and the same navy background as the background layer.
- `../images/beacon-favicon.png`: 48 × 48 web favicon. Expo generates the served `.ico` during web export.

Rebuild the native app to apply launcher icon changes. The existing generated `android/` resources were not edited. This set does not include a custom monochrome icon, a feature graphic, or store screenshots.

Requirements: [Google Play icon specifications](https://developer.android.com/distribute/google-play/resources/icon-design-specifications), [Android adaptive icons](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive), and [Expo SDK 57 app configuration](https://docs.expo.dev/versions/v57.0.0/config/app/).

## Generation

Created with the built-in `image_gen` tool, then resized and encoded as PNG using the project's existing Jimp dependency. The app, store icon, and favicon use the same generated artwork. Transparent edit attempts were discarded.

Final artwork prompt:

```text
Use case: logo-brand
Asset type: square app icon for Beacon Games, an offline puzzle game catalog starting with Sudoku; also must read clearly as a small web favicon.
Primary request: Create one polished minimal geometric beacon/lighthouse brand mark built from chunky puzzle-like blocks. A compact ivory-white lighthouse tower with two broad blue horizontal divisions suggesting stacked game tiles, topped by a warm golden square light, and two short bold electric-blue light beams extending diagonally outward. Unmistakable simple beacon silhouette, visually balanced, friendly and thoughtful.
Scene/backdrop: Full-bleed solid deep navy #0B1224 square background. No inset badge or container.
Style/medium: Crisp flat graphic logo with vector-like edges, tasteful professional mobile game branding, only a handful of bold solid shapes. No thin details.
Composition/framing: One centered mark occupying about 65% of the square, ample clear margin on all sides, front-facing symmetrical design. The tower and beams form one coherent compact silhouette.
Color palette: deep navy #0B1224 background, ivory #EFF4FF tower, electric blue #78A7FF beams/details, warm gold #F4C568 beacon light.
Text: none.
Constraints: single square icon artwork only, square canvas edge to edge opaque navy, no pre-rounded outer corners, no external shadow, no mockup, no border, no typography, no numbers, no watermark, no extra symbols, no fine texture or glow or gradients. Should be recognizable at 16px.
```
