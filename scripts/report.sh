#!/bin/bash
set -euo pipefail

# C2 Concierge Report Generator
# Phase 0: Generate HTML survival report from JSON

echo "📊 C2 Concierge - Generating Survival Report"

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ARTIFACTS_DIR="$PROJECT_ROOT/.artifacts"
ACCEPTANCE_DIR="$ARTIFACTS_DIR/acceptance"
REPORTGEN_DIR="$PROJECT_ROOT/apps/reportgen"

# Check if survival.json exists
SURVIVAL_JSON="$ACCEPTANCE_DIR/survival.json"
if [[ ! -f "$SURVIVAL_JSON" ]]; then
    echo "❌ Survival report not found: $SURVIVAL_JSON"
    echo "💡 Run acceptance tests first: pnpm -w test:acceptance"
    exit 1
fi

# Build reportgen if needed
echo "🏗️  Building report generator..."
cd "$REPORTGEN_DIR"
if [[ ! -d "dist" ]]; then
    pnpm build
fi

# Generate HTML report
echo "📝 Generating HTML report..."
REPORT_HTML="$ACCEPTANCE_DIR/report.html"
node dist/index.js "$SURVIVAL_JSON" "$REPORT_HTML"

echo ""
echo "✅ Survival report generated successfully!"
echo "📊 Report artifacts:"
echo "   - JSON: $SURVIVAL_JSON"
echo "   - HTML: $REPORT_HTML"
echo ""
echo "🌐 Open the report in your browser:"
echo "   open $REPORT_HTML"
echo ""
echo "📈 Summary:"
if command -v jq >/dev/null 2>&1; then
    echo "   - Run ID: $(jq -r '.run_id' "$SURVIVAL_JSON")"
    echo "   - Remote Survival: $(jq -r '.remote_survival_rate * 100' "$SURVIVAL_JSON" | cut -d. -f1)%"
    echo "   - Embed Survival: $(jq -r '.embed_survival_rate_preserve_only * 100' "$SURVIVAL_JSON" | cut -d. -f1)%"
    echo "   - Failed Scenarios: $(jq -r '.scenarios_failed' "$SURVIVAL_JSON")"
else
    echo "   (Install jq for detailed summary)"
fi
