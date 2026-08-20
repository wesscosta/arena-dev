#!/usr/bin/env sh
set -eu

docker run --rm \
  -v "$HOME/.m2:/root/.m2" \
  -v "$(pwd):/workspace" \
  -w /workspace \
  maven:3.9.11-eclipse-temurin-21 \
  mvn "$@"
