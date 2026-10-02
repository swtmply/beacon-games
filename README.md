# Beacon Games

A small, offline-first game catalog built with Expo SDK 57 and Expo Router. Sudoku is the first game, with a shared daily puzzle and 24 adventure levels that unlock in order.

Puzzles and solutions ship with the app. The daily puzzle uses the device's calendar date, so friends on the same date get the same board without a server. Adventure difficulty increases by measured solving effort; the four chapters run from beginner to hard.

Progress, pencil notes, time, hints, and completed levels are saved locally with AsyncStorage. Buttons and sheets use native `@expo/ui` components; the Sudoku grid uses React Native pressable cells. There are no accounts or online services.

## Run locally

```sh
bun install
bunx expo start --go
```

Open in an SDK 57-compatible Expo Go, or press `a` for a running Android emulator. For web, use `bun run web`.

An existing development build needs rebuilding after the AsyncStorage dependency was added. Configure a development profile with EAS before building a custom client. A packaged build includes the JavaScript and puzzles for offline play; Expo Go still uses Metro while developing.

## Validate

```sh
bunx expo lint
bunx tsc --noEmit
bun scripts/build-sudoku.ts
bunx expo export --platform web
```

The puzzle script verifies unique solutions, increasing adventure scores, and repeatable daily boards. Run it with `--generate` only when intentionally replacing the bundled puzzle pack; changing that pack also requires a new save-data version.

Routes live in `src/app/`, game components in `src/components/`, persistence in `src/hooks/use-games.tsx`, and puzzle rules in `src/utils/sudoku.ts`.
