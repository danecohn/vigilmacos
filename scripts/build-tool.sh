#!/bin/bash
# Compiles the tiny icon tool once (needs Xcode command line tools: xcode-select --install).
set -e
cd "$(dirname "$0")"
mkdir -p ../.bin && swiftc -O apply-icon.swift -o ../.bin/apply-icon
echo "built .bin/apply-icon"
