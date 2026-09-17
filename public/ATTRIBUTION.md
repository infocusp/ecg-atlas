# ECG Atlas anatomy attribution

ECG Atlas is inspired by [Plethscape](https://github.com/sontakey/plethscape), by Sameer Sontakey. It reuses processed anatomical assets and vessel metadata from commit `83fcf0ca1d8619afc4e802e1e88d180de75c1578`. The ECG application and educational simulation were developed separately. Plethscape's [MIT copyright and permission notice](PLETHSCAPE-LICENSE.txt) is retained. This project is not endorsed by the upstream authors or data providers.

## Bundled material inventory

| Files | Source | License |
| --- | --- | --- |
| `models/bodyparts-atlas.glb` | Plethscape-processed BodyParts3D and HRA anatomy | CC BY 4.0; credits below |
| `models/neutral-skin.glb` | Plethscape-processed BodyParts3D skin | CC BY 4.0 |
| `models/bodyparts-atlas-metadata.json` | Plethscape structure classification and vessel centre-lines | Retain Plethscape/Human Atlas MIT notices and underlying anatomy CC BY 4.0 attribution |
| `models/draco/*` | Google Draco, distributed with three.js | Apache 2.0 |
| `signals/normal.json`, `signals/mi-recording.json` | PTB Diagnostic ECG Database 1.0.0 | ODC-By 1.0 |
| `signals/afib.json` | PTB-XL 1.0.3 | CC BY 4.0 |
| `signals/vfib.json` | CU Ventricular Tachyarrhythmia Database 1.0.0 | ODC-By 1.0 |

The listed anatomy models, metadata, and decoder files are copied unchanged from the reference commit. ECG Atlas applies its own runtime materials, placement interactions, and illustrative electrical/mechanical animation. Upstream anatomical adaptations are described below. Dependencies retain their package licenses; the root MIT license covers original application code, not all bundled material.

## BodyParts3D

BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.

- Data: BodyParts3D release 4.0, `isa_BP3D_4.0_obj_99.zip`.
- Source: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
- Current license notice: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- Terms: https://creativecommons.org/licenses/by/4.0/
- Adaptations: selected structures, a common coordinate transformation, browser optimization, curated system groups, tissue materials, cutaway presentation and illustrative animation.

Lung geometry: Kristen Browne and Heidi Schlehlein (2024), **3D Reference Organ for Lung, Male v1.4**, Human Reference Atlas / HuBMAP, CC BY 4.0.

- DOI: https://doi.org/10.48539/HBM532.KLZD.394
- Source: https://lod.humanatlas.io/ref-organ/lung-male/v1.4/
- Terms: https://creativecommons.org/licenses/by/4.0/
- Adaptations: lobar geometry selected, positioned with BodyParts3D, optimized, shaded and animated. This is a separate Visible Human Male reference, not the same individual as BodyParts3D.

Anatomical geometry and simulated physiology have separate provenance. ECG Atlas adds educational ECG transformations and schematic flow and contraction; these are not measurements from the anatomy subjects.

Human Atlas (https://github.com/ashemag/human-atlas) supplied the user-requested explorer reference and display-system classification reference. Its anatomy has the BodyParts3D license above; its original classification material has the following license.

## Human Atlas MIT License

Copyright (c) 2026 ashemag

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Neutral presentation skin

`models/neutral-skin.glb` is adapted from BodyParts3D FJ2810 under the same CC BY 4.0 license. Upstream processing changes the hand pose, reconstructs the forearm surface, removes external reproductive contours, and remeshes the skin for interactive display. The [upstream build script](https://github.com/sontakey/plethscape/blob/83fcf0ca1d8619afc4e802e1e88d180de75c1578/scripts/build_neutral_skin.py) is not bundled here.

## Excluded upstream materials

Renderpeople-derived scanned heads and Sensor Bio logos/brand assets are not bundled. No rights to these upstream materials or trademarks are granted by this project. Do not add them on the assumption that Plethscape's MIT license covers them.

## Draco decoder

`public/models/draco/draco_decoder.js`, `draco_decoder.wasm`, and `draco_wasm_wrapper.js` are byte-for-byte copies of the glTF decoder files distributed with three.js 0.186.0. They are Google Draco software under the Apache License 2.0, not Plethscape MIT code. Source: https://github.com/google/draco. The complete license text is distributed at [`public/models/draco/LICENSE`](models/draco/LICENSE).

## Recorded ECG excerpts

This application contains information from the [PTB Diagnostic ECG Database](https://physionet.org/content/ptbdb/1.0.0/) and [CU Ventricular Tachyarrhythmia Database](https://physionet.org/content/cudb/1.0.0/), made available on PhysioNet under the [Open Data Commons Attribution License 1.0](https://opendatacommons.org/licenses/by/1-0/). It also contains excerpts from [PTB-XL](https://physionet.org/content/ptb-xl/1.0.3/), under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

- PTB: Bousseljot R, Kreiseler D, Schnabel A (1995), *Nutzung der EKG-Signaldatenbank CARDIODAT der PTB über das Internet*, Biomedizinische Technik 40 (Suppl. 1), p. 317.
- PTB-XL: Wagner P et al. (2020), *PTB-XL, a large publicly available electrocardiography dataset*, Scientific Data 7, 154. https://doi.org/10.1038/s41597-020-0495-6
- CU: Nolle FM, Badura FK, Catlett JM, Bowser RW, Sketch MH (1986), *CREI-GARD, a new concept in computerized arrhythmia monitoring systems*, Computers in Cardiology 13:515–518.
- PhysioNet: Goldberger AL et al. (2000), *PhysioBank, PhysioToolkit, and PhysioNet: Components of a New Research Resource for Complex Physiologic Signals*, Circulation 101(23):e215–e220. https://doi.org/10.1161/01.CIR.101.23.e215

ECG Atlas extracts short windows and averages samples to 250 Hz. The Explorer additionally baseline-centres, loops/time-rescales, and spatially interpolates signals; ST elevation/depression offsets are authored transformations. PVC, flutter, AV-block, and VT teaching examples recombine endpoint-detrended normal-recording components with authored timing, widened/polarity-changed ectopic complexes, and authored flutter waves. These are not additional disease recordings. The signal library shows extracted recorded channels. See the [manifest](signals/manifest.json) for exact records, excerpt boundaries, source-file hashes, and acquisition context, and the [README](../README.md) for limitations. These modifications are not endorsed by the data providers.
