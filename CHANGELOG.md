# Changelog

All notable changes to this project will be documented in this file.

## [0.0.2] - 2026-04-25

### Added
- Maintenance tools with 3 operation modes (normal, maintenance, stats)
- Storage statistics and queue management functions
- Comprehensive error handling and atomic file operations
- Race condition protection for file operations
- Complete environment variable configuration via agent.json

### Changed
- All environment variable names to lowercase snake_case
- TypeScript module configuration to ESNext
- Configuration management to use agent.json instead of .env files

### Improved
- File-based storage with automatic cleanup of expired records
- Documentation with detailed guides (DATA_STRUCTURE.md, MAINTENANCE.md)

## [0.0.1] - 2026-04-25

### Added
- Initial project setup with file-based storage system
- RSS feed monitoring for Pantip forums
- Task queue management with FIFO processing
- Deduplication system with 7-day TTL
- Configurable worker and job scheduling via platform
- Comprehensive logging system
- Environment-based configuration via agent.json
- TypeScript support with strict mode