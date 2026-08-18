INSERT INTO legal_documents (case_id, title, content, embedding)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'استئناف بخصوص الوثائق',
  'المستند يتعلق بالاستئناف وطلبات التوثيق وملفات المحكمة.',
  '[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]'::vector
);

UPDATE legal_documents
SET title = 'استئناف محدث', content = 'تم تحديث نص المستند بعد التعديل.'
WHERE case_id = '11111111-1111-1111-1111-111111111111';

DELETE FROM legal_documents
WHERE case_id = '11111111-1111-1111-1111-111111111111';
