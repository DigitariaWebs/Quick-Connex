#!/bin/bash

# Comprehensive Authentication Test Runner
# Handles server management, rate limiting, and test execution

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_PORT=3000
TEST_SCRIPT="scripts/comprehensive-auth-test.js"
MAX_RETRIES=3
RETRY_DELAY=5

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if server is running
check_server() {
    curl -s -f "http://localhost:$SERVER_PORT/api/auth/verify" > /dev/null 2>&1 || return 1
    return 0
}

# Start server
start_server() {
    log_info "Starting development server..."
    
    # Kill any existing processes
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "node.*next" 2>/dev/null || true
    
    # Wait for processes to die
    sleep 2
    
    # Start server in background
    npm run dev > server.log 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to start
    log_info "Waiting for server to start..."
    for i in {1..30}; do
        if check_server; then
            log_success "Server started successfully (PID: $SERVER_PID)"
            return 0
        fi
        sleep 1
    done
    
    log_error "Server failed to start within 30 seconds"
    return 1
}

# Stop server
stop_server() {
    log_info "Stopping server..."
    
    # Kill server process
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    
    # Kill any remaining processes
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "node.*next" 2>/dev/null || true
    
    # Wait for processes to die
    sleep 2
    
    log_success "Server stopped"
}

# Clean up sessions and rate limits
cleanup_auth_state() {
    log_info "Cleaning up authentication state..."
    
    # Run cleanup script if it exists
    if [ -f "scripts/essentials/cleanup-sessions.js" ]; then
        node scripts/essentials/cleanup-sessions.js
    fi
    
    if [ -f "scripts/essentials/clear-sessions.js" ]; then
        node scripts/essentials/clear-sessions.js
    fi
    
    log_success "Authentication state cleaned up"
}

# Run tests with retry logic
run_tests() {
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        log_info "Running authentication tests (attempt $attempt/$MAX_RETRIES)..."
        
        if node $TEST_SCRIPT; then
            log_success "All tests passed!"
            return 0
        else
            log_warning "Tests failed on attempt $attempt"
            
            if [ $attempt -lt $MAX_RETRIES ]; then
                log_info "Restarting server and cleaning up state..."
                stop_server
                cleanup_auth_state
                sleep $RETRY_DELAY
                start_server
            fi
            
            attempt=$((attempt + 1))
        fi
    done
    
    log_error "All test attempts failed"
    return 1
}

# Main execution
main() {
    log_info "Starting Comprehensive Authentication Test Suite"
    log_info "=============================================="
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        log_error "Please run this script from the project root directory"
        exit 1
    fi
    
    # Check if test script exists
    if [ ! -f "$TEST_SCRIPT" ]; then
        log_error "Test script not found: $TEST_SCRIPT"
        exit 1
    fi
    
    # Check if server is already running
    if check_server; then
        log_warning "Server is already running. Stopping it first..."
        stop_server
    fi
    
    # Start server
    if ! start_server; then
        log_error "Failed to start server"
        exit 1
    fi
    
    # Clean up any existing state
    cleanup_auth_state
    
    # Run tests
    if run_tests; then
        log_success "Test suite completed successfully!"
        exit 0
    else
        log_error "Test suite failed after $MAX_RETRIES attempts"
        exit 1
    fi
}

# Cleanup on exit
cleanup() {
    log_info "Cleaning up..."
    stop_server
    log_info "Cleanup complete"
}

# Set up signal handlers
trap cleanup EXIT INT TERM

# Run main function
main "$@"
