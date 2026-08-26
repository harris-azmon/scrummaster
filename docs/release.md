# Release Packaging Guide

This repository publishes releases via **GitHub Releases**. That is the canonical distribution point for the bundled artifacts.

## Recommended Release Flow

1. Ensure artifacts are current:

   ```bash
   python scripts/sync_skills.py
   python scripts/validate_artifacts.py
   ```

2. Build the core package (if not already built):

   ```bash
   ./scripts/build_core.sh
   ```

3. Create a GitHub Release:
   - Use the existing release automation (`release-please`) or create a tag manually.
   - The workflows will upload `scrummaster-release.tar.gz` and the `scrummaster-core` distribution files to the release.

## Automation References

- `.github/workflows/release-please.yml` (creates release + uploads assets)
- `.github/workflows/package-and-upload-assets.yml` (packages core + tarball)

## Tooling Note

Python remains the primary local automation path for packaging and release
scripts. Node tooling is limited to building `mcp` and `mcp-server`.
