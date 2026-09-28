import { readFileSync } from "node:fs";

const releaseTag = process.argv[2];

if (!releaseTag) {
  throw new Error("Pass the release tag, for example: npm run verify:release -- v0.1.2");
}

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const expectedTag = `v${manifest.version}`;

if (releaseTag !== expectedTag) {
  throw new Error(`Release tag ${releaseTag} does not match package version ${manifest.version}`);
}

console.log(`Release tag ${releaseTag} matches package version ${manifest.version}.`);
