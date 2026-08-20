import * as core from "@actions/core";
import * as github from "@actions/github";
import { buildDigest, formatDiffReport, parseUnifiedDiff } from "./rules";

const MARKER = "<!-- simple-diff-report -->";
const NAME = "Simple Diff Report";

async function upsertPrComment(token: string, body: string): Promise<void> {
  const { context } = github;
  if (context.eventName !== "pull_request" && context.eventName !== "pull_request_target") return;
  const issue_number = context.payload.pull_request?.number;
  if (!issue_number) return;
  const octokit = github.getOctokit(token);
  const { data: comments } = await octokit.rest.issues.listComments({ ...context.repo, issue_number });
  const existing = comments.find((c) => c.body?.includes(MARKER));
  if (existing) {
    await octokit.rest.issues.updateComment({ ...context.repo, comment_id: existing.id, body });
    return;
  }
  await octokit.rest.issues.createComment({ ...context.repo, issue_number, body });
}

async function fetchPrDiff(token: string): Promise<string> {
  const { context } = github;
  const pr = context.payload.pull_request;
  if (!pr) return "";
  const octokit = github.getOctokit(token);
  const res = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
    ...context.repo,
    pull_number: pr.number,
    mediaType: { format: "diff" },
  });
  return typeof res.data === "string" ? res.data : String(res.data);
}

async function run(): Promise<void> {
  const token = core.getInput("github-token") || process.env.GITHUB_TOKEN || "";
  const topDirs = Number(core.getInput("top-dirs") || "8");
  if (!token) {
    core.setFailed("github-token is required to read the PR diff.");
    return;
  }
  if (!github.context.payload.pull_request) {
    core.info("Not a pull_request event; nothing to report.");
    core.setOutput("files-changed", "0");
    core.setOutput("lines-added", "0");
    core.setOutput("lines-removed", "0");
    return;
  }

  const diff = await fetchPrDiff(token);
  const digest = buildDigest(parseUnifiedDiff(diff), topDirs);
  const summary = formatDiffReport(digest, MARKER, NAME);
  await core.summary.addRaw(summary, true).write();
  try {
    await upsertPrComment(token, summary);
  } catch (e) {
    core.warning(`Could not post PR comment: ${e instanceof Error ? e.message : String(e)}`);
  }
  core.setOutput("files-changed", String(digest.files.length));
  core.setOutput("lines-added", String(digest.linesAdded));
  core.setOutput("lines-removed", String(digest.linesRemoved));
  core.info(`Diff report: ${digest.files.length} files, +${digest.linesAdded}/-${digest.linesRemoved}`);
}

run().catch((e) => core.setFailed(e instanceof Error ? e.message : String(e)));
