# Thousand Courts — plan and first spatial blockout

## Established direction

- The user chose **Thousand Courts**, with no leading “The,” for the area after
  Vaults of Pairidaeza. Original ship function: crew habitation.
- Areas express mechanics, a distinct visual identity, original and evolved use
  after approximately 3,000 years, factions and individual characters.
- Complex interconnection, concealed passages, back shortcuts and geometry that
  gains a new meaning on return. Several approaches to major situations.
- Combat should be costly enough to encourage alternatives. Finite supplies and
  optional objectives support survival-horror tension. No specific augment is
  mandatory; some optional routes may reward a later return.

Everything below is a **design proposal**, including the sleeper-transfer story,
resident organizations, character roles and court names. The code implements a
clearly labeled prototype of that proposal; implementation does not make it canon.

## Purpose and player motivation

Follow the sleepers carried out of the gardens. A readable arrival clue directs
the player to the transfer ledger above Counting Court. The ledger identifies a
receiving address: the Screened House in Veil Court. Reaching that frontage with
the evidence ends this blockout. It does **not** claim a rescue, confirm the raid's
commissioner or identify who contaminated the gardens.

Manual ledger reading immediately opens its journal entry with the address;
closing the journal resumes traversal. The player need not notice a silent
background journal update to understand where to go next.

That gives the player two concrete tasks and changes their reading of the space:
first search upward for evidence; then return through the district looking for
a particular household door. We need not invent a personal companion to make
the search intelligible. A more personal connection remains an optional story
decision.

## Original facility and present identity

Crew cabins, shared kitchens, washrooms, records and service circulation have
become interdependent household territories. Individual cabins are small; shared
courts are socially important. Old room numbers survive beneath family markings.
“Thousand” is an expansive local name, not a commitment to build 1,000 courtyards.

Contrast the garden's tall green concrete with compressed, warm residential
layers: clay-colored partitions, pale old bulkheads, indigo privacy screens,
amber communal lights and teal maintenance infrastructure. Cloth, lamps, bedding,
water storage, repaired doors and old service labels are later dressing targets.
The blockout uses distinct colors, schematic furniture and offset door openings.

## Residents and conflict — proposed, not populated yet

| Group / role | Interest | Gameplay expression to develop |
| --- | --- | --- |
| Household residents | Water, privacy, kin, safe shared rooms | Some offer passage; others object to trespass. No universal hostility. |
| Passage Keepers — provisional faction name | Gate authority, transit records, tolls | Control public movement; their internal complicity in transfers is disputed. |
| Raid intermediaries | Move sleepers through residential infrastructure | Occupy particular addresses, rather than represent every resident. |
| Stair-keeper | Protect the household route without exposing neighbors | Negotiated passage, an alternative errand, or discreet trespass. |
| Copyist | Preserve or amend the transfer ledger | Evidence-based conversation; witness to bureaucratic complicity. |
| Washhouse witness | Locate missing people without retaliation | Optional testimony that can change the holding-house conversation. |

Proper names, allegiance, cultural practices and responsibility remain open.
Do not reuse garden cannibals as generic enemies for all residential households.

## Topology

See [the two-layer diagram](THOUSAND_COURTS_TOPOLOGY.svg). It expresses connections,
not construction dimensions. Actual blockout: about 76 × 101 m, ground deck and
gallery at +6 m; an unimplemented later-return reward shelf sits at +10.5 m.

| Situation | First reading | Other approaches | Return / recontextualization |
| --- | --- | --- | --- |
| Lantern Court / threshold | Public gate bars the northward route | Thread the west household's offset doors; discover and crouch through screened east air return | Release public gate from north to turn a barrier into a direct return |
| Hearth and Veil Courts | Separate residential territories behind privacy walls | Cross through open alleys or low service apertures; west household stair and east service stair lead upward | Lower spaces become recognizable destinations when viewed from above |
| Counting Court / archive | Records visible at +6 m; public stair ends at a barred archive door | West household stair reaches the archive's open side; east stair reaches a hand-winched missing span | Release archive front door and descend the previously unusable public stair |
| Upper residential ring | Distant gallery above the arrival court | Join from archive's west walk | Release a real passenger lift, reconnecting to Lantern Court |
| Screened House | One private frontage among many | Ledger supplies the specific address; future witness/roof/negotiation approaches | Revisiting Veil Court now has an informed purpose |

The two archive routes are independent: the household route needs neither duct
nor bridge. The service route needs crouching and manual bridge operation.
The low household-to-spine aperture is an additional local connection, not the
only way out. Main traversal needs no weapon, implant, skill grade or consumable.

## Immersive-sim situations to implement after spatial review

1. **Admission:** negotiate using a household connection, do a useful favor,
   trespass through private rooms, crawl service circulation, or force a guarded
   public approach. Avoid a universal pass that trivializes every later boundary.
2. **Access to records:** persuade the copyist, search quietly, use the alternate
   gallery approach, or confront its guards. The geometry already supports the
   approaches; social checks, guards and consequences are not implemented yet.
3. **The receiving house:** present ledger and optional testimony, investigate
   a rear access, negotiate with divided occupants, or prepare for a dangerous
   fight. Design the interior and outcome after reviewing this blockout.

Reserve scarce ammunition and treatment for decisions rather than filling every
room with loot. Combat opposition should be authored around these situations,
not patrols scattered through neutral households. No tuning claim is made by
the current empty blockout.

## Capability assumptions and optional objectives

- **Baseline:** walking, crouching, normal interaction and journal. All required
  routes are validated with this baseline.
- **Possible garden acquisitions:** Impulse Tendons, Rebreather/gas mask or
  Induction Grip. None is granted by this map or required by its current geometry.
- **Later optional work:** a reachable elevated cache for Tendons, a breathable
  service alternative for Rebreather, movable service cargo for Grip, and a
  witness objective that changes negotiation. These need authored counterplay
  and validation; the high shelf is only a spatial reservation today.
- **Optional in this build:** read the disputed household roll under the archive;
  discover the second low service connection; reconnect both gate shortcuts and
  the lift. No fabricated stat upgrade or campaign reward is awarded.

## Scope and acceptance of this delivery

Implemented: separate selectable area, three physical stairs, two independent
archive routes, low crawl passages, manually lowered colliding span, rear-release
doors, actual passenger lift, four readable notes, ledger/journal objective,
evidence-gated local completion, Demo traversal, map preview and captures.

Not implemented: inhabitants, dialogue/audio, combat balancing, holding-house
interior/rescue, campaign travel, cross-map inventory/augment carryover or durable
saves. Vaults of Pairidaeza's exit sign and route scrap name Thousand Courts;
the actual travel connection remains a later integration task. Map selection
starts a separate blockout session. Replay resets physical/objective state;
the host-memory journal can retain notes until the host closes.

Acceptance uses the actual motor and normal Use: household route, low duct/east
ascent, lowered span crossing, ledger recovery, central return, rear gate,
continuous upper ring, lift passenger descent, hidden cross-connection, replay
and full Demo completion. Exported map-switch and browser checks cover hosting.

## Prototype provenance

New code-built geometry, colors, schematic furnishings and derived captures are
**AI-GENERATED PROCEDURAL VISUALS — PROTO ONLY**. No generated bitmap or sourced
visual was imported. Files: `ThousandCourtsLayout.gd`, `ThousandCourts.gd`, the
scene and `CaptureThousandCourts.gd`; existing human and shared UI/system assets
retain their own provenance. The SVG is a code-authored design diagram, not a
final in-game art asset. Replace prototype visuals with creator-made final art.
