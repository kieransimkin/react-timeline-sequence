import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const packageDirectory = process.argv[2];

if (!packageDirectory) {
  throw new Error("Pass the extracted package directory.");
}

const manifestPath = resolve(packageDirectory, "package.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

if (manifest.name !== "react-timeline-sequence") {
  throw new Error(`Unexpected canonical package name: ${manifest.name}`);
}

manifest.name = "@kieransimkin/react-timeline-sequence";
delete manifest.scripts?.prepare;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`Prepared ${manifest.name}@${manifest.version} for GitHub Packages.`);
