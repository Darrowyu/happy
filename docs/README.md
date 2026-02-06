# Happy Docs

This folder documents how Happy works internally, with a focus on protocol, backend architecture, deployment, and the CLI tool. Start here.

## 快速开始

**新用户？** 先看 [quickstart.md](./quickstart.md) 快速上手 OpenCode 本地模式。

## Index
- [quickstart.md](./quickstart.md): OpenCode 本地模式快速使用指南。
- protocol.md: Wire protocol (WebSocket), payload formats, sequencing, and concurrency rules.
- api.md: HTTP endpoints and authentication flows.
- encryption.md: Encryption boundaries and on-wire encoding.
- backend-architecture.md: Internal backend structure, data flow, and key subsystems.
- deployment.md: How to deploy the backend and required infrastructure.
- cli-architecture.md: CLI and daemon architecture and how they interact with the server.

## Conventions
- Paths and field names reflect the current implementation in `packages/happy-server`.
- Examples are illustrative; the canonical source is the code.
