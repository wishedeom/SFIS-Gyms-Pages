# Pairidaeza performance pass — PROTO

Requested after the gameplay/detail delivery, 2026-11-04. The content baseline
is pack `d6788dbc473577b9` (public deployment `96006e4`). This is a local measured
pass, not a claim about performance on a phone.

## Method

- Windows, NVIDIA RTX 3060. Godot 4.4.1 Compatibility native rendering at 960×540.
- Chrome hardware WebGL renderer verified as NVIDIA RTX 3060 / ANGLE D3D11.
  Browser comparison: 780×360 CSS viewport, 1280×720 game viewport at 0.5 scale,
  shadows off for the mobile-quality comparison, 1× CPU (no throttling).
- Seven live hostile/territorial actors and one household NPC. Fixed first-person
  entry and garden-overlook views. Native rendered ablations retain actors and
  physics except the explicitly labeled controller-disabled diagnostic.
- Native ablations warm 100–120 frames and measure 480–600 rendered frames.
  Engine process/physics monitors retain a rolling window and may overlap phases;
  measured frame intervals are used for comparisons. Script profiling is a
  separate instrumented capture and adds overhead.
- Browser frame intervals are sampled with the performance panel closed before
  instrumentation. The later 10-second script profile is diagnostic; its FPS is
  not substituted for the uninstrumented gameplay sample.
- Baseline and optimized browser comparisons use the same hardware, quality and
  camera. Recording policy is explicitly noted. No software-GPU or CPU-throttled
  run is presented as phone performance.

## Findings before changes

At the entry, browser baseline with recording on: **52.6 FPS**, 16.7 ms median,
33.4 ms p95, 675 draw calls, 165,139 primitives. It loaded without browser/runtime
errors. Hardware renderer identity is recorded in the JSON report.

Native garden-overlook ablation repeated baseline at the end: median 13.65 ms,
p95 54.71 ms with continuous recording; without recording, median 12.50 ms and
p95 15.19 ms. Shadow-disabled diagnostic reduced draw calls from approximately
2,036 to 359. Disabling all actor controllers also reduced frame time, but is not
an acceptable optimization: those actors must continue to simulate.

Conservative box occlusion removed 667 entry draws in the native diagnostic,
but native shadow passes remained and its native CPU result alone did not prove
a frame-rate improvement. The web renderer must be measured separately.

## Shipped changes

1. Full debug history is opt-in for this campaign area; pause, inspector,
   profiling and manual recording remain available. Other gyms keep their policy.
2. Render-only occluders lie inside actual opaque box walls. Doorways and carved
   openings remain open. They are enabled only for first-person and disabled for
   cutaway views and replay. No collisions, AI sensing, light bands or damage
   simulation are removed or coarsened.

The six additional render-policy checks join the encounter suite (13 total),
including on-demand capture and view/replay transitions. Full gameplay/weapon
regressions passed on the content baseline; the local render/default-tooling
change uses the focused-story exported validation plus comparable browser runs.
The focused-story exported build passed, including all 121 dedicated area,
discovery, ecology, optional-route, encounter and throwing checks. The populated
Demo again reached crew access in 76.25 simulated seconds without an augment or
firing. Rendered captures and landscape/portrait web UI checks passed; portrait
continues to show the existing landscape-required gate.

## Results

Matched browser entry samples on the desktop GPU described above:

| Pack / recording | FPS | Median frame | p95 frame | Draw calls |
| --- | ---: | ---: | ---: | ---: |
| Content baseline / on | 52.6 | 16.7 ms | 33.4 ms | 675 |
| Optimized / on | 60.3 | 16.7 ms | 16.8 ms | 325 |
| Optimized shipped default / off | 60.1 | 16.7 ms | 16.8 ms | 328 |

Draw counts are engine samples, so small differences between adjacent runs are
expected. Toggling only occlusion in the optimized pack measured 326 draws on
versus 675 off, and 103,401 versus 165,139 primitives. This confirms actual work
is culled rather than merely changing the recording policy. No browser/runtime
errors were reported. Unsupported GPU timer queries are not treated as GPU time.

Native Compatibility, 960×540, shadows enabled, shipped recording default:

| Fixed view | Median frame | p95 frame | Draw calls |
| --- | ---: | ---: | ---: |
| Entry | 13.39 ms | 15.44 ms | 1,983 |
| Garden overlook | 13.81 ms | 48.81 ms | 1,962 |
| Upper gallery | 12.17 ms | 16.97 ms | 1,733 |

The shadow-heavy native overlook still has occasional slow frames. This pass
does not establish stable 60 FPS at desktop shadow quality, nor predict phone
performance. It preserves live encounters and sensing instead of reducing their
simulation. Further native shadow/render-cost work remains measurable follow-up.

Optimized pack: `a0c025181326882c`, 21,758,048 raw bytes / 13,016,271 compressed
bytes. This is a rendering/tooling optimization, not a download-size reduction.
Public deployment verification is recorded in the implementation ledger.

## Artifacts

- `captures/pairidaeza-details/performance/pair-overlook-ablation-before.json`
- `captures/pairidaeza-details/performance/pair-entry-ablation-before.json`
- `captures/hydroponics/performance/pair-web-before.json`
- `captures/hydroponics/performance/pair-web-after-recording.json`
- `captures/hydroponics/performance/pair-web-after-shipped.json`
- `captures/pairidaeza-details/performance/pair-entry-after.json`
- `captures/pairidaeza-details/performance/pair-overlook-after.json`
- `captures/pairidaeza-details/performance/pair-gallery-after.json`
- `Root/Story/Tests/ProfileHydroponics.gd` (`SFIS_PROFILE_LEVEL=hydroponics-blockout`)
- `tools/benchmark-hydroponics-web.mjs --level=hydroponics-blockout --gpu=hardware`

Raw packs, large native recordings and browser profiles are local diagnostic
artifacts; only compact reports and selected media are suitable for publication.
