# Verify Gates-of-the-Arctic
Quiet North - Gates of the Arctic immersive experience (vite).
## Launch
`npm install`, then `npm run dev` or `npm run build && npm run preview`.
## Doctor
`python3 .cursor/skills/verify-gates-of-the-arctic/verify.py`
## Drive
Builds with vite, then renders the built app in headless Chromium (swiftshader for WebGL) asserting the boot marker and zero JS console errors.
## Evidence
`.cursor/skills/verify-gates-of-the-arctic/evidence.json`
## Cleanup
Static server terminated after the render.
## Known boundaries
The repo's verify_ux.py needs a python playwright install and is not part of this runner; scene interaction and audio quality are unverified.
