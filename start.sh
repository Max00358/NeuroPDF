#!/bin/bash

# strict error handling
set -e

# Activate virtual environment
source ./venv/bin/activate

# clean background processes on Ctrl + C
cleanup(){
    echo ""
    echo "Caught Ctrl + C. Shutting down..."
    if [[ -n "$FASTAPI_PID" ]]; then
        echo "Killing FastAPI (PID $FASTAPI_PID)..."
        kill $FASTAPI_PID
    fi
    exit 0
}
trap cleanup SIGINT
trap cleanup EXIT

# Start FastAPI backend (async, &: background)
cd server/py_service
#uvicorn main:app --host 127.0.0.1 --port 7860 &
uvicorn main:app --host 127.0.0.1 --port 7860 --loop asyncio --interface asgi3 &
FASTAPI_PID=$!

# Wait for FastAPI to become available
# check if FastAPI started: http://localhost:7860/docs#/
until curl --silent http://127.0.0.1:7860/docs > /dev/null; do
    echo "FastAPI starting..."
    sleep 2
done

cd ../../
npm run dev

cleanup