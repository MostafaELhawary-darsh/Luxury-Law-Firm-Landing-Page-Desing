CREATE OR REPLACE FUNCTION notify_legal_doc_change()
RETURNS trigger AS $$
DECLARE
    payload JSON;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        payload = json_build_object(
            'action', TG_OP,
            'doc_id', OLD.id,
            'case_id', OLD.case_id
        );
    ELSE
        payload = json_build_object(
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
AFTER INSERT OR UPDATE OF title, content, embedding, case_id OR DELETE ON legal_documents
FOR EACH ROW EXECUTE FUNCTION notify_legal_doc_change();
