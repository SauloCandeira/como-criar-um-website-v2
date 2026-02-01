# HKTech – Engineering Guidelines

## General
- TypeScript everywhere
- No domain importing infrastructure
- Repository pattern mandatory
- DTOs required for APIs

## Domain
- Entities are pure
- No Firebase logic in domain
- Events are explicit objects

## API
- REST only (for now)
- Versioned endpoints (/v1)
- Controllers thin, services thick

## Frontend
- React hooks for logic
- No business logic in components
- MyBot UI must be non-chat-centric

## Logging
- Structured logs
- UserId always present
- No sensitive data in logs
