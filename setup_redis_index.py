#!/usr/bin/env python3
"""Setup Redis semantic cache index."""

import redis
import sys

try:
    # Connect to Redis
    r = redis.from_url("redis://redis:6379/0", decode_responses=False)
    print("[✓] Connected to Redis")
    
    # Try to delete existing index first
    try:
        r.execute_command("FT.DROPINDEX", "idx:semantic_cache")
        print("[✓] Old index deleted")
    except Exception as e:
        print(f"[*] No existing index to delete: {e}")
    
    # Create the index using raw Redis command
    print("[*] Creating index...")
    result = r.execute_command(
        "FT.CREATE", "idx:semantic_cache",
        "ON", "HASH",
        "PREFIX", "1", "semantic_cache:",
        "SCHEMA",
        "case_id", "TAG",
        "doc_id", "TAG",
        "key", "TEXT",
        "vector", "VECTOR", "HNSW", "6",
        "TYPE", "FLOAT32",
        "DIM", "768",
        "DISTANCE_METRIC", "COSINE"
    )
    print(f"[✓] Index created: {result}")
    
    # Verify using INFO
    print("[*] Verifying index...")
    info = r.execute_command("FT.INFO", "idx:semantic_cache")
    if isinstance(info, list) and len(info) > 0:
        print(f"[✓] Index info retrieved successfully")
        print(f"[✓] Index has {len(info)} properties")
    else:
        print(f"[✓] Index info: {info}")
    
    print("\n[SUCCESS] Redis semantic-cache index is ready!")
    sys.exit(0)
    
except Exception as e:
    print(f"[ERROR] {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
