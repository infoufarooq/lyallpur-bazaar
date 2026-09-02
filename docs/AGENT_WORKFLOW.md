# Local multi-agent workflow

Codex, Claude Code, and Antigravity CLI work from this same checkout. They do not share private chat history, so the repository is the source of truth for coordination.

## Per task

1. Write the goal, boundaries, checks, and roles in `briefs/TASK.md`.
2. Assign one lead. Give the other agents non-overlapping work or review-only tasks.
3. Each contributor reads `AGENTS.md`, the task brief, the handoff, and current Git status before working.
4. On completion, run relevant checks and add a concise entry to `briefs/HANDOFF.md`.
5. The lead reviews and integrates changes after all contributors finish.

## Launching locally

From the repository root, open separate terminals and launch the tools you use:

```powershell
codex
claude
agy
```

Use `agy` for Antigravity CLI. Keep one agent as the sole editor of a given file at a time.
