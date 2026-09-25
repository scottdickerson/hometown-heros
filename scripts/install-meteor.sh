#!/bin/sh
# Installs the Meteor CLI pinned in .meteor/release into .meteor-cli/ (repo-local).
# Meteor 1.8.3 has no arm64 build, so we always fetch x86_64 (runs under Rosetta on Apple Silicon).
set -e
cd "$(dirname "$0")/.."
RELEASE=$(sed 's/METEOR@//' .meteor/release)
[ "$(uname)" = Darwin ] || exit 0 # local dev only; skip on deploy/CI hosts
[ -x .meteor-cli/.meteor/meteor ] && exit 0
echo "Installing Meteor $RELEASE into .meteor-cli/ ..."
mkdir -p .meteor-cli
curl -fsSL "https://static.meteor.com/packages-bootstrap/$RELEASE/meteor-bootstrap-os.osx.x86_64.tar.gz" | tar -xzf - -C .meteor-cli -o
