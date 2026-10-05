# Third-Party Notices

This project includes content derived from third-party work, used under the terms of its original license.

## Platform Design Skills

The `skill/reference/ios.md` and `skill/reference/android.md` platform reference files are distilled from ehmo's `platform-design-skills` (Apple Human Interface Guidelines and Material Design 3 rules), rewritten in Impeccable's voice.

**Original work:** https://github.com/ehmo/platform-design-skills
**Original license:** MIT
**Author:** ehmo

## Impeccable source and Teal adaptations

Impeccable is by Paul Bakaus: https://github.com/pbakaus/impeccable
Bundled skill version: 4.3.1 (`skill-v4.3.1`, commit `cd12f8660e2dde57b9615c8a6b8ea674101f9cfc`).
License: Apache-2.0, reproduced in `LICENSE`.

Teal packaging changes `SKILL.md` to shorten its discovery description, require Manicure before styling boxed UI, and move the full command table and optional management commands into `reference/commands.md`. All original playbooks, agent templates, data, and scripts are retained. `reference/extract.md`, `reference/harden.md`, and `reference/optimize.md` have trailing whitespace normalized, with modification notices in each file. Platform binaries are not redistributed; the original launchers use engine version 0.1.5 and verify downloads against release checksums.

The MIT license for the platform design references is reproduced in `licenses/platform-design-skills-MIT.txt`.

## modern-screenshot

`scripts/modern-screenshot.umd.js` is the bundled browser capture library from https://github.com/qq15725/modern-screenshot by wxm, licensed under MIT. Its license is reproduced in `licenses/modern-screenshot-MIT.txt`.
