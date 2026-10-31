# Hydroponics — PROTO geometry pass

The first story area is listed under **Story areas** in the shared native main menu. Gyms and labs remain under **Gyms & labs**. The catalog entry uses `MainStory`; no narrative transactions or encounters are implemented yet.

This first pass is a 60 × 84 m cultivation hall, about 40 m tall. Walk from the root floor through three 7 m ramp climbs to crew access at +21 m. Bridges and perimeter galleries form loops on each elevation. The upper continuation is sealed for later iteration. Demo follows the same physical route; Player Control allows free exploration. Overview/follow use a visual hull cutaway, retaining physical collision.

## Prototype provenance

All geometry, concrete shading, stone fragments, and vegetation in this folder are **PROTO — CODE-BUILT BLOCKOUT**. They are authored procedurally in project code with AI coding assistance, without downloaded assets or image-generated textures/models. They are not approved final art. Foliage is deliberately schematic and sparse so routes remain readable. Large stone fragments have convex collision; leaf and root dressing is non-colliding and stays off walking routes.

The scene currently reuses the existing shared player rig, controller, HUD, and debug/session host. This does not change those assets' existing provenance or constitute approval for final use. Training grenade pickups are disabled here.

## Files and verification

- `HydroponicsLayout.gd`: authored collision, route, galleries, beds, shell, lights.
- `HydroponicsDressing.gd`, `Concrete_PROTO.gdshader`: temporary mood geometry and shading.
- `Hydroponics.gd`: exploration host and physical walking tour.
- `../Tests/RunHydroponicsChecks.gd`: actual controller ascent/descent and assembly checks.
- `../Tests/CaptureHydroponics.gd`: engine-rendered views and optional architectural tour movie.

Build and validate with `python tools/build-stealth-web.py --github-pages --focused-story`.
The first published geometry iteration passed 1,062 exported checks across traversal,
menu, all-map switching, wall/style isolation, inventory, grenades, hazards and the
shared launcher, plus the real web loader checks. The rendered capture also checks
that the Story menu's Load action fits within a 1280 × 720 viewport. The physical
ascent and descent tests use the shared actor motor without teleporting or resetting.

Free exploration has no gym time limit. This iteration intentionally leaves crew
access sealed; captivity, dialogue and story triggers come later. The subsequent
faction iteration adds two basic spear carriers, documented below.

Kepler-442 b is the confirmed mission destination; see the [story document](../../../docs/design/README.md).

## Second geometry iteration — flooded chambers

The original ascent is now flanked by two additional 40 × 52 m chambers, expanding
the blockout to roughly 150 × 84 m. The western cistern has a 36 m ceiling, a
6 m-deep water volume and a raised bank loop. The eastern ruined hall reaches
39 m, with an 8 m-deep reservoir, shattered upper galleries, fallen colliding slabs,
exposed rods and a two-run switchback back to the upper gallery.

Two code-built timber-and-rope suspension bridges span 28 m and 24 m. Their
plank decks have physical sagging profiles and thin colliding handropes; they are
static architecture, without cable or swinging simulation. Existing swimming,
oxygen and water presentation serve both pits, and both reservoirs have two
physical exit slopes. Non-colliding algae rafts cluster at the edges, leaving
visible open water and the swimming routes clear.

A short concealed culvert joins the main hall to the cistern. A longer L-shaped
service passage bypasses the collapsed eastern ground doorway; both have 1.35 m
clearance and use the existing crouch posture. Upper portals connect the new rooms
to the original galleries at +7 and +14 m. Warm local lamps, cold grow-light shafts,
four shadow-casting sources and lower ambient fill give the spaces distinct pools
of light and deep shadow. The original three-ramp tour stays unchanged.

`HydroponicsChambers.gd` owns authored solids, reservoir bounds, apertures, bridge
collision and fixtures. `HydroponicsRuinDressing.gd` and `Wood_PROTO.gdshader` add
the ropework, wood grain, algae and broken pieces. All additions remain
**PROTO — CODE-BUILT BLOCKOUT**, with AI coding assistance; no downloaded assets
or image-generated art was introduced. Geometry and route choices are provisional
and do not establish the opening story sequence or the residents' culture.

Iteration 2 validation: all 13 physical traversal/assembly checks pass against the
final exported pack. The focused shared suites pass 1,070 checks across geometry,
map switching, menu, styles, inventory, grenades, hazards and the launcher. The
launcher touch-watchdog check needed an isolated rerun after a timing failure
while the GPU capture ran in parallel. The actual packaged browser loader checks
also pass. Engine-rendered stills and a 12-second, 960 × 540 mobile walkthrough
are recorded in `captures/hydroponics/iteration2`. Rope visuals use three instanced
draws; decks, anchors and handropes retain their authored collision.

## First faction prototype

Two [cannibal spear carriers](../Factions/Cannibals/README.md) patrol the central
root aisle and western first gallery. They use the regular human with dark olive
skin, skinned rotting robes and a hunched animation layer. Their fixed spears use
the shared NPC perception/pursuit and timed melee stack; the gym's randomized
firearm loadouts do not apply. Both reset normally. This adds prototype encounters,
with no captivity script or final cultural identity. New visual work is explicitly
AI-GENERATED — PROTO ONLY; inherited sourced animation and audio markings persist.

## Playable opening — learning through the settlement

The user requested environmental tutorialization without written instructions,
in the order walking, jumping, crouching, stealth, then a pistol cache and combat.
The start is now a provisional 36 × 50 m village annex connected through a real
doorway to the original cultivation hall. Most of the larger zone is unchanged.

The unarmed player starts beside a victim preparation table, another mutilated
body and four sealed hypersleep sacks. Palisades and small storage shelters turn
the open floor into a winding route. A lit opening in the first fence invites
walking; a 0.7 m fallen beam blocks the next gap until jumped. Failed jumps land
on the same safe floor. A collapsed shelter has 1.25 m clearance and requires
the actual crouching capsule. There are no tutorial signs, popups or new controls.

Beyond the crawl is a visible spear lookout, with 1.2 m cover and a covered flank
into the next enclosure. Crouching reduces the silhouette behind physical cover;
the existing sight, hearing and alertness systems decide detection. No invisible
stealth trigger or scripted immunity is used. The sheltered cache holds an ordinary
loaded service pistol (8 rounds) and 16 spare 9 mm rounds. Normal Use, inventory,
equip and firearm behavior apply. Leaving the cache reveals a separate spear
carrier in the cultivation hall; the western gallery's carrier remains farther on.
Three NPCs now use the fixed faction loadout. Reset restores pickups and enemies.

`HydroponicsOpening.gd` owns the layout and item placement.
`HydroponicsOpeningDressing.gd` owns the **AI-GENERATED — PROTO ONLY** village
stakes, broken shelter dressing, tables, wound/blood placeholders and translucent
hypersleep sacks. Victims and sleepers derive from the creator's existing human
mesh; victim mutilation removes one arm's weighted triangles on an instance copy.
Poses and added visual geometry are generated prototypes. No source mesh/material
is edited, no downloaded art was added, and no final-use approval is implied.
The existing wood shader, human model, animation and pistol dependencies retain
their earlier provenance and prototype status. Body props are decorative and
have no rescue/awakening interaction in this iteration.

The Demo tour follows the same route, jumps and crouches through the actual motor,
takes the physical pistol/ammo, and uses observed contacts for combat before
continuing the original ascent. Player Control retains normal free exploration.
Exact dimensions, patrol timing, ammunition and set dressing remain proposals
for playtesting; the awakening mechanism and wider settlement culture remain open.

`RunHydroponicsOpeningChecks.gd` checks the unarmed start, safe early sight lines,
walking/jumping/crouching gates, a successful covered stealth route, real cache
interactions, ammunition, a real pistol kill, resets and Demo traversal. The older
13-check suite independently retains the main ascent, descent and side loops.
Both suites and faction checks are included in `--github-pages --focused-story`.
