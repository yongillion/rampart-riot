#!/bin/sh
# start a static server for the project on :8080
cd "$(dirname "$0")/../.." && exec http-server -p 8080 -c-1 -s .
