#!/usr/bin/env python3
"""Validate a CSL-JSON reference file has a top-level 'references' array."""

import json
import sys


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: validate_csl_json.py <path-to-references.json>", file=sys.stderr)
        return 1

    path = sys.argv[1]
    with open(path) as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"Error: {path} is invalid JSON: {e}")
            return 1

    if "references" not in data:
        print(f"Error: {path} missing references array")
        return 1

    print(f"✓ {path} is valid JSON with {len(data.get('references', []))} references")
    return 0


if __name__ == "__main__":
    sys.exit(main())
