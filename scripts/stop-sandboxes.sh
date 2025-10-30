#!/bin/bash
set -euo pipefail

# C2 Concierge Sandbox Stopper
# Phase 0: Stop all running sandboxes

echo "🛑 C2 Concierge - Stopping Phase 0 Sandboxes"

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Function to stop sandbox
stop_sandbox() {
    local sandbox_name=$1
    local pid_file="$PROJECT_ROOT/.artifacts/logs/${sandbox_name}.pid"
    
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if kill -0 $pid 2>/dev/null; then
            echo "🛑 Stopping $sandbox_name (PID $pid)..."
            kill $pid
            sleep 2
            kill -9 $pid 2>/dev/null || true
            echo "✅ $sandbox_name stopped"
        else
            echo "⚠️  $sandbox_name PID $pid not running"
        fi
        rm -f "$pid_file"
    else
        echo "⚠️  No PID file found for $sandbox_name"
    fi
}

# Stop all sandboxes
echo ""
echo "🔄 Stopping all sandboxes..."

for sandbox in strip-happy preserve-embed remote-only; do
    stop_sandbox "$sandbox"
done

# Also kill any processes using the sandbox ports
echo ""
echo "🧹 Cleaning up any remaining processes on sandbox ports..."
for port in 4101 4102 4103; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "🔧 Killing process on port $port..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    fi
done

echo ""
echo "✅ All sandboxes stopped successfully!"
