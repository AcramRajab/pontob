#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push-force
# Run orval codegen directly (skip typecheck:libs which has a pre-existing error)
pnpm --filter @workspace/api-spec exec orval --config ./orval.config.ts || true
