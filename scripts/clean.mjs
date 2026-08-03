import { rm } from "node:fs/promises";

const buildArtifacts = [".next", "coverage", "out", "build"];

await Promise.all(
  buildArtifacts.map((path) => rm(path, { recursive: true, force: true })),
);

process.stdout.write(`Removed ${buildArtifacts.join(", ")} build artifacts.\n`);
