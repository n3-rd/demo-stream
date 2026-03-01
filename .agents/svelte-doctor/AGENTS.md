# Svelte Doctor

Run after making Svelte changes to catch issues early. Use when reviewing code, finishing a feature, or fixing bugs in a Svelte project.

Scans your Svelte codebase for security, performance, correctness, and architecture issues. Outputs a 0-100 score with actionable diagnostics.

## Usage

```bash
npx -y @framework-doctor/svelte@latest . --verbose --diff
```

Or use the unified CLI (auto-detects Svelte):

```bash
npx -y @framework-doctor/cli . --verbose --diff
```

## Workflow

Run after making changes to catch issues early. Fix errors first, then re-run to verify the score improved.
