# Shared SQL Directory

This directory serves as a placeholder for the shared SQL tier configuration.

## Configuration

The shared SQL directory is configured via:

1. **Environment variable**: `VITE_SQL_SHARED_PATH`
2. **UI override**: Settings panel (takes precedence)

## Intended Use

- Department-level SQL queries accessible to multiple users
- Network path or shared drive location
- Read/write access with appropriate permissions

## Example Paths

```bash
# Windows network share
VITE_SQL_SHARED_PATH=//fileserver/department/sql

# Mapped network drive
VITE_SQL_SHARED_PATH=S:/shared/sql

# Linux/Mac network mount
VITE_SQL_SHARED_PATH=/mnt/shared/sql
```

## Notes

- This local directory is NOT used for shared SQL storage
- It exists only as a marker in the source tree
- Actual shared SQL files live in the configured external path
