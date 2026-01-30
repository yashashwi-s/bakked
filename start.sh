#!/bin/zsh

# Function to handle script termination
cleanup() {
    echo "\nStopping all services..."
    kill 0
    exit
}

# Trap SIGINT (Ctrl+C)
trap cleanup SIGINT

echo "🚀 Starting Bakked Development Environment..."

# Start Backend
echo "🔌 Starting Backend..."
# We use a subshell to activate conda just for this process without affecting the parent shell if sourced, 
# though as a script it runs in its own process anyway.
# We try to find conda hook.
(
    # Try standard locations or assume in path
    if [ -f "$HOME/anaconda3/etc/profile.d/conda.sh" ]; then
        source "$HOME/anaconda3/etc/profile.d/conda.sh"
    elif [ -f "$HOME/miniconda3/etc/profile.d/conda.sh" ]; then
        source "$HOME/miniconda3/etc/profile.d/conda.sh"
    else
        # Fallback: assuming conda is in PATH and initialized in .zshrc but scripts usually need explicit init
        # Try to eval hook
        eval "$(conda shell.zsh hook 2>/dev/null)" || echo "⚠️  Could not initialize conda. If backend fails, check conda path."
    fi
    
    conda activate website
    cd backend
    uvicorn app:app --reload --host 0.0.0.0 --port 8000
) &

# Start Frontend
echo "🎨 Starting Frontend..."
(
    cd frontend
    npm run dev
) &

# Wait for all background processes
wait
