# Phone app shell

Adds `mobile/`: a Capacitor 8 shell for iPhone and Android that opens
https://www.ygig.co.uk/browse. It has its own package.json, so the website's
dependencies and Vercel builds are unchanged. A new CI workflow builds both
apps unsigned (iOS on GitHub's free macOS machines). Not on any store yet;
icons, push, offline screen and signing come in later PRs.
