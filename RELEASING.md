# Releasing `persistent-terminal-mcp`

Follow this checklist to cut a new release for npm and GitHub.

## 1. Pre-flight
- [ ] Node.js 18+ installed (`node --version`)
- [ ] Logged in to the correct npm account (`npm whoami`)
- [ ] Working tree clean (`git status`)
- [ ] Latest changes from `main` pulled

## 2. Versioning & Changelog
- [ ] Decide the new semver (`npm version <patch|minor|major>` or manual edit)
- [ ] Update `CHANGELOG.md` with the release date and highlights
- [ ] Commit the version bump and changelog update

## 3. Quality Gates
- [ ] Install dependencies: `npm install`
- [ ] Run unit tests: `npm test`
- [ ] Build TypeScript: `npm run build`
- [ ] Optional: run integration demos (e.g. `npm run example:basic`)

## 4. Package Verification
- [ ] Inspect the packed files: `npm pack --dry-run`
- [ ] Confirm `dist/` types and the `public/` assets are present
- [ ] Spot-check README links and badges after build

## 5. Publish to npm
- [ ] Ensure `publishConfig.access` is `public`
- [ ] Publish: `npm publish`
- [ ] Capture the tarball URL printed by npm for release notes

## 6. GitHub Release
- [ ] Push changes and tags: `git push && git push --tags`
- [ ] Create a GitHub release with changelog excerpt and npm tarball link
- [ ] Update any docs that reference the latest version if needed

## 7. Post-release
- [ ] Verify `npx persistent-terminal-mcp --version` shows the new version
- [ ] Update dependent projects or examples if they pin a version
- [ ] Celebrate 🎉
