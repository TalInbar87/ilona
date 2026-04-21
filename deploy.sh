#!/bin/bash
# =============================================
# deploy.sh — Build, commit, push, and deploy
# Usage: ./deploy.sh "commit message"
#        ./deploy.sh              (uses auto message)
# =============================================
set -e

# ── Colors ──────────────────────────────────
BOLD="\033[1m"
DIM="\033[2m"
GREEN="\033[32m"
YELLOW="\033[33m"
CYAN="\033[36m"
RED="\033[31m"
RESET="\033[0m"

ok()     { echo -e "  ${GREEN}✓${RESET} $1"; }
warn()   { echo -e "  ${YELLOW}⚠${RESET} $1"; }
err()    { echo -e "  ${RED}✗${RESET} $1"; }
info()   { echo -e "  ${CYAN}→${RESET} $1"; }
step()   { echo -e "\n${BOLD}${CYAN}[$1]${RESET} ${BOLD}$2${RESET}"; echo -e "${DIM}$(printf '─%.0s' {1..48})${RESET}"; }

# ── Resolve script directory ─────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo -e "${BOLD}🚀  Ilona Clinic — Deploy${RESET}"
echo -e "${DIM}  Build → Commit → Push → Vercel${RESET}"

# ── Commit message ───────────────────────────
COMMIT_MSG="${1:-"chore: update $(date '+%Y-%m-%d %H:%M')"}"

# ── Step 1: Check for .env.local ─────────────
step "1/5" "Environment check"
if [ ! -f ".env.local" ]; then
  err ".env.local not found. Run: node init.mjs"
  exit 1
fi
if grep -q "your_supabase_url_here" .env.local 2>/dev/null; then
  err ".env.local still has placeholder values. Run: node init.mjs"
  exit 1
fi
ok ".env.local looks good"

# ── Step 2: Type-check + build ───────────────
step "2/5" "Build (tsc + vite)"
npm run build
ok "Build passed"

# ── Step 3: Git ──────────────────────────────
step "3/5" "Git commit & push"

# Check if there's anything to commit
if git diff --quiet && git diff --cached --quiet && [ -z "$(git status --porcelain)" ]; then
  warn "Nothing to commit — working tree is clean"
else
  git add -A
  git commit -m "$COMMIT_MSG"
  ok "Committed: \"$COMMIT_MSG\""
fi

# Push
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push origin "$BRANCH"
ok "Pushed to origin/$BRANCH"

# ── Step 4: Vercel ───────────────────────────
step "4/5" "Deploy to Vercel"

if ! command -v vercel &>/dev/null; then
  warn "Vercel CLI not installed."
  info "Install it with:  npm i -g vercel"
  info "Then run:         vercel --prod"
  info ""
  info "Or connect via GitHub at https://vercel.com/new"
  info "(Vercel auto-deploys on every push to main)"
else
  if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
    vercel --prod --yes
    ok "Deployed to production"
  else
    vercel --yes
    ok "Deployed preview (branch: $BRANCH)"
    warn "Push to main to deploy to production"
  fi
fi

# ── Step 5: Done ─────────────────────────────
step "5/5" "Done"
echo ""
ok "All steps complete"
echo ""
