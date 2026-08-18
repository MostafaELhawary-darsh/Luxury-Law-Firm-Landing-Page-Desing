CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS legal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_legal_documents_case_id
    ON legal_documents (case_id);

CREATE INDEX IF NOT EXISTS idx_legal_documents_updated_at
    ON legal_documents (updated_at DESC);

CREATE OR REPLACE FUNCTION notify_legal_doc_change()
RETURNS trigger AS $$
DECLARE
    payload JSONB;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        payload = jsonb_build_object(
            'action', TG_OP,
            'doc_id', OLD.id,
            'case_id', OLD.case_id
        );
    ELSE
        payload = jsonb_build_object(
            'action', TG_OP,
            'doc_id', NEW.id,
            'case_id', NEW.case_id,
            'title', NEW.title,
            'created_at', NEW.created_at
        );
    END IF;

    PERFORM pg_notify('doc_changes', payload::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_legal_doc_change ON legal_documents;

CREATE TRIGGER trg_legal_doc_change
AFTER INSERT OR UPDATE OF title, content, embedding, case_id, updated_at OR DELETE
ON legal_documents
FOR EACH ROW
EXECUTE FUNCTION notify_legal_doc_change();

CREATE OR REPLACE FUNCTION touch_legal_document_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_legal_document_updated_at ON legal_documents;

CREATE TRIGGER trg_touch_legal_document_updated_at
BEFORE UPDATE ON legal_documents
FOR EACH ROW
EXECUTE FUNCTION touch_legal_document_updated_at();
