#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push -- --accept-data-loss
pnpm --filter @workspace/api-spec run codegen || true
