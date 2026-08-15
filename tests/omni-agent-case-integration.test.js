import test from 'node:test';
import assert from 'node:assert/strict';
import { decomposeCommand } from '../src/lib/omniAgentEngine.ts';
import { buildCaseLibraryContext } from '../src/lib/legalLibraryIntegration.ts';
import { buildLegalLibraryPayload, insertLegalLibrarySource } from '../src/lib/legalSourceManager.ts';
import { canAccessModule, evaluateCommandAccess } from '../src/lib/accessControl.ts';

test('case management command includes sovereign agent and smart case core', () => {
  const result = decomposeCommand('افتح قضية دعوى 2025/134 وأعد مذكرة الدفاع');

  assert.equal(result.intent, 'case_management');
  assert.equal(result.intentLabel, 'إدارة قضية');
  assert.ok(result.subtasks.some((subtask) => subtask.engine_code === 'M10'));
  assert.ok(result.subtasks.some((subtask) => subtask.engine_code === 'M92'));
  assert.ok(result.subtasks.some((subtask) => subtask.task_title.includes('قضية')));
});

test('project establishment command routes to legal core and sovereign audit', () => {
  const result = decomposeCommand('قم بتأسيس مصنع سيراميك وإعداد عقود التوزيع');

  assert.equal(result.intent, 'project_establishment');
  assert.equal(result.intentLabel, 'تأسيس مشروع');
  assert.ok(result.subtasks.some((subtask) => subtask.engine_code === 'M10'));
  assert.ok(result.subtasks.some((subtask) => subtask.engine_code === 'M92'));
  assert.ok(result.subtasks.some((subtask) => (subtask.task_description || '').includes('النواة') || (subtask.task_description || '').includes('التدقيق')));
});

test('security incident command adds audit trail through sovereign agent', () => {
  const result = decomposeCommand('تم رصد محاولة اختراق من IP 10.0.0.5 — أنشئ تذكرة تحقيق أمني');

  assert.equal(result.intent, 'security_incident');
  assert.equal(result.intentLabel, 'تحقيق أمني');
  assert.ok(result.subtasks.some((subtask) => subtask.engine_code === 'M89'));
  assert.ok(result.subtasks.some((subtask) => subtask.engine_code === 'M92'));
});

test('financial operation command keeps sovereign audit in the workflow', () => {
  const result = decomposeCommand('احسب أتعاب المحامي أحمد ووزع أرباح الشركاء');

  assert.equal(result.intent, 'financial_operation');
  assert.equal(result.intentLabel, 'عملية مالية');
  assert.ok(result.subtasks.some((subtask) => subtask.engine_code === 'M54'));
  assert.ok(result.subtasks.some((subtask) => subtask.engine_code === 'M92'));
});

test('case library context synthesizes legal search terms from case details', () => {
  const context = buildCaseLibraryContext({
    title: 'دعوى إخلاء عقار',
    legal_basis: 'المادة 41 من القانون المدني',
    case_number: '2025/134',
    court: 'محكمة الاستئناف',
  });

  assert.equal(context.section, 'search-legislation');
  assert.match(context.query, /دعوى إخلاء عقار|المادة 41|2025\/134|محكمة الاستئناف/);
});

test('legal library payload maps a regulation to the legislation table', () => {
  const payload = buildLegalLibraryPayload({
    kind: 'legislation',
    title: 'قانون الشركات',
    number: '159',
    year: 1981,
    type: 'قانون',
    authority: 'رئاسة الجمهورية',
    publicationDate: '2024-01-01',
    fullText: 'نص قانوني تجريبي',
  });

  assert.equal(payload.table, 'legislation');
  assert.equal(payload.record.title, 'قانون الشركات');
  assert.equal(payload.record.type, 'قانون');
});

test('legal library source insertion helper accepts scholarly records', () => {
  const result = insertLegalLibrarySource({
    kind: 'scholarly',
    title: 'رسالة دكتوراه في العقود الإدارية',
    author: 'أ. د. أحمد علي',
    year: 2024,
    summary: 'دراسة في العقود الإدارية',
    category: 'رسالة دكتوراه',
  });

  assert.equal(result.table, 'subject_index');
  assert.equal(result.record.subject_name, 'رسالة دكتوراه في العقود الإدارية');
});

test('module access control blocks a forbidden sector before routing', () => {
  const decision = canAccessModule('quarries-mining', ['real-estate', 'agenda']);

  assert.equal(decision.allowed, false);
  assert.equal(decision.status, 403);
  assert.match(decision.reason, /غير مفعّل|غير مسموح|باقة/);
});

test('command access control denies a blocked engine before execution', () => {
  const decision = evaluateCommandAccess([
    { engine_code: 'M103', task_title: 'استخراج عقد استغلال محاجر' },
    { engine_code: 'M90', task_title: 'تجهيز عقد بيع دولي' },
  ], ['real-estate', 'agenda']);

  assert.equal(decision.allowed, false);
  assert.equal(decision.status, 403);
  assert.ok(decision.blockedEngines.includes('M103'));
});
