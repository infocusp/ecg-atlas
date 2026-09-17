# ECG Atlas

A standalone educational ECG explorer, using Plethscape's BodyParts3D anatomy assets and a small attributed PhysioNet signal library.

**Educational simulation only. Not a medical device or a tool for diagnosis, screening, treatment, or validating electrode placement.** An absent feature in a simulated lead does not rule out disease.

## Features

- Free electrode placement and two-electrode, three-electrode, standard 12-lead, and wearable presets.
- Recorded normal, AFib, and VF excerpts, plus explicitly authored ST-elevation/depression and rhythm/conduction teaching examples.
- Shared-scale ECG plots, placement comparisons, pause/scrub controls, and a recorded-signal library.
- Synchronized electrical activation, illustrative heart contraction, and arterial blood-flow animation.

## Credits and licensing

ECG Atlas is an educational ECG explorer inspired by [Plethscape](https://github.com/sontakey/plethscape), by Sameer Sontakey. It reuses Plethscape's processed anatomical models and vessel metadata, with original-source attribution retained. The ECG application, signal model, and educational interactions were developed separately; this is not an official Plethscape release or an endorsement by its contributors.

Original application code is available under the [MIT license](LICENSE). **Assets and recordings are licensed separately:** anatomy under CC BY 4.0, the Draco decoder under Apache 2.0, and ECG excerpts under CC BY 4.0 or ODC-By 1.0. See the [third-party attribution and reuse inventory](public/ATTRIBUTION.md), [Plethscape notice](public/PLETHSCAPE-LICENSE.txt), and [signal manifest](public/signals/manifest.json). Do not assume the application license covers all bundled files.

## Run

Use Node 24 LTS (also supports Node 22.12+). No backend, API key, or dataset download is required for the bundled examples.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Build with `npm run build`; inspect the production build with `npm run preview`.

## Deploy

This project is a static single-page app (no backend, no server-side rendering) and is set up for zero-config deployment on [Vercel](https://vercel.com): import the repository, keep the auto-detected Vite framework preset (build command `npm run build`, output directory `dist`), and deploy. `vercel.json` mirrors the app's security headers and applies long-lived immutable caching to the content-hashed `assets/` bundle; mutable files (HTML, models, signals) are left to Vercel's default revalidating cache.

To deploy elsewhere, upload the generated `dist/` directory to any static host at the domain root. For a subdirectory deployment, configure Vite's base and audit runtime asset URLs first.

The interface requests fonts from Google Fonts; system fallbacks are supplied. ECG data and anatomy are served locally. Remove the font import in `src/styles.css` for a deployment without that external request.

## Tests and contributing

The public notice identifies the app as educational and not clinically validated. **Start guided lesson** begins a slow normal-heart close-up; **Explain this ECG** opens the causal lesson. A source badge next to each trace distinguishes recorded ECG from teaching reconstructions. Visitors who prefer reduced motion start with playback paused. Credits and limitations are available from the notice on every screen size.

```sh
npm test
npm run build
npx playwright install chromium
# In a second terminal, with npm run dev running:
npm run test:browser
npm run test:motion
```

Browser checks use Playwright Chromium by default. Set `BROWSER_CHANNEL=chrome` to use installed Google Chrome, or `ECG_BASE_URL` to test another local server. Screenshots are written to ignored `test-results/`. Motion checks depend on machine/GPU performance and are a local diagnostic, not a CI speed guarantee.

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture, changes to physiology, and the release checklist. GitHub Actions checks the unit tests, production build, and functional browser tests.

Retain attribution and the educational notice when sharing screenshots or video. The initial anatomy includes roughly 10 MB of model assets, so first-load time depends on connection and hosting; local browser checks are not a mobile-network performance certification.

<!-- TODO: attach a demo video/GIF here once recorded. -->

Select a pad and click **Place on body**, or drag a pad directly. The focused 3D canvas also supports arrow keys to move the selected pad across the visible skin; Shift increases the step. Orbit to reach the back. Pause and scrub to inspect the synchronized electrical illustration.

## Signal provenance and transformations

`public/signals/manifest.json` records dataset IDs, licences, source URLs, excerpt offsets, channel names, and source-file SHA-256 hashes. `scripts/import-signals.mjs` reproducibly downloads and decodes the selected WFDB recordings. It handles PTB's separate `.dat` and `.xyz` channel groups, 16-bit samples, and CU's packed 212 format. Samples are averaged to 250 Hz; the Library displays these extracted samples without the Explorer's baseline removal or spatial interpolation. Full raw files remain in ignored `.data-cache/`.

- Healthy control: PTB Diagnostic ECG Database; standard leads and Frank XYZ. ODC-By 1.0.
- Myocardial infarction: PTB `patient001/s0010_re`, recorded inferolateral MI. Included for reference, not automatically labelled an acute STEMI morphology. ODC-By 1.0.
- AFib: PTB-XL `records500/00000/00351_hr`, AFIB annotation confidence 100. CC BY 4.0.
- VF: CU `cu01`, excerpt starts at 216 seconds after the rhythm annotation `(VF` at sample 53541 (250 Hz). This dataset cautions that VF onset annotations are approximate. ODC-By 1.0.

Sources: https://physionet.org/content/ptbdb/1.0.0/ ; https://physionet.org/content/ptb-xl/1.0.3/ ; https://physionet.org/content/cudb/1.0.0/

Please cite the original dataset publications on those source pages and PhysioNet when reusing the records. PTB: Bousseljot, Kreiseler and Schnabel (1995). PTB-XL: Wagner et al., Scientific Data (2020), doi:10.1038/s41597-020-0495-6. CU: Nolle et al., Computers in Cardiology 13:515–518 (1986).

## What free placement means

The source datasets describe acquisition configurations, not patient-specific electrode XYZ coordinates. The app assigns illustrative standard positions on a different reference anatomy. It derives a consistent set of electrode potentials from recorded I, II, V1–V6, then interpolates those potentials using normalized inverse-distance weights. Identical coordinates therefore cancel exactly, swapping two electrodes reverses polarity, and limb-lead algebra holds everywhere.

This is not a validated volume-conductor model. Off-preset amplitudes and disease visibility are illustrative; they cannot establish diagnostic sensitivity. A single dipole also cannot reproduce all regional chest-lead morphology, so the recorded precordial channels are retained as separate spatial anchors. The Frank XYZ channels inform the vector animation, not an asserted exact reconstruction of every lead.

Normal/AFib: a constant median offset per channel is removed, complete recorded beats are looped, and time is rescaled to the selected rate. Changing heart rate resizes recorded timing, not a full physiological response. AFib irregularity is preserved from the selected recording. Anterior/inferior teaching examples add authored regional ST offsets to the normal source; they are labelled transformations, not patient diagnoses. VF spatial views use delayed copies of one recorded monitor channel; its recording placement is unspecified and arbitrary spatial extrapolation is illustrative. The original VF channel remains in the Library. No heart rate is assigned to VF.

P/QRS/T stage labels and added conduction paths are schematic. VF shows chaotic activity; AFib does not claim organised atrial activation. Heart geometry is illustrative and does not contain source-derived conduction nodes.

Plots use a fixed 500 Hz simulation-time grid, a bounded sample cache, and fractional-pixel scrolling on animation frames. Historical samples retain their amplitudes as they move across the screen; display motion does not filter or smooth the recorded signal. Rendering skips offscreen lead rows. `scripts/check-motion.mjs` measures single/12-lead frame cadence and verifies pixel stability while paused.

## Heart-to-ECG lessons

Use **Explain this pattern** to open the synchronized teaching panel, **Slow & focus** to watch the heart closely, and **Step +0.1 s** to pause and advance both animations and ECG together. The diagram separates atria, AV conduction, and ventricles; coloured plot bands identify authored timing. These are teaching labels, not an ECG interpretation algorithm.

The additional PVC, 2:1 atrial flutter, first-degree AV block, Mobitz I, Mobitz II, complete block and monomorphic VT lessons use **authored event schedules with recorded-normal waveform components**, not newly acquired disease recordings. P/QRS/T components from the PTB normal example are endpoint-detrended and recombined. Ectopic QRS complexes are widened and polarity-reversed; flutter waves are authored. This is a limited illustrative morphology model, not a validated reconstruction of those diseases. The library retains only the four original recorded excerpts.

Fixed examples: PR 280 ms in first-degree block; 160/230/300 ms then blocked in Mobitz I; 180 ms with a dropped beat in Mobitz II; independent atria 75/min and ventricular escape 40/min in complete block; flutter 300/min with 2:1 conduction; VT 180/min. The rate slider is disabled for these patterns so playback slowing cannot silently change diagnostic intervals. ECG potentials still share the same spatial field and lead algebra. ST depression adds an explicitly authored spatial ST offset, like the existing anterior/inferior elevation examples. ST changes are not specific diagnoses.

Teaching references: [ACC/AHA/HRS conduction guideline](https://www.jacc.org/doi/10.1016/j.jacc.2018.10.043), [ESC acute coronary syndrome guideline](https://academic.oup.com/eurheartj/article/44/38/3720/7243210), and linked Merck Manual explanations in each lesson. Medical text is paraphrased; no reference illustrations were copied. Clinical expert review is still needed before treating these lessons as a validated curriculum. Mechanics do not estimate stroke volume, blood pressure, lesion extent, or whether VT has a pulse.

### Blood-flow illustration

The blood overlay reuses 18 arterial centre-line segments in Plethscape's BodyParts3D metadata. Red particles travel on systemic arterial segments; blue particles travel on the pulmonary trunk. Source gaps are preserved. Veins are visible as anatomical context; the animated particles are not a complete closed circulation. Position, speed, cardiac squeezing, and the delay between electrical activation and ejection are teaching illustrations. Both animations and the chart use the same recorded R-peak clock, including AF irregularity. VF disables effective pumping. STEMI examples make no claim about ejection fraction. The heart-to-electrode dashed lines have been removed; electrodes sense potential differences, not blood flow. The cardiac-cycle explanation follows [OpenStax](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-3-cardiac-cycle).

## Assets

Plethscape reference: https://github.com/sontakey/plethscape at 83fcf0ca1d8619afc4e802e1e88d180de75c1578. Neutral skin and internal atlas only; restricted Renderpeople heads and Sensor Bio brand assets are excluded. See `public/ATTRIBUTION.md`, `public/PLETHSCAPE-LICENSE.txt`, and `public/models/draco/LICENSE`.
