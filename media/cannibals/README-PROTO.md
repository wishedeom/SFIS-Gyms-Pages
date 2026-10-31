# Hydroponics spear carrier — PROTO

User-established visual direction (2026-10-31): the regular human model with a
dark greenish skin tint, rotting robes, somewhat hunched animations, and a spear
for the basic cannibal. The self-name, history, language, social organization,
and meaning of cannibalism remain unresolved; this appearance establishes none
of those. This is one prototype enemy role, not every inhabitant of hydroponics.

`CannibalRecipe.gd` composes the unchanged human rig with per-instance body tint,
`CannibalPose_PROTO.tscn`, skinned garment meshes, shared inventory, and the normal
perception/alertness/pursuit/melee capabilities. Idle, walk, run, crouch and falls
keep the existing clips. A 25-degree stoop plus 6 degrees during locomotion is
layered onto the upper spine, with head compensation. Death does not accumulate
the additive pose. Collision, eye height and damage anatomy remain standard.

The split robe, ragged mantle, short sleeves, cord belt, procedural cloth shader,
skin treatment, spear geometry, procedural hunch and spear-thrust presentation
are **AI-GENERATED — PROTO ONLY**. They are code-generated prototype visuals,
not approved final artwork. Exact paths: this directory's `*_PROTO` files,
`Root/Gameplay/Weapons/SalvageSpear_PROTO.tres`, `SalvageSpearVisual_PROTO.gd`,
`SalvageSpearVisual_PROTO.tscn`, and the thrust branch in `MeleePresentation.gd`.
The model-rendered derivative icon is
`assets/weapons/inventory_icons/salvage_spear.png` (same PROTO restriction).

The base mesh is the creator's `human_male.glb`; see the
[human source record](../../../Gameplay/Models/Human/README.md). Its inherited
retargeted Quaternius animations and WRAD player arms remain **FREE-SOURCED —
PROTO ONLY** under their existing source records. Existing shared footstep and
melee foley keep their PROTO status and credits. Spear swing/hit audio reuses the
recorded StarNinjas knife and Kenney punch stand-ins, unmodified; source URLs,
licenses, hashes and processing are in `assets/weapons/metadata.json`. No new
downloaded asset or synthesized sound was introduced. No final-use approval.

The spear is a 2.2 m code-built wooden shaft with cord bindings and a chipped
salvage point. Its gameplay reach is 2.45 m, damage 29, narrow 24-degree half arc,
0.48 s windup, 0.24 s thrust, and 0.82 s recovery. Contact is revalidated at
mid-thrust through shared anatomy/cover/defense handling. These are tuning values,
not final balance. It occupies 1 × 4 inventory cells, uses no ammunition, and is
available on the Weapons gym rack. Two provisional patrols occupy the root-floor
central aisle and western +7 m gallery in Hydroponics. Reset recreates the same
faction and spear loadout without the training guards' random weapon deck.

Garments use skeletal weights, with leg-following skirt panels and front/back
slits. This is not cloth simulation; extreme poses may still need mesh/weight
refinement before replacement with creator-made art. The current pass has no
dedicated authored spear animation or resolved opening event.

Validation: 1,585 checks pass across faction assembly/combat, the full melee
catalog, guard firearms, the weapon gym, regular human poses, grid inventory,
menu and web launcher. The geometry pass also retains its 13 physical route
checks. After the final skin-albedo-only adjustment, all 19 faction checks and
the packaged browser loader pass again. The launcher lean test now refreshes
held packets like the browser, preserving its separate 500 ms watchdog check.
Actual final-pack stills and a silent 9-second, 960 × 540 mobile movement/thrust
video are in `captures/cannibals`; validation reports retain the tested pack IDs.
