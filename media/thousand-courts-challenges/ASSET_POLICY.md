# Art asset policy

Status: user-established ground rules, recorded 2026-10-31.

## Final product

No AI-generated art assets in the final product. AI-generated art is allowed for prototypes only; it must be explicitly marked as such. Editing or deriving a new version from an AI-generated asset does not automatically remove that restriction.

The preferred final assets are original work made by the creator. Free-sourced third-party assets are not accepted for final use by default. The user can approve individual exceptions when a sourced asset is a better fit than what they can produce. Until that approval is recorded, every such asset remains explicitly marked as prototype material. A permissive license, including CC0, is not creative approval for the final game.

These rules govern art assets, including models, textures, illustrations, animation, icons, and other visual content. They do not prohibit AI assistance with code or planning. Audio has a separate prototype rule: speech for story dialogue, audio logs and readable notes is generated offline into bundled static clips. There is no runtime TTS fallback. Generated speech stays `AI-GENERATED SPEECH — PROTO ONLY`; record the engine, voice/model, source, license notes and clip-to-text mapping in a nearby manifest/README. A free-sourced voice model is prototype-only and does not receive final-use approval from this rule. No audio-specific final sourcing policy has been approved yet.

## Prototype labeling and provenance

- Use an explicit `PROTO` filename or a clearly named `_PROTO` asset directory. Where renaming would break existing references, record the exact paths in the local asset README/manifest and mark the asset's authoring/catalog entry `PROTO` where applicable.
- State the origin explicitly: `AI-GENERATED — PROTO ONLY` or `FREE-SOURCED — PROTO ONLY`. `PROTO` alone does not explain provenance.
- Keep a nearby README or manifest with asset paths, origin/creator, source URL where applicable, license, modifications, and replacement status. Record unknown provenance as unverified; do not assume it is original work.
- Carry prototype status and source records through retargeting, texture edits, conversions, baking, and other derivatives.
- When reviewing prototype artwork, identify it as prototype material. Do not present it as approved final art.

## Case-by-case exceptions

Only free-sourced assets have a case-by-case final approval route under the current policy. Record the specific asset/version, source, license, and the user's explicit approval before changing its status to approved for final use. Approval of one asset does not approve a whole pack or unrelated derivatives. AI-generated art remains excluded from final use.

Before a final release, check shipped art and its dependencies against provenance and approval records, and replace excluded or unapproved assets. This document establishes policy; it does not claim that all existing project assets have already been audited or relabeled.
