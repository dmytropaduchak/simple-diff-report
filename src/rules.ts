export type FileDelta = {
  path: string;
  added: number;
  removed: number;
};

export type DiffDigest = {
  files: FileDelta[];
  linesAdded: number;
  linesRemoved: number;
  topDirs: Array<{ dir: string; added: number; removed: number; files: number }>;
};

export function parseUnifiedDiff(diff: string): FileDelta[] {
  const files: FileDelta[] = [];
  let current: FileDelta | null = null;
  for (const line of diff.split(/\r?\n/)) {
    const fileMatch = line.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (fileMatch) {
      current = { path: fileMatch[2], added: 0, removed: 0 };
      files.push(current);
      continue;
    }
    if (!current) continue;
    if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) continue;
    if (line.startsWith("+")) current.added += 1;
    else if (line.startsWith("-")) current.removed += 1;
  }
  return files;
}

export function buildDigest(files: FileDelta[], topN: number): DiffDigest {
  const linesAdded = files.reduce((n, f) => n + f.added, 0);
  const linesRemoved = files.reduce((n, f) => n + f.removed, 0);
  const byDir = new Map<string, { added: number; removed: number; files: number }>();
  for (const f of files) {
    const parts = f.path.split("/");
    const dir = parts.length > 1 ? parts[0] : ".";
    const cur = byDir.get(dir) || { added: 0, removed: 0, files: 0 };
    cur.added += f.added;
    cur.removed += f.removed;
    cur.files += 1;
    byDir.set(dir, cur);
  }
  const topDirs = [...byDir.entries()]
    .map(([dir, v]) => ({ dir, ...v }))
    .sort((a, b) => b.added + b.removed - (a.added + a.removed))
    .slice(0, Math.max(1, topN));
  return { files, linesAdded, linesRemoved, topDirs };
}

export function formatDiffReport(digest: DiffDigest, marker: string, name: string): string {
  const fileRows = digest.files
    .slice()
    .sort((a, b) => b.added + b.removed - (a.added + a.removed))
    .slice(0, 40)
    .map((f) => `| \`${f.path}\` | +${f.added} | -${f.removed} |`)
    .join("\n");
  const dirRows = digest.topDirs
    .map((d) => `| \`${d.dir}/\` | ${d.files} | +${d.added} | -${d.removed} |`)
    .join("\n");
  return [
    marker,
    `## ${name}`,
    "",
    `**${digest.files.length}** file(s) · **+${digest.linesAdded}** / **-${digest.linesRemoved}** lines`,
    "",
    "### Top directories",
    "",
    "| Directory | Files | Added | Removed |",
    "| --- | ---: | ---: | ---: |",
    dirRows || "| — | 0 | 0 | 0 |",
    "",
    "### Changed files",
    "",
    "| Path | Added | Removed |",
    "| --- | ---: | ---: |",
    fileRows || "| — | 0 | 0 |",
  ].join("\n");
}
