# Thousand Courts — first population pass [PROTO]

Six neutral residents, four conversations and two finite-weapon keepers.
Give a lamp cell to the household and obtain a vouch; alternatively obtain
washhouse testimony. The public warden accepts either and the copyist shares
the same transfer entry. The service/stealth route still works without any
conversation, weapon, augmentation or supply. Permission is honored until a
keeper is attacked. Favor, testimony, injury consequences, inventory and spent
supply receipts persist for this host session; page reload starts fresh.

- [Current plan](THOUSAND_COURTS_PLAN.md)
- [Topology and social routes](THOUSAND_COURTS_TOPOLOGY.svg)
- [Social-pass tour, 38 seconds / about 0.72 MB](social-pass-mobile-PROTO.mp4)
- [Shared record](record-shared-PROTO.png)
- [Small landscape dialogue capture](mobile/warden-dialogue-PROTO.png)

The tour contains arranged live Talk, ordinary pickup, favor payment and state
changes. It is not an uninterrupted player walkthrough. Long conversations use
the existing scrollable native dialogue panel on small viewports. The rescue
interior, civilian schedules/protection reactions and campaign travel are still
future work. Story and faction identities remain proposals, not settled canon.

AI-GENERATED PROCEDURAL VISUALS — PROTO ONLY. Work tunics derive the existing
procedural skinning helper with new geometry/plain materials; no garden robe,
mantle, hunch or skin tint is applied. New schematic household props and derived
captures remain prototype art. Existing human, weapons, animations and foley
retain their own provenance. No new bitmap artwork was imported.

AI-GENERATED SPEECH — PROTO ONLY. Four roles currently share one static offline
Piper / en_US-ljspeech-medium prototype voice. Exact text-to-clip mappings,
hashes and voice/model provenance are recorded in the source project's
assets/game_audio/proto_speech/manifest_PROTO.json. No runtime TTS is used.
The design diagram is code-authored and is not a final in-game art asset.

Validation: 34 population acceptance checks, plus the broader focused-story
release's 42 exported suites / 2,213 checks. The unarmed/unaugmented service Demo
completes in 79.2 simulated seconds with live guards and no favor or supply use.
Browser smoke confirms this populated pack, landscape controls and portrait
orientation gating with no runtime errors. The populated entry sample measured
60.1 FPS / 16.8 ms p95 on RTX 3060 / ANGLE D3D11, 1280×720 at 0.5 scale, shadows
and recording off, no CPU throttle. This is a desktop diagnostic, not phone
performance or a whole-level budget. Pack: `9df785f6a429eaf0`.

- [Population acceptance result](RunCourtsPopulationChecks.json)
- [Browser/performance diagnostic](courts-population.json)
- [Browser landscape controls](courts-population-landscape-PROTO.png)

The next challenge increment adds a bonded store, dry washhouse loop and optional Optical Veil. See [current challenge captures and scope](../thousand-courts-challenges/README.md). Earlier images and videos remain development history.
