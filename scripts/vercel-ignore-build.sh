#!/usr/bin/env bash
# Vercel "Ignored Build Step". Exit 1 = build, exit 0 = skip.
#
# One repo feeds two Vercel projects:
#   race-buddy      (NEXT_PUBLIC_SITE_ENV=live) builds main only  -> live site
#   race-buddy-dev  (NEXT_PUBLIC_SITE_ENV=dev)  builds dev only   -> dev site
# Work branches are never deployed: they reach dev only through a pull
# request whose checks have passed.
set -u
branch="${VERCEL_GIT_COMMIT_REF:-}"
site="${NEXT_PUBLIC_SITE_ENV:-}"
# Fallback if project variables are not visible here: go by the project's address.
if [ -z "$site" ]; then
  case "${VERCEL_PROJECT_PRODUCTION_URL:-}" in
    race-buddy-dev*) site="dev" ;;
    *) site="live" ;;
  esac
fi

case "$site" in
  dev) wanted="dev" ;;
  *) wanted="main" ;;
esac

if [ "$branch" = "$wanted" ]; then
  echo "Building $branch for the $site site."
  exit 1
fi

echo "Skipping $branch: the $site site only builds $wanted."
exit 0
