# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
## [Unreleased]

### Bug Fixes

- Gate Codanna MCP on the worktree index  ([4372061](43720610d5a64e3307481f92884cc2933c0fa472))

- Run the worktree's Codanna setup and gate on checkout type  ([e16788c](e16788ceff0c19f41f80f0109627d2d92e9b778b))


### Features

- Wire playback volume multiplier through to afplay  ([2c01fce](2c01fce1d64aa1d115e3271d1d8bed4c99a05563))



[Unreleased]: https://github.com/madeinoz67/madeinoz-voice-server/compare/trunk...HEAD
## [0.1.13] - 2026-11-20

### Bug Fixes

- Resolve persona names to documented Kokoro voices  ([c2d044a](c2d044a84aa0713c09ff25bd3a5c160a9b4ea467))



[0.1.12]: https://github.com/madeinoz67/madeinoz-voice-server/compare/v0.1.12...v0.1.13
## [0.1.12] - 2026-11-20

### Bug Fixes

- Allow empty/missing voice_id in notifications ([2479428](247942826cc9262dc1402b8e299c02bb5275c94b))


### Documentation

- Add queue diagrams and agent reports ([d4be95d](d4be95df90e396d2bf182e1b900da289049da1eb))

- Ban `codanna index .` in agent guidance  ([2650a51](2650a51c8c0799deb48b83fa47e54ad6fb76cf12))


### Miscellaneous Tasks

- Bump eslint from 10.0.0 to 10.0.1  ([ff97687](ff97687b3acb15158be44dd21e449a36b18515c4))

- Bump @types/node from 25.2.3 to 25.3.0  ([b930f7b](b930f7bc5a788295b73c09430e291d3ffc218a94))

- Bump @typescript-eslint/parser from 8.56.0 to 8.56.1  ([f8f2c69](f8f2c6904395f213990a61f5bbc9a074d3171531))

- Add GitHub MCP permissions to local settings ([1641ec3](1641ec3581e763149da2035b3ca91c5f599dcba6))

- Prune dead python paths, drop stale pyproject ref, rebuild index for 0.17.1 ([9e1497f](9e1497f8804ed33d36449051994b3fef8ca0eb71))

- Install hooks, agents, MCP binding, orca setup, worktree-safe config  ([d6d3cf8](d6d3cf8114dd0c34dd44d01d0bc48226cb8bde63))

- Bump flatted  ([9ea0207](9ea0207f25c59d8561381a7d59f689a77cd873b1))

- Bump @types/node from 25.3.0 to 25.6.0  ([b9a5f72](b9a5f72ffada0f0a00760292d721596f97640900))

- Bump eslint from 10.0.1 to 10.2.0  ([a18acb9](a18acb9b2ce93acdd88ebbe0d00d62f931bb6c06))

- Bump @typescript-eslint/eslint-plugin  ([e46bc7d](e46bc7db99c423a1a416d8799cea3e55beb62ea6))

- Bump typescript-eslint from 8.56.0 to 8.58.1  ([ec2887e](ec2887e2f1bb10c90536b9713ce8c49d457bd435))

- Bump bun-types from 1.3.9 to 1.3.12  ([75cdd0b](75cdd0b53b84bbade97b347596eea66f4a32a4ff))

- Bump the npm_and_yarn group across 1 directory with 3 updates  ([494a67b](494a67b3028d4b3d6312d94375955a1a6a36137d))

- Sync ProjectSetup update (grep nudge, safe index, doc collections)  ([7522f4d](7522f4da18195aa0d0c2ee4b9e54e637a6599a06))



[0.1.11]: https://github.com/madeinoz67/madeinoz-voice-server/compare/v0.1.11...v0.1.12
## [0.1.11] - 2026-02-17

### Documentation

- FIFO queue documentation with visual diagrams  ([53f4dd8](53f4dd8118c55f10dcbe55d42b054cd803731d4f))


### Features

- Add Homebrew launchd plist for voice-server service  ([8320799](83207990c29d3080d6d8f85e9fe2f61de7605e06))


### Miscellaneous Tasks

- Bump @types/node from 25.2.2 to 25.2.3  ([7d07d72](7d07d725d251b8bcdc54accdddab91a776ff4713))

- Bump @typescript-eslint/eslint-plugin  ([d8bf7ef](d8bf7ef16649ec199402eef0d044e2bb3744c78b))

- Bump typescript-eslint from 8.54.0 to 8.55.0  ([c28e5ea](c28e5ea3ebdf28d046bcc72e41dec653954ada3c))

- Bump @typescript-eslint/parser from 8.54.0 to 8.55.0  ([872c91e](872c91eb0c426c70777edd6a98d806e0cbf2d9af))



[0.1.7]: https://github.com/madeinoz67/madeinoz-voice-server/compare/v0.1.7...v0.1.11
## [0.1.7] - 2026-02-09

### Ci

- Use npm OIDC for publish instead of token ([5476714](54767141475c4783d9c4ea1c54e29ba6b6a79ed9))

- Upgrade npm for OIDC support ([5d6aade](5d6aade1727b1e731031ec728537abc629aaa84f))



[0.1.4]: https://github.com/madeinoz67/madeinoz-voice-server/compare/v0.1.4...v0.1.7
## [0.1.4] - 2026-02-09

### Bug Fixes

- Use correct CodeQL config format to exclude tests ([e66b020](e66b02060506b0a4c181211576c54f02e517d989))

- Exclude tests from CodeQL and skip CI on changelog changes ([7ba9d9c](7ba9d9c62721d291f4fcc584b3eccdb799904055))

- Avoid template literal property keys for CodeQL compatibility ([66b1738](66b1738a5fb18061ad77a43ede1acc9f67e70707))


### Documentation

- Rename project to voice-server  ([c7e9209](c7e9209b2eeee1ac2af152f55b01045043cab2b9))

- Update npm package name and CI changelog ignore  ([3cee42e](3cee42e74e4c5ef9fe9c456c5941036c5a210403))


### Features

- Add custom CodeQL workflow with test file exclusions ([8323d4a](8323d4a88f544455a66e2b50fc3320de8b969e3d))

- Add comprehensive CodeQL paths-ignore configuration ([4c761c0](4c761c0f0e1446bce7d25a4e884f6b6238df6b06))


### Miscellaneous Tasks

- Bump @eslint/js from 8.57.1 to 10.0.1  ([78400b0](78400b02c6f2ea338d6d7a5d5c52e36ecaa93695))

- Bump eslint from 8.57.1 to 10.0.0  ([4b678a4](4b678a473516e1bde149d77799258289b0601b5d))

- Bump @types/node from 20.19.32 to 25.2.2  ([70a367c](70a367c221ad67889be82387ee3fee1af0992eb2))

- Exclude test files from CodeQL analysis ([f404e72](f404e721b9fe6f5ce615dfd529ee9c04f0e2f4a4))

- Bump bun-types from 1.3.8 to 1.3.9  ([a54ac69](a54ac6927c2663298078e94144eb5522b9005183))



[0.1.0]: https://github.com/madeinoz67/madeinoz-voice-server/compare/v0.1.0...v0.1.4
## [0.1.0] - 2026-02-08

### Bug Fixes

- Add NPM_TOKEN to npm publish job ([a4f219b](a4f219b6449e8853783814fa0f02089ecb9d012a))


### Features

- MLX-audio Kokoro Voice Server - Drop-in ElevenLabs Replacement  ([f5bff4e](f5bff4e3123a31d0bb4d6aa2a3c86aed3000ecb9))


### Miscellaneous Tasks

- Initial project setup ([4645ba1](4645ba165f1916c1644a266b0716b730399e97a5))



