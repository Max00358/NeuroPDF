#!/bin/bash

# Activate virtual environment
source ./venv/bin/activate

# Start FastAPI backend (async, &: background)
cd server/py_service
uvicorn main:app --host 127.0.0.1 --port 7860 &

# Wait for FastAPI to become available
# check if FastAPI started: http://localhost:7860/docs#/
until curl --silent http://127.0.0.1:7860/docs > /dev/null; do
    echo "FastAPI starting..."
    sleep 1
done

cd ../../
npm run dev