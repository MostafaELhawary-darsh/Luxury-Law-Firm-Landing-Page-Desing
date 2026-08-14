import { supabase } from '@/lib/financeUtils';

export interface TaskPayload {
  title: string;
  description?: string | null;
  task_type?: string;
  priority?: string;
  status?: string;
  due_date?: string | null;
  assigned_to?: string | null;
  case_id?: string | null;
  client_id?: string | null;
}

export async function fetchTasksData() {
  const [taskRes, attRes, clientRes, caseRes] = await Promise.all([
    supabase
      .from('lf_tasks')
      .select('*, assignee:lf_attorneys(name), case:lf_cases(case_number, case_title), client:lf_clients(name)')
      .order('due_date', { ascending: true }),
    supabase.from('lf_attorneys').select('*').order('name'),
    supabase.from('lf_clients').select('*').order('name'),
    supabase.from('lf_cases').select('id, case_number, case_title').order('case_number'),
  ]);

  const errors = [taskRes.error, attRes.error, clientRes.error, caseRes.error].filter(Boolean);
  if (errors.length > 0) {
    const err = errors[0];
    throw err;
  }

  return {
    tasks: (taskRes.data as any[]) || [],
    attorneys: (attRes.data as any[]) || [],
    clients: (clientRes.data as any[]) || [],
    cases: (caseRes.data as any[]) || [],
  };
}

export async function insertTask(payload: TaskPayload) {
  const { data, error } = await supabase.from('lf_tasks').insert(payload).select();
  return { data, error };
}

export async function updateTask(id: string, payload: TaskPayload) {
  const { data, error } = await supabase.from('lf_tasks').update(payload).eq('id', id).select();
  return { data, error };
}

export async function deleteTaskById(id: string) {
  const { data, error } = await supabase.from('lf_tasks').delete().eq('id', id).select();
  return { data, error };
}
