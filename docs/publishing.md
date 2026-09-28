# Publishing react-timeline-sequence

Every pull request and push to `main` installs dependencies without lifecycle scripts, runs type checking and tests, builds the module explicitly, packs the built files, and retains the installable tarball as a CI artifact.

Publishing starts only when a GitHub release is published. A manual `workflow_dispatch` builds and validates the release artifact but does not publish it.

## Release destinations

One successful GitHub release publishes:

- `react-timeline-sequence` to the public npm registry;
- `@kieransimkin/react-timeline-sequence` to GitHub Packages, because GitHub's npm registry requires a scoped package name;
- the canonical npm tarball and its SHA-256 checksum as GitHub release assets.

The release workflow builds and tests once, then both registry jobs consume that retained artifact. The GitHub Packages copy changes the package name in the extracted manifest and removes the source-only `prepare` hook before publishing; its already-built `dist/` contents are unchanged.

## npm bootstrap completed

`react-timeline-sequence@0.1.2` was published directly on 28 September 2026 after account-level 2FA was enabled. The trusted publisher was then created with npm CLI 12.1.0 using:

- owner: `kieransimkin`;
- repository: `react-timeline-sequence`;
- workflow filename: `release.yml`;
- environment: `npm`;
- allowed action: direct `npm publish`.

No `NPM_TOKEN` repository secret was created. Later releases use short-lived GitHub OIDC credentials and receive npm provenance automatically. The workflow pins npm CLI 12.1.0 because trusted-publisher management and publishing require a current npm CLI and Node runtime.

The release workflow treats a matching pre-existing npm version as successful only when the registry's SHA-1 tarball checksum exactly matches the canonical release artifact. A different checksum fails the job. This makes the manually bootstrapped `0.1.2` GitHub release idempotent without hiding version-content drift.

## GitHub Packages

The GitHub Packages job uses the release workflow's repository-scoped `GITHUB_TOKEN`; no additional secret is required. GitHub currently creates a newly published npm package as private by default. After the first publication, review the package settings and make it public if anonymous installation is intended.

Consumers install the GitHub Packages copy as the scoped name and must configure the `@kieransimkin` scope for `https://npm.pkg.github.com`.

## Making a release

1. Update `package.json`, `package-lock.json` and `CHANGELOG.md` to the same new version.
2. Merge or push the version commit to `main` and confirm CI passes.
3. Create and push an annotated tag such as `v0.1.2` at that exact commit.
4. Publish a GitHub release for the tag.
5. Verify the release workflow, both registry package pages, the GitHub release assets and their displayed versions. A successful upload proves publication, not that consumers have installed or used the package.

## Potential problems

### npm publication reports an authentication error

- **Symptom:** the npmjs job reaches `npm publish` but reports that it is not authorised.
- **Cause:** account-level 2FA is not enabled, or the trusted-publisher owner, repository, workflow filename, environment or allowed action does not exactly match the workflow.
- **Correction:** keep account-level 2FA enabled. Compare every trusted-publisher field with this document and keep `id-token: write` on the npmjs job.
- **Verification:** the workflow succeeds and the exact release version is visible under `react-timeline-sequence` on npmjs.
- **Limit:** do not weaken account 2FA or retain a long-lived publishing token to conceal a configuration mismatch.

### npm 10 exits after showing the browser authentication link

- **Symptom:** `npm publish` prints an `https://www.npmjs.com/auth/cli/...` link and then reports `Exit handler never called!` before the browser verification completes.
- **Cause when observed:** npm CLI 10.8.3 hit the web-auth exit bug tracked at <https://github.com/npm/cli/issues/7642>.
- **Correction:** complete the security-key challenge from the printed link, select npm's five-minute challenge-skip option when offered, then retry the identical publish immediately. Use the pinned project-wide npm 12.1.0 CLI for trusted-publisher management.
- **Verification:** the immediate retry published `react-timeline-sequence@0.1.2`, and `npm trust list` returned the expected GitHub repository, workflow and environment.
- **Limit:** never paste an OTP, recovery code or npm credential into command logs or chat. The five-minute authorization is short-lived and does not replace normal 2FA.

### The GitHub Packages copy has a different import name

- **Symptom:** a consumer installs from GitHub Packages but an import of the unscoped name cannot be resolved.
- **Cause:** GitHub Packages accepts only scoped npm package names, so that registry publishes `@kieransimkin/react-timeline-sequence`.
- **Correction:** use the scoped name in both the dependency and import when consuming the GitHub Packages copy, or use the canonical unscoped npmjs package.
- **Verification:** the consuming build resolves the selected name and version from the intended registry.
- **Limit:** the two registry identifiers refer to equivalent release contents, but they are distinct npm package names.

### CI reports the Vitest redirect-mock path-traversal advisory

- **Symptom:** `npm audit` reports `GHSA-82fw-gwwq-j7x9` against Vitest and `@vitest/mocker` versions below 4.1.11.
- **Cause:** the older test runner contains a development-server redirect-mock path that can read files outside its intended boundary when an attacker can reach the relevant server interface. The GitHub Advisory Database entry was checked on 28 September 2026: `https://github.com/advisories/GHSA-82fw-gwwq-j7x9`.
- **Correction:** retain Vitest 4.1.11 or later within the compatible 4.x line and regenerate the lockfile.
- **Verification:** run the full tests and `npm audit`; the tests pass and the audit reports no known vulnerability.
- **Limit:** this package does not expose a Vitest development server in production, but development-only exposure is not a reason to retain a known vulnerable dependency.

### A local Windows tar smoke test fails inside WinAVR

- **Symptom:** extracting the package reports `sync_with_child`, status `0xC0000142`, `Cannot fork` and `Resource temporarily unavailable`, with the executable identified as `C:/WinAVR-20100110/utils/bin/tar.exe`.
- **Cause:** the current `PATH` selects WinAVR's obsolete MSYS tar implementation instead of the supported Windows tar. Matching WinAVR/MSYS reports were reviewed on 28 September 2026, including `https://sourceforge.net/p/winavr/mailman/message/21129955/`.
- **Correction:** do not replace WinAVR DLLs or weaken system settings for this package. Invoke `C:\Windows\System32\tar.exe` explicitly for the local archive smoke test.
- **Verification:** Windows bsdtar 3.5.2 extracts the package, the scoped manifest helper succeeds, and all eight `dist/` files remain present.
- **Limit:** GitHub's Linux release runner uses its native tar and is not affected by the local Windows `PATH` collision.
