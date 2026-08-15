// Sovereign Workflow Execution Engine (M92 → M51/M52/M53)
// Real-time event-driven automation that transforms M92 subtasks into executable operations

import { supabase, formatDate } from '@/lib/financeUtils';

export interface WorkflowExecutionContext {
  command_id: string;
  subtask_id: string;
  engine_code: string;
  engine_name_ar: string;
  task_title: string;
  task_description: string;
  department: string;
  execution_order: number;
  priority?: string;
  assigned_to?: string;
  case_id?: string;
}

// M51: Create internal task from subtask
export async function executeTaskCreation(ctx: WorkflowExecutionContext) {
  const taskData = {
    title: ctx.task_title,
    description: ctx.task_description,
    task_type: 'board_resolution',
    priority: ctx.priority || 'medium',
    status: 'open',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assigned_to: ctx.assigned_to || null,
    case_id: ctx.case_id || null,
    client_id: null,
    module_id: ctx.engine_code,
    resource_id: ctx.command_id,
    source_engine: ctx.engine_code,
    client_visible: false,
  };

  const { data: insertedTask, error: taskError } = await supabase
    .from('m51_internal_tasks')
    .insert(taskData)
    .select('id');

  if (taskError) {
    console.error('Task creation failed:', taskError);
    return { success: false, error: taskError.message, task_id: null };
  }

  // Log task creation
  const task_id = insertedTask?.[0]?.id;
  if (task_id) {
    await supabase.from('m51_task_activity').insert({
      task_id,
      action: 'created_by_m92',
      actor: 'M92 Orchestrator',
      detail: `تم إنشاء المهمة بواسطة الوكيل الذكي من الأمر: ${ctx.command_id}`,
    });
  }

  return { success: true, task_id };
}

// M52: Send notification email from subtask
export async function executeEmailDispatch(ctx: WorkflowExecutionContext) {
  const emailData = {
    from_mailbox: 'operations@sovereign-system.local',
    to_address: 'operations@sovereign-system.local',
    subject: `تنبيه من الوكيل الذكي: ${ctx.task_title}`,
    body: `
تم تفعيل عملية جديدة من الوكيل الذكي السيادي (M92):

**البيانات الأساسية:**
- المحرك: ${ctx.engine_name_ar} (${ctx.engine_code})
- المهمة: ${ctx.task_title}
- الوصف: ${ctx.task_description}
- القسم: ${ctx.department}
- ترتيب التنفيذ: ${ctx.execution_order}

**معرف الأمر:** ${ctx.command_id}
**معرف المهمة الفرعية:** ${ctx.subtask_id}

يرجى متابعة التنفيذ عبر لوحة تحكم المهام الداخلية.
`,
    priority: ctx.priority === 'critical' ? 'critical' : 'high',
    case_id: ctx.case_id || null,
    client_id: null,
    request_read_receipt: true,
    intent: 'meeting_invite',
  };

  const { data: sentEmail, error: emailError } = await supabase
    .from('m52_emails')
    .insert(emailData)
    .select('id');

  if (emailError) {
    console.error('Email dispatch failed:', emailError);
    return { success: false, error: emailError.message, email_id: null };
  }

  const email_id = sentEmail?.[0]?.id;
  if (email_id) {
    await supabase.from('m52_audit_logs').insert({
      email_id,
      action: 'dispatched_by_m92',
      actor: 'M92 Orchestrator',
      detail: `إرسال إشعار من الوكيل الذكي عن عملية: ${ctx.task_title}`,
    });
  }

  return { success: true, email_id };
}

// M53: Create document or template reference from subtask
export async function executeDocumentGeneration(ctx: WorkflowExecutionContext) {
  const docData = {
    document_number: `DOC-${ctx.command_id.slice(0, 8)}-${Date.now()}`,
    document_title: ctx.task_title,
    document_format: 'docx',
    stage: 'draft',
    encrypted: true,
    watermark_text: `محرر: M92 | أمر: ${ctx.command_id}`,
    description: ctx.task_description,
    template_used: false,
    template_id: null,
    created_by: 'M92',
  };

  const { data: createdDoc, error: docError } = await supabase
    .from('m53_documents')
    .insert(docData)
    .select('id');

  if (docError) {
    console.error('Document generation failed:', docError);
    return { success: false, error: docError.message, document_id: null };
  }

  const document_id = createdDoc?.[0]?.id;
  if (document_id) {
    await supabase.from('m53_audit_logs').insert({
      document_id,
      action: 'generated_by_m92',
      actor: 'M92 Orchestrator',
      detail: `تم إنشاء مستند من الوكيل الذكي للعملية: ${ctx.task_title}`,
      hash_chain: `M92-${ctx.command_id}`,
    });
  }

  return { success: true, document_id };
}

// Master workflow executor: Matches engine_code to execution handler
export async function executeWorkflowStep(ctx: WorkflowExecutionContext) {
  const executionResults = {
    task_created: false,
    email_sent: false,
    document_created: false,
    errors: [] as string[],
  };

  try {
    // Check if this subtask requires task creation (M51)
    if (['M10', 'M49', 'M51', 'M54', 'M77', 'M92', 'M102'].includes(ctx.engine_code)) {
      const taskResult = await executeTaskCreation(ctx);
      executionResults.task_created = taskResult.success;
      if (!taskResult.success) executionResults.errors.push(`Task creation: ${taskResult.error}`);
    }

    // Check if this subtask requires email dispatch (M52)
    if (['M51', 'M52', 'M91', 'M92', 'M102'].includes(ctx.engine_code)) {
      const emailResult = await executeEmailDispatch(ctx);
      executionResults.email_sent = emailResult.success;
      if (!emailResult.success) executionResults.errors.push(`Email dispatch: ${emailResult.error}`);
    }

    // Check if this subtask requires document generation (M53)
    if (['M10', 'M53', 'M54', 'M92', 'M102'].includes(ctx.engine_code)) {
      const docResult = await executeDocumentGeneration(ctx);
      executionResults.document_created = docResult.success;
      if (!docResult.success) executionResults.errors.push(`Document generation: ${docResult.error}`);
    }

    // Log the execution result
    await supabase.from('m92_audit_logs').insert({
      command_id: ctx.command_id,
      action: 'workflow_executed',
      actor: 'M92 Workflow Engine',
      actor_role: 'Orchestrator',
      detail: `تنفيذ خطوة سير العمل: ${ctx.task_title} | نتائج: ${JSON.stringify(executionResults)}`,
      severity: executionResults.errors.length > 0 ? 'warning' : 'info',
    });
  } catch (error) {
    console.error('Workflow execution error:', error);
    executionResults.errors.push(`Execution error: ${String(error)}`);
  }

  return executionResults;
}

// Batch workflow executor for all subtasks in a command
export async function executeFullWorkflow(commandId: string) {
  const workflowStatus = {
    command_id: commandId,
    total_subtasks: 0,
    successful_steps: 0,
    failed_steps: 0,
    started_at: new Date().toISOString(),
    completed_at: '',
  };

  try {
    // Fetch all subtasks for this command
    const { data: subtasks, error: fetchError } = await supabase
      .from('m92_subtasks')
      .select('*')
      .eq('command_id', commandId)
      .order('execution_order', { ascending: true });

    if (fetchError || !subtasks) {
      console.error('Failed to fetch subtasks:', fetchError);
      return { success: false, error: fetchError?.message, status: workflowStatus };
    }

    workflowStatus.total_subtasks = subtasks.length;

    // Execute each subtask in sequence
    for (const subtask of subtasks) {
      const ctx: WorkflowExecutionContext = {
        command_id: subtask.command_id,
        subtask_id: subtask.id,
        engine_code: subtask.engine_code,
        engine_name_ar: subtask.engine_name_ar,
        task_title: subtask.task_title,
        task_description: subtask.task_description,
        department: subtask.department,
        execution_order: subtask.execution_order,
        priority: subtask.priority,
      };

      const result = await executeWorkflowStep(ctx);
      if (result.errors.length === 0) {
        workflowStatus.successful_steps++;
      } else {
        workflowStatus.failed_steps++;
      }

      // Wait before next execution to avoid rate limiting
      await new Promise((r) => setTimeout(r, 200));
    }

    workflowStatus.completed_at = new Date().toISOString();

    // Update command status to executed
    await supabase.from('m92_commands').update({ status: 'executed' }).eq('id', commandId);

    return { success: true, status: workflowStatus };
  } catch (error) {
    console.error('Full workflow execution failed:', error);
    return { success: false, error: String(error), status: workflowStatus };
  }
}
