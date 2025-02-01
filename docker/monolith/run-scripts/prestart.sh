#!/bin/sh
cat << EOF
Welcome to Tivet

Configuration:

  Tivet Server:

    Dashboard:        http://127.0.0.1:8080/ui/
    API:              127.0.0.1:8080
    Edge API:         127.0.0.1:8081
    Orchestrator:     127.0.0.1:8082
    Object Storage:   127.0.0.1:9000

  Tivet Guard:

    HTTP:             127.0.0.1:7080
    HTTPS:            127.0.0.1:7443
    TCP & UDP:        127.0.0.1:7500-7599

  Tivet Client:

    Host Networking:  127.0.0.1:7600-7699

Resources:

  Quickstart:         https://tivet.gg/docs/quickstart
  Operation:          https://tivet.gg/docs/self-hosting
  Documentation:      https://tivet.gg/docs
  Discord:            https://tivet.gg/discord

Starting Tivet...
EOF

# Sleep for infinity since this service will be restarted if it exits
sleep infinity

