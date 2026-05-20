import packageJson from "@/package.json";

function firstEnvValue(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) return value;
  }

  return null;
}

export function getDeployVersion() {
  const explicitVersion = firstEnvValue([
    "TAVERN_DEPLOY_VERSION",
    "NEXT_PUBLIC_TAVERN_DEPLOY_VERSION",
  ]);

  if (explicitVersion) return explicitVersion;

  const commitSha = firstEnvValue([
    "VERCEL_GIT_COMMIT_SHA",
    "NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA",
    "GITHUB_SHA",
    "COMMIT_SHA",
  ]);

  const baseVersion = `v${packageJson.version}`;

  if (commitSha) {
    return `${baseVersion}+${commitSha.slice(0, 7)}`;
  }

  return `${baseVersion}+dev`;
}
