#!/bin/bash
# PM2 wrapper: start backend with Python venv
cd /Users/harryfushen/personal/AI/CC/holiday-system/backend
source .venv/bin/activate
exec .venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
