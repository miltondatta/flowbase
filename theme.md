# Flowbase Cozy UI Theme

## Direction

Flowbase should feel fresh, cozy, modern, and clean. It is an operational productivity app, so the UI should prioritize scanability, compact controls, calm surfaces, and clear workspace structure instead of marketing-style hero sections.

## Color Palette

- App background: `#fbf7ef`, a warm off-white that stays bright rather than beige.
- Sidebar: `#fffdf8`, slightly lighter than the app background.
- Panel surface: `#ffffff` for primary panels and `#f7f2e8` for quiet secondary panels.
- Text: `#202a39` for primary copy, `#667085` for secondary copy, and `#9a8f82` for group labels.
- Borders: `#eadfce`, subtle and warm.
- Accents: mint `#68d8bd`, sky `#54a8ff`, coral `#ff8c67`, amber `#f4b942`, lavender `#9b8cff`.

## Typography

- Use system sans-serif typography for speed and native clarity.
- Dashboard headings should be compact, direct, and semibold.
- Sidebar labels use `13px`; group labels use `10px` uppercase with mild tracking.
- Do not scale font sizes with viewport width. Letter spacing should remain non-negative.

## Spacing And Shape

- Use an 8px spacing rhythm for controls and panels.
- Keep cards and panels at `8px` radius or less.
- Avoid nested cards. Use panels, rows, rails, and canvas-like sections instead.
- Shadows should be soft and low-contrast; borders should carry most structure.

## Sidebar Guidelines

- Group menu items under clear labels: Workbench, Create, Organize, System.
- Menu rows should be compact but comfortable at `36px` height.
- Every menu item uses a Lucide icon with a distinct accent color.
- Expanded sidebar shows logo, app name, group labels, row labels, and footer details.
- Collapsed sidebar shows icons only, preserves colorful icon recognition, and uses `title` labels for browser tooltips.

## Interaction

- Selected navigation uses a white surface, subtle shadow, and stronger text.
- Hover states should brighten the row without changing layout dimensions.
- Collapse/expand should animate width only and keep content stable.
