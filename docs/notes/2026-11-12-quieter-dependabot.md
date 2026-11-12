# 2026-11-12: Quieter Dependabot

Dependabot opened 8 PRs at once (#38-#45) when its settings first reached
`main`. Adam chose to close them and group updates. `.github/dependabot.yml`
now allows one grouped PR a week for small npm updates and one a month for
GitHub Actions, and skips major version jumps. Security updates are separate.
Takes effect once released to `main` (Dependabot reads the default branch).
