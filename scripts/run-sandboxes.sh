#!/bin/bash
set -euo pipefail

# C2 Concierge Sandbox Runner
# Phase 0: Start all three sandboxes for local testing

echo "🚀 C2 Concierge - Starting Phase 0 Sandboxes"

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Function to check if port is in use
port_in_use() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to wait for port to be available
wait_for_port() {
    local port=$1
    local timeout=${2:-30}
    local count=0
    
    echo "⏳ Waiting for port $port to be ready..."
    while ! port_in_use $port && [ $count -lt $timeout ]; do
        sleep 1
        count=$((count + 1))
    done
    
    if port_in_use $port; then
        echo "✅ Port $port is ready"
        return 0
    else
        echo "❌ Port $port failed to start within $timeout seconds"
        return 1
    fi
}

# Function to start sandbox
start_sandbox() {
    local sandbox_name=$1
    local port=$2
    local sandbox_dir="$PROJECT_ROOT/sandboxes/$sandbox_name"
    
    echo "🏗️  Starting $sandbox_name sandbox on port $port..."
    
    if port_in_use $port; then
        echo "⚠️  Port $port is already in use, stopping existing process..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    
    # Check if sandbox directory exists
    if [[ ! -d "$sandbox_dir" ]]; then
        echo "❌ Sandbox directory not found: $sandbox_dir"
        return 1
    fi
    
    # Start the sandbox
    cd "$sandbox_dir"
    
    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        echo "📦 Installing dependencies for $sandbox_name..."
        pnpm install
    fi
    
    # Start the server in background
    PORT=$port node server.js > "$PROJECT_ROOT/.artifacts/logs/${sandbox_name}.log" 2>&1 &
    local pid=$!
    
    echo "🔄 Started $sandbox_name with PID $pid"
    echo $pid > "$PROJECT_ROOT/.artifacts/logs/${sandbox_name}.pid"
    
    # Wait for port to be ready
    if wait_for_port $port; then
        echo "✅ $sandbox_name is running on http://127.0.0.1:$port"
        return 0
    else
        echo "❌ Failed to start $sandbox_name"
        kill $pid 2>/dev/null || true
        return 1
    fi
}

# Create artifacts directory
mkdir -p "$PROJECT_ROOT/.artifacts/logs"

# Clean up any existing sandboxes
echo "🧹 Cleaning up existing sandboxes..."
for sandbox in strip-happy preserve-embed remote-only; do
    if [[ -f "$PROJECT_ROOT/.artifacts/logs/${sandbox}.pid" ]]; then
        local_pid=$(cat "$PROJECT_ROOT/.artifacts/logs/${sandbox}.pid")
        if kill -0 $local_pid 2>/dev/null; then
            echo "🛑 Stopping existing $sandbox (PID $local_pid)..."
            kill $local_pid
            sleep 2
            kill -9 $local_pid 2>/dev/null || true
        fi
        rm -f "$PROJECT_ROOT/.artifacts/logs/${sandbox}.pid"
    fi
done

# Start all sandboxes
echo ""
echo "🚀 Starting all sandboxes..."

# Start strip-happy (port 4101)
if ! start_sandbox "strip-happy" 4101; then
    echo "❌ Failed to start strip-happy sandbox"
    exit 1
fi

# Start preserve-embed (port 4102)
if ! start_sandbox "preserve-embed" 4102; then
    echo "❌ Failed to start preserve-embed sandbox"
    exit 1
fi

# Start remote-only (port 4103)
if ! start_sandbox "remote-only" 4103; then
    echo "❌ Failed to start remote-only sandbox"
    exit 1
fi

# Wait a moment for all sandboxes to fully start
sleep 3

echo ""
echo "✅ All sandboxes started successfully!"
echo ""
echo "📊 Sandbox URLs:"
echo "   - Strip-happy:    http://127.0.0.1:4101"
echo "   - Preserve-embed: http://127.0.0.1:4102"
echo "   - Remote-only:    http://127.0.0.1:4103"
echo ""
echo "🏥 Health checks:"
echo "   - Strip-happy:    http://127.0.0.1:4101/health"
echo "   - Preserve-embed: http://127.0.0.1:4102/health"
echo "   - Remote-only:    http://127.0.0.1:4103/health"
echo ""
echo "📝 Logs available in: $PROJECT_ROOT/.artifacts/logs/"
echo ""
echo "🎯 Sandboxes are ready for Phase 0 acceptance testing!"
echo ""
echo "💡 To stop sandboxes, run: ./scripts/stop-sandboxes.sh"
