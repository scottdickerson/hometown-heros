#!/bin/sh
# Builds with the repo-local Meteor (see install-meteor.sh) and deploys the bundle to NodeChef.
# nodechef's own build step needs `meteor` on PATH, so we build first and pass the tarball with -l.
set -e
cd "$(dirname "$0")/.."
OUT=$(mktemp -d)
trap 'rm -rf "$OUT"' EXIT
arch -x86_64 .meteor-cli/.meteor/meteor build "$OUT" --architecture os.linux.x86_64 --server-only
nodechef deploy -i "${1:-hometownheroes}" -l "$OUT/hometown-heros.tar.gz"
