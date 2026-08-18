-- Redis Stack / RediSearch index for semantic cache invalidation
-- Example usage after Redis Stack is started

FT.CREATE idx:semantic_cache
    ON HASH
    PREFIX 1 "semantic_cache:"
    SCHEMA
        case_id TAG
        doc_id TAG
        key TEXT
        vector VECTOR HNSW 6 TYPE FLOAT32 DIM 768 DISTANCE_METRIC COSINE
