# Contributing to ECG Atlas

Use Node 24 and `npm ci`. Run `npm test`, `npm run build`, and the browser checks documented in the README before submitting a pull request. Include a description, test results, and screenshots for visual changes. Never include identifiable patient data, credentials, or restricted models.

## Code map

- `src/ecg.ts`: electrode potentials, lead derivation, source playback, and teaching transformations.
- `src/traceStream.ts` and `src/Traces.tsx`: stable sample caching and canvas plotting.
- `src/cardiacCycle.ts`: schematic electrical/mechanical timing.
- `src/Anatomy.tsx` and `src/BloodFlow.ts`: anatomy, placement, and animated arterial segments.
- `src/App.tsx` and `src/styles.css`: application controls and layout.
- `scripts/import-signals.mjs`: reproducible signal extraction; `public/signals/manifest.json` retains provenance.

## Scientific and data changes

Provide a primary source for physiological claims. Distinguish recorded data, transformations, and illustrative models in both UI and documentation. Add tests for changes to lead algebra, coincident electrode cancellation, polarity, timing, or waveform rendering. Do not turn simulated disease visibility into a claim of clinical sensitivity.

Adding data or assets requires checking redistribution terms, retaining attribution and license notices, recording source/version and transformations, and updating `public/ATTRIBUTION.md`. `npm run signals:import` downloads source recordings into ignored `.data-cache/` and regenerates the bundled excerpts; review the manifest and sample changes before committing. Do not include the full cache.

Contributions to original application code are under the project's MIT license; separately licensed third-party material must remain identified. Keep upstream copyright notices intact.

## Release checklist

- Run unit tests, production build, functional browser checks, and local motion checks.
- Review the staged diff for secrets, personal paths, patient identifiers, generated output, and restricted assets. Do not use real patient uploads as test fixtures.
- Confirm README limitations, third-party attribution, and dataset manifest match the release.
- Check desktop/mobile layout, free placement, same-location cancellation, all conditions, signal library, and pause/scrub behavior.
- After choosing the public repository URL, add repository/homepage metadata to `package.json` and a demo link if deployed.
- Publish only source, required licensed assets/excerpts, and the lockfile; omit `node_modules/`, `dist/`, `.data-cache/`, and test artifacts.

This project has no formal clinical validation or guaranteed security-response service. Report ordinary bugs through repository issues; do not post credentials or private medical information.
