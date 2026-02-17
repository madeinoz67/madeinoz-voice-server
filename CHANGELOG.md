# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
## [Unreleased]

### Documentation

- FIFO queue documentation with visual diagrams  ([53f4dd8](53f4dd8118c55f10dcbe55d42b054cd803731d4f))


### Features

- Add Homebrew launchd plist for voice-server service  ([8320799](83207990c29d3080d6d8f85e9fe2f61de7605e06))


### Miscellaneous Tasks

- Bump @types/node from 25.2.2 to 25.2.3  ([7d07d72](7d07d725d251b8bcdc54accdddab91a776ff4713))

- Bump @typescript-eslint/eslint-plugin  ([d8bf7ef](d8bf7ef16649ec199402eef0d044e2bb3744c78b))

- Bump typescript-eslint from 8.54.0 to 8.55.0  ([c28e5ea](c28e5ea3ebdf28d046bcc72e41dec653954ada3c))

- Bump @typescript-eslint/parser from 8.54.0 to 8.55.0  ([872c91e](872c91eb0c426c70777edd6a98d806e0cbf2d9af))



[Unreleased]: https://github.com/madeinoz67/madeinoz-voice-server/compare/trunk...HEAD
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



