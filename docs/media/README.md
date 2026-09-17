# README media

- `ecg-atlas-banner.png`: AI-generated brand illustration; not a clinical diagram. See [the generation prompt](banner-prompt.md).
- `ecg-atlas-demo.mp4`: user-provided app recording, accelerated to 1.2×, resized to 1600 × 830, and encoded as H.264/yuv420p at 30 fps with fast-start playback. The source had no audio. Duration: 59.8 seconds. Original recording is not committed.
- `ecg-atlas-demo-preview.jpg`: frame extracted from the optimized demo at 55 seconds.

The recording depicts the application's attributed third-party anatomy and ECG material; the application's MIT license does not replace those source licenses. See [third-party attribution](../../public/ATTRIBUTION.md). Playback speed is for presentation, not physiological timing.

Media stays under `docs/`, outside Vite's `public/` directory, so it does not increase the deployed app payload.

## Recreate the optimized recording

Requires FFmpeg with libx264. Run from the repository root, replacing the input path:

```sh
ffmpeg -n -i /path/to/ECG.mov -map 0:v:0 \
  -vf 'setpts=(PTS-STARTPTS)/1.2,fps=30,scale=1600:-2:flags=lanczos' \
  -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p \
  -movflags +faststart -map_metadata -1 -an docs/media/ecg-atlas-demo.mp4

ffmpeg -n -ss 55 -i docs/media/ecg-atlas-demo.mp4 \
  -frames:v 1 -q:v 3 docs/media/ecg-atlas-demo-preview.jpg
```
