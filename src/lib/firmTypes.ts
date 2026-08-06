export type FirmModule =
  | 'agenda'
  | 'clients'
  | 'poa'
  | 'tasks'
  | 'staff'
  | 'banking'
  | 'meetings'
  | 'tracker'
  | 'talent'
  | 'cockpit'
  | 'laas'
  | 'permissions'
  | 'documents'
  | 'internal-tasks'
  | 'omni-agent'
  | 'sovereign-mail'
  | 'risk-engine'
  | 'civil-commercial'
  | 'admin-court'
  | 'state-council'
  | 'economic-court'
  | 'family-court'
  | 'labor-court'
  | 'arbitration'
  | 'dispute-committees'
  | 'execution'
  | 'smart-case'
  | 'trademarks'
  | 'patents'
  | 'copyrights'
  | 'cyber-security'
  | 'cyber-crime'
  | 'digital-signature'
  | 'digital-publishing'
  | 'digital-assets'
  | 'commercial-contracts'
  | 'merger-acquisition'
  | 'fdi'
  | 'real-estate'
  | 'distribution'
  | 'maritime-commerce'
  | 'strategic-finance'
  | 'antitrust'
  | 'inheritance'
  | 'endowment'
  | 'civil-contracts'
  | 'compensation'
  | 'joint-property'
  | 'oral-contracts'
  | 'real-estate-security'
  | 'consular-affairs'
  | 'customs-tax'
  | 'environmental'
  | 'energy-resources'
  | 'consumer-protection'
  | 'sports'
  | 'academic'
  | 'pre-university'
  | 'local-administration'
  | 'transport-logistics'
  | 'administrative-governance'
  | 'internal-investigations'
  | 'knowledge-management'
  | 'integrated-documents'
  | 'bulk-archiver'
  | 'boardroom-governance'

  | 'sovereign-storage'
  | 'audio-transcription'
  | 'wellness'
  | 'syndicates'
  | 'medical-institutions'
  | 'engineering-consulting'
  | 'economic-investment'
  | 'embassies-consular'
  | 'cross-border-contracts'
  | 'intl-organizations'
  | 'ngos-civil-society'
  | 'social-insurance'
  | 'labor-relations'
  | 'press-media'
  | 'banking-finance'
  | 'inhouse-legal'
  | 'human-resources'
  | 'compound-hoa'
  | 'sports-clubs'
  | 'family-welfare'
  | 'media-production'
  | 'telecom-it-data'
  | 'real-estate-asset'
  | 'railways-metro'
  | 'legal-accounting'
  | 'tourism-hotels'
  | 'industrial-sector'
  | 'wholesale-retail'
  | 'private-security'
  | 'import-export'
  | 'health-safety'
  | 'marketing-ads'
  | 'automotive-trade'
  | 'automotive-manufacturing'
  | 'fertilizers-chemicals'
  | 'foreign-residency'
  | 'capital-markets'
  | 'shopping-mall'
  | 'library-archive'
  | 'maintenance-warranty'
  | 'integration-synergy'
  | 'quarries-mining'
  | 'ceramics-porcelain'
  | 'arbitration-hub'
  | 'food-security'
  | 'iot-bridge'
  | 'disaster-recovery'
  | 'biometric-gateway'
  | 'vault-connector'
  | 'swarm-intelligence'
  | 'neural-memory'
  | 'sovereign-delegation'
  | 'criminal-law'
  | 'moj-integration'
  | 'corporate-governance'
  | 'crisis-management'
  | 'hse-internal'
  | 'quality-assurance'
  | 'free-professions'
  | 'corporate-commercial'
  | 'genoffice-editor';

export interface M110VaultProvider {
  id: string;
  provider_code: string;
  provider_name: string;
  provider_name_ar: string;
  provider_type: string;
  api_endpoint: string | null;
  protocol_type: string;
  auth_method: string;
  rate_limit_per_min: number;
  rate_limit_per_hour: number;
  active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface M110VaultPull {
  id: string;
  pull_number: string;
  pull_title: string;
  provider_id: string | null;
  provider_code: string | null;
  pull_type: string;
  stage: string;
  status: string;
  source_format: string | null;
  source_url: string | null;
  file_hash_pre: string | null;
  malware_scan_passed: boolean;
  sanitized: boolean;
  content_hash: string | null;
  hash_algorithm: string;
  digital_signature: string | null;
  hsm_key_id: string | null;
  sealed: boolean;
  sealed_at: string | null;
  vault_partition: string | null;
  worm_committed: boolean;
  worm_committed_at: string | null;
  storage_path: string | null;
  metadata_extracted: Record<string, unknown> | null;
  entity_id_linked: string | null;
  ocr_processed: boolean;
  ocr_text: string | null;
  retrieval_count: number;
  last_retrieved_at: string | null;
  tunnel_id: string | null;
  m85_tax_linked: boolean;
  m10_case_opened: boolean;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m92_notified: boolean;
  m109_biometric_signed: boolean;
  cost_center_id: string | null;
  ecdh_key_exchange: string | null;
  payload_encrypted: boolean;
  rate_limited: boolean;
  description: string | null;
  advisor_id: string | null;
  created_at: string;
  updated_at: string;
  provider?: M110VaultProvider;
  advisor?: { name: string };
}

export interface M110VaultAudit {
  id: string;
  pull_id: string | null;
  provider_code: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  stage: string | null;
  detail: string | null;
  hash_chain: string;
  previous_hash: string | null;
  created_at: string;
}

export interface M111SwarmCluster {
  id: string;
  cluster_code: string;
  cluster_name: string;
  cluster_name_ar: string;
  cluster_type: string;
  sub_agent_name: string | null;
  sub_agent_name_ar: string | null;
  engines_linked: string[];
  autonomous_scope: string | null;
  decision_authority: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface M111SwarmMission {
  id: string;
  mission_number: string;
  mission_title: string;
  cluster_id: string | null;
  cluster_code: string | null;
  commander_id: string | null;
  parent_mission_id: string | null;
  status: string;
  priority: string;
  decomposed_tasks: Record<string, unknown>[] | null;
  execution_plan: string | null;
  autonomous_execution: boolean;
  result_fingerprint: string | null;
  result_summary: string | null;
  encrypted: boolean;
  m92_notified: boolean;
  m109_biometric_required: boolean;
  m109_biometric_signed: boolean;
  scope_permissions: string[];
  knowledge_graph_refs: string[];
  created_at: string;
  updated_at: string;
  cluster?: M111SwarmCluster;
}

export interface M111SwarmCommunication {
  id: string;
  mission_id: string | null;
  from_cluster: string;
  to_cluster: string | null;
  message_type: string;
  message_content: string | null;
  encrypted: boolean;
  hash_chain: string;
  previous_hash: string | null;
  created_at: string;
}

export interface M112NeuralEntity {
  id: string;
  entity_id: string;
  entity_type: string;
  entity_name: string;
  entity_name_ar: string | null;
  source_engine: string | null;
  source_table: string | null;
  source_record_id: string | null;
  embedding_vector: number[];
  metadata: Record<string, unknown> | null;
  encrypted: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface M112NeuralRelation {
  id: string;
  source_entity_id: string;
  target_entity_id: string;
  relation_type: string;
  relation_strength: number;
  context: string | null;
  evidence_engine: string | null;
  evidence_record_id: string | null;
  auto_generated: boolean;
  human_verified: boolean;
  encrypted: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  source_entity?: M112NeuralEntity;
  target_entity?: M112NeuralEntity;
}

export interface M112NeuralEvolution {
  id: string;
  evolution_type: string;
  trigger_engine: string | null;
  trigger_event: string | null;
  entity_id_affected: string | null;
  relation_id_affected: string | null;
  proactive_action: string | null;
  proactive_target_engine: string | null;
  proactive_target_id: string | null;
  executed: boolean;
  m102_integration: boolean;
  m92_notified: boolean;
  context_summary: string | null;
  hash_chain: string;
  previous_hash: string | null;
  created_at: string;
}

export interface M113DelegationRequest {
  id: string;
  request_number: string;
  request_title: string;
  requester_id: string | null;
  requester_name: string | null;
  requester_role: string | null;
  target_files: string[];
  emergency_level: string;
  quorum_required: number;
  quorum_collected: number;
  status: string;
  trigger_reason: string | null;
  m109_biometric_failed: boolean;
  m109_failure_count: number;
  manual_declaration: boolean;
  quorum_members: string[];
  signatures: Record<string, unknown>[] | null;
  emergency_token: string | null;
  token_issued: boolean;
  token_issued_at: string | null;
  token_expires_at: string | null;
  token_scope: string | null;
  m52_notified: boolean;
  m49_board_vote: boolean;
  m92_monitoring: boolean;
  m108_continuity: boolean;
  shamir_shares: number;
  shamir_threshold: number;
  zk_audit_frozen: boolean;
  hash_chain: string;
  previous_hash: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface M113QuorumVote {
  id: string;
  delegation_id: string;
  voter_id: string;
  voter_name: string;
  voter_role: string;
  vote_decision: string;
  e_token_id: string | null;
  digital_signature: string | null;
  signed_at: string | null;
  clearance_level: string | null;
  hash_chain: string;
  previous_hash: string | null;
  created_at: string;
}

export interface M113DelegationAudit {
  id: string;
  delegation_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  microsecond_ts: string | null;
  hash_chain: string;
  previous_hash: string | null;
  immutable: boolean;
  created_at: string;
}

export interface Case {
  id: string;
  case_number: string;
  case_title: string;
  case_type: string;
  court_level: string;
  court_name: string;
  subject: string;
  client_id: string | null;
  responsible_attorney_id: string | null;
  opposing_party: string;
  status: string;
  filed_date: string | null;
  next_session_date: string | null;
  client?: { name: string; company: string };
  attorney?: { name: string };
}

export interface CourtSession {
  id: string;
  case_id: string;
  session_date: string;
  session_time: string;
  court_name: string;
  circuit: string;
  session_type: string;
  attendees_plaintiff: boolean;
  attendees_defendant: boolean;
  documents_submitted: string | null;
  requests_submitted: string | null;
  defenses_submitted: string | null;
  memos_submitted: string | null;
  court_decision: string | null;
  ruling_text: string | null;
  status: string;
  case?: Case;
}

export interface POA {
  id: string;
  poa_number: string;
  poa_type: string;
  client_id: string | null;
  issued_date: string;
  expiry_date: string | null;
  scope: string;
  notary_name: string;
  status: string;
  document_url: string | null;
  client?: { name: string; company: string };
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  priority: string;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  case_id: string | null;
  client_id: string | null;
  assignee?: { name: string };
  case?: { case_number: string; case_title: string };
  client?: { name: string };
}

export interface StaffMember {
  id: string;
  attorney_id: string;
  staff_type: string;
  department: string;
  hire_date: string;
  base_salary: number;
  allowances: number;
  bank_account: string | null;
  tax_id: string | null;
  social_insurance_number: string | null;
  status: string;
  attorney?: { name: string; role: string };
}

export interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  iban: string | null;
  account_type: string;
  currency: string;
  current_balance: number;
  status: string;
}

export interface Check {
  id: string;
  check_number: string;
  bank_account_id: string | null;
  client_id: string | null;
  check_type: string;
  amount: number;
  issue_date: string;
  due_date: string;
  payee: string;
  status: string;
  notes: string | null;
  bank?: { bank_name: string };
  client?: { name: string };
}

export interface Salary {
  id: string;
  staff_id: string;
  month: number;
  year: number;
  base_amount: number;
  allowances_amount: number;
  deductions: number;
  net_amount: number;
  payment_date: string | null;
  status: string;
  staff?: StaffMember;
}

export interface Meeting {
  id: string;
  title: string;
  meeting_type: string;
  scheduled_date: string;
  duration_minutes: number;
  platform: string;
  meeting_url: string | null;
  organizer_id: string | null;
  agenda: string | null;
  participants: string[];
  shared_documents: string[];
  status: string;
  language: string;
  organizer?: { name: string };
  privilege_mode?: boolean;
  recording_enabled?: boolean;
  encryption_key_ref?: string | null;
  mom_status?: string;
  is_internal?: boolean;
  max_participants?: number;
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  name: string;
  role: string;
  email: string | null;
  join_status: string;
  joined_at: string | null;
  is_host: boolean;
}

export interface MeetingPrivilegeCert {
  id: string;
  meeting_id: string;
  activated_at: string;
  deactivated_at: string | null;
  certificate_hash: string;
  issued_by: string;
}

export interface MeetingSignature {
  id: string;
  meeting_id: string;
  document_title: string;
  signer_name: string;
  signed_at: string;
  video_hash: string | null;
  pdf_hash: string | null;
  ip_address: string | null;
}

export interface MeetingAiPrompt {
  id: string;
  meeting_id: string;
  trigger_term: string;
  legal_reference: string | null;
  suggestion_text: string | null;
  shown_at: string;
  dismissed: boolean;
}

export interface MeetingTranscript {
  id: string;
  meeting_id: string;
  speaker: string | null;
  text_ar: string;
  text_translated: string | null;
  language: string;
  timestamp_sec: number;
}

export interface MeetingMinute {
  id: string;
  meeting_id: string;
  content: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface MeetingTask {
  id: string;
  meeting_id: string;
  minute_id: string | null;
  title: string;
  assignee: string | null;
  deadline: string | null;
  status: string;
  synced_to_trello: boolean;
  trello_card_id: string | null;
}

export interface MeetingCalendarSync {
  id: string;
  meeting_id: string;
  event_title: string;
  event_date: string;
  synced_to: string;
  sync_status: string;
}

export interface MeetingEmailDispatch {
  id: string;
  meeting_id: string;
  recipient: string;
  subject: string;
  sent_at: string;
  status: string;
  contains_video: boolean;
}

export interface InternalTask {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  priority: string;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  case_id: string | null;
  client_id: string | null;
  module_id: string | null;
  resource_id: string | null;
  source_engine: string | null;
  auto_generated: boolean;
  client_visible: boolean;
  hours_logged: number;
  tags: string[];
  encrypted_attachments: string[];
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  assignee?: { name: string };
  case?: { case_number: string; case_title: string };
  client?: { name: string };
}

export interface TaskActivityEntry {
  id: string;
  task_id: string;
  actor: string | null;
  action: string;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author: string | null;
  body: string;
  created_at: string;
}

export interface OmniEngine {
  id: string;
  engine_code: string;
  engine_name: string;
  engine_name_ar: string;
  category: string;
  department: string | null;
  description: string | null;
  icon: string;
  active: boolean;
  can_activate: boolean;
  created_at: string;
}

export interface OmniCommand {
  id: string;
  raw_input: string;
  input_type: string;
  intent: string | null;
  intent_confidence: number;
  entities: string[];
  status: string;
  total_subtasks: number;
  completed_subtasks: number;
  synthesis_output: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface OmniSubtask {
  id: string;
  command_id: string;
  engine_code: string;
  engine_name_ar: string | null;
  task_title: string;
  task_description: string | null;
  department: string | null;
  status: string;
  execution_order: number;
  result_data: Record<string, unknown>;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface OmniAuditLog {
  id: string;
  command_id: string;
  action: string;
  actor: string | null;
  engine_code: string | null;
  detail: string | null;
  severity: string;
  encryption_context: string;
  created_at: string;
}

export interface Mailbox {
  id: string;
  email_address: string;
  display_name: string;
  owner_type: string;
  owner_id: string | null;
  department: string | null;
  storage_quota_mb: number;
  storage_used_mb: number;
  pgp_public_key: string | null;
  pgp_fingerprint: string | null;
  smime_cert_ref: string | null;
  e2ee_enabled: boolean;
  status: string;
  created_at: string;
}

export interface SovereignEmail {
  id: string;
  mailbox_id: string;
  direction: string;
  from_address: string;
  to_address: string;
  cc_addresses: string | null;
  subject: string;
  body: string | null;
  attachments: string[];
  is_encrypted: boolean;
  encryption_method: string;
  is_read: boolean;
  read_at: string | null;
  read_receipt_sent: boolean;
  read_receipt_confirmed_at: string | null;
  is_archived: boolean;
  case_id: string | null;
  client_id: string | null;
  smart_parsed: boolean;
  parsed_entities: Record<string, unknown>;
  parsed_intent: string | null;
  auto_task_created: boolean;
  priority: string;
  has_invoice: boolean;
  invoice_processed: boolean;
  meeting_id: string | null;
  thread_id: string | null;
  created_at: string;
  case?: { case_number: string; case_title: string };
  client?: { name: string };
}

export interface MailAlias {
  id: string;
  alias_address: string;
  display_name: string | null;
  target_addresses: string[];
  department: string | null;
  alias_type: string;
  active: boolean;
  created_at: string;
}

export interface MailNotification {
  id: string;
  notification_type: string;
  recipient_address: string;
  recipient_name: string | null;
  subject: string;
  body: string | null;
  related_case_id: string | null;
  related_client_id: string | null;
  related_meeting_id: string | null;
  source_engine: string | null;
  status: string;
  scheduled_for: string;
  sent_at: string | null;
  read_at: string | null;
  priority: string;
  created_at: string;
}

export interface MailAuditLog {
  id: string;
  email_id: string | null;
  action: string;
  actor: string | null;
  detail: string | null;
  ip_address: string | null;
  encryption_context: string;
  created_at: string;
}

export interface InvoiceOcr {
  id: string;
  email_id: string;
  vendor_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  amount: number;
  currency: string;
  due_date: string | null;
  ocr_confidence: number;
  finance_status: string;
  finance_entry_id: string | null;
  created_at: string;
}

export interface RiskAssessment {
  id: string;
  title: string;
  description: string | null;
  risk_type: string;
  risk_level: string;
  probability: number;
  financial_impact: number;
  status: string;
  source_engine: string | null;
  case_id: string | null;
  client_id: string | null;
  contract_ref: string | null;
  document_ref: string | null;
  detected_conflicts: string[];
  recommended_actions: string[];
  board_escalated: boolean;
  board_meeting_id: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  case?: { case_number: string; case_title: string };
  client?: { name: string };
}

export interface ClauseExtraction {
  id: string;
  document_name: string;
  document_ref: string | null;
  clause_type: string;
  clause_text: string;
  obligation_party: string | null;
  deadline_date: string | null;
  penalty_text: string | null;
  penalty_amount: number;
  financial_exposure: number;
  risk_assessment_id: string | null;
  nlp_confidence: number;
  status: string;
  created_at: string;
}

export interface EarlyWarning {
  id: string;
  risk_assessment_id: string;
  warning_type: string;
  severity: string;
  message: string;
  target_engine: string | null;
  board_agenda_item: boolean;
  acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
}

export interface RiskDeadline {
  id: string;
  title: string;
  deadline_type: string;
  deadline_date: string;
  related_case_id: string | null;
  related_client_id: string | null;
  contract_ref: string | null;
  responsible_party: string | null;
  alert_sent_60d: boolean;
  alert_sent_30d: boolean;
  alert_sent_7d: boolean;
  draft_notice_generated: boolean;
  status: string;
  created_at: string;
}

export interface ZkAuditLog {
  id: string;
  operation_type: string;
  entity_ref: string | null;
  actor: string | null;
  detail: string | null;
  risk_level: string;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

export interface M01Case {
  id: string;
  case_number: string;
  case_title: string;
  case_type: string;
  dispute_type: string | null;
  stage: string;
  court: string | null;
  court_circuit: string | null;
  filing_date: string | null;
  next_hearing_date: string | null;
  judgment_date: string | null;
  judgment_outcome: string | null;
  is_final: boolean;
  financial_value: number;
  fees_paid: number;
  bail_amount: number;
  cost_center_id: string | null;
  assigned_attorney_id: string | null;
  m10_linked: boolean;
  m54_cost_center_opened: boolean;
  m53_archived: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  attorney?: { name: string };
}

export interface M01CaseParty {
  id: string;
  case_id: string;
  party_type: string;
  name: string;
  role: string | null;
  contact_info: string | null;
  legal_representation: string | null;
  created_at: string;
}

export interface M01ProceduralDeadline {
  id: string;
  case_id: string;
  deadline_type: string;
  deadline_label: string;
  deadline_date: string;
  days_from_event: number | null;
  trigger_event: string | null;
  status: string;
  completed_at: string | null;
  auto_inserted: boolean;
  created_at: string;
}

export interface M01CaseTask {
  id: string;
  case_id: string;
  task_title: string;
  task_description: string | null;
  assigned_to: string | null;
  source_hearing_date: string | null;
  status: string;
  priority: string;
  m51_synced: boolean;
  created_at: string;
}

export interface M01AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  ip_address: string | null;
  immutable: boolean;
  created_at: string;
}

export interface M02AdminCase {
  id: string;
  case_number: string;
  case_title: string;
  case_category: string;
  dispute_subtype: string | null;
  stage: string;
  court: string | null;
  court_circuit: string | null;
  challenged_decision: string | null;
  challenged_decision_date: string | null;
  challenged_authority: string | null;
  filing_date: string | null;
  next_hearing_date: string | null;
  judgment_date: string | null;
  judgment_outcome: string | null;
  is_final: boolean;
  success_rate_estimate: number;
  financial_value: number;
  court_fees: number;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m10_linked: boolean;
  m54_cost_center_opened: boolean;
  m59_contract_linked: boolean;
  m102_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M02AdminParty {
  id: string;
  case_id: string;
  party_type: string;
  name: string;
  role: string | null;
  authority_type: string | null;
  contact_info: string | null;
  legal_representation: string | null;
  created_at: string;
}

export interface M02AdminDeadline {
  id: string;
  case_id: string;
  deadline_type: string;
  deadline_label: string;
  deadline_date: string;
  days_from_event: number | null;
  trigger_event: string | null;
  statutory_basis: string | null;
  status: string;
  completed_at: string | null;
  auto_inserted: boolean;
  created_at: string;
}

export interface M02ConstitutionalReview {
  id: string;
  case_id: string | null;
  review_type: string;
  subject_title: string;
  subject_ref: string | null;
  constitutional_principle: string | null;
  review_result: string;
  findings: string | null;
  precedent_refs: string[];
  compliance_status: string;
  created_at: string;
}

export interface M02BiometricApproval {
  id: string;
  case_id: string | null;
  document_title: string;
  document_type: string | null;
  approver_name: string;
  approver_role: string | null;
  biometric_method: string;
  approval_status: string;
  approved_at: string | null;
  biometric_hash: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface M02AdminAuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

export interface M03StateCouncilCase {
  id: string;
  case_number: string;
  case_title: string;
  case_category: string;
  dispute_subtype: string | null;
  stage: string;
  court: string | null;
  court_circuit: string | null;
  challenged_decision: string | null;
  challenged_decision_date: string | null;
  challenged_authority: string | null;
  decision_type: string | null;
  filing_date: string | null;
  next_hearing_date: string | null;
  judgment_date: string | null;
  judgment_outcome: string | null;
  is_final: boolean;
  success_rate_estimate: number;
  financial_value: number;
  court_fees: number;
  compensation_claimed: number;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m10_linked: boolean;
  m54_cost_center_opened: boolean;
  m59_contract_linked: boolean;
  m92_notified: boolean;
  m52_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M03CouncilParty {
  id: string;
  case_id: string;
  party_type: string;
  name: string;
  role: string | null;
  authority_type: string | null;
  contact_info: string | null;
  legal_representation: string | null;
  created_at: string;
}

export interface M03CouncilDeadline {
  id: string;
  case_id: string;
  deadline_type: string;
  deadline_label: string;
  deadline_date: string;
  days_from_event: number | null;
  trigger_event: string | null;
  statutory_basis: string | null;
  status: string;
  completed_at: string | null;
  auto_inserted: boolean;
  created_at: string;
}

export interface M03ContractLink {
  id: string;
  case_id: string;
  contract_title: string;
  contract_ref: string | null;
  contract_type: string | null;
  contract_value: number;
  government_entity: string | null;
  compliance_status: string;
  compliance_findings: string | null;
  m59_synced: boolean;
  created_at: string;
}

export interface M03CouncilAuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

export interface M04EconomicCase {
  id: string;
  case_number: string;
  case_title: string;
  case_category: string;
  dispute_subtype: string | null;
  stage: string;
  court: string | null;
  court_circuit: string | null;
  filing_date: string | null;
  next_hearing_date: string | null;
  judgment_date: string | null;
  judgment_outcome: string | null;
  is_final: boolean;
  success_rate_estimate: number;
  financial_value: number;
  court_fees: number;
  total_claims: number;
  total_liabilities: number;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m10_linked: boolean;
  m54_cost_center_opened: boolean;
  m60_company_linked: boolean;
  m98_market_linked: boolean;
  m92_notified: boolean;
  m53_vault_sealed: boolean;
  m52_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M04EconomicParty {
  id: string;
  case_id: string;
  party_type: string;
  name: string;
  role: string | null;
  entity_type: string | null;
  registration_number: string | null;
  contact_info: string | null;
  legal_representation: string | null;
  created_at: string;
}

export interface M04FinancialLink {
  id: string;
  case_id: string;
  link_type: string;
  entity_name: string;
  entity_ref: string | null;
  financial_data: Record<string, unknown>;
  source_engine: string | null;
  retrieved_at: string;
  created_at: string;
}

export interface M04CostCenter {
  id: string;
  case_id: string;
  cost_center_code: string;
  description: string | null;
  total_claims: number;
  total_disbursed: number;
  total_received: number;
  status: string;
  m54_synced: boolean;
  opened_at: string;
  created_at: string;
}

export interface M04VaultDocument {
  id: string;
  case_id: string;
  document_title: string;
  document_type: string | null;
  file_ref: string | null;
  encryption_standard: string;
  vault_location: string;
  access_level: string;
  uploaded_by: string | null;
  uploaded_at: string;
  created_at: string;
}

export interface M04EconomicAuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

export interface M05FamilyCase {
  id: string;
  case_number: string;
  case_title: string;
  case_category: string;
  dispute_subtype: string | null;
  stage: string;
  court: string | null;
  court_circuit: string | null;
  filing_date: string | null;
  next_hearing_date: string | null;
  judgment_date: string | null;
  judgment_outcome: string | null;
  is_final: boolean;
  success_rate_estimate: number;
  monthly_alimony: number;
  total_alimony_awarded: number;
  estate_value: number;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m10_linked: boolean;
  m54_financial_linked: boolean;
  m80_child_linked: boolean;
  m27_inheritance_linked: boolean;
  m92_notified: boolean;
  m52_notified: boolean;
  confidentiality_level: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M05FamilyParty {
  id: string;
  case_id: string;
  party_type: string;
  name: string;
  role: string | null;
  national_id: string | null;
  date_of_birth: string | null;
  gender: string | null;
  contact_info: string | null;
  legal_representation: string | null;
  is_minor: boolean;
  created_at: string;
}

export interface M05CustodyArrangement {
  id: string;
  case_id: string;
  arrangement_type: string;
  child_name: string;
  child_age: number | null;
  custodian_name: string | null;
  visitation_schedule: string | null;
  visitation_frequency: string | null;
  travel_ban: boolean;
  safe_environment_verified: boolean;
  m80_synced: boolean;
  arrangement_status: string;
  notes: string | null;
  created_at: string;
}

export interface M05AlimonyOrder {
  id: string;
  case_id: string;
  alimony_type: string;
  payer_name: string;
  beneficiary_name: string;
  monthly_amount: number;
  start_date: string | null;
  end_date: string | null;
  total_awarded: number;
  collection_method: string;
  last_collected_date: string | null;
  next_collection_date: string | null;
  status: string;
  m54_synced: boolean;
  arrears: number;
  created_at: string;
}

export interface M05InheritanceLink {
  id: string;
  case_id: string;
  deceased_name: string;
  death_date: string | null;
  estate_description: string | null;
  total_estate_value: number;
  heirs_count: number;
  distribution_status: string;
  sharia_compliant: boolean;
  m27_synced: boolean;
  shares_summary: Record<string, string>;
  created_at: string;
}

export interface M05FamilyAuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  rbac_clearance: string;
  immutable: boolean;
  created_at: string;
}

// M9 — Execution & Enforcement
export interface M09Case {
  id: string;
  case_number: string;
  case_title: string;
  source_engine: string | null;
  source_case_number: string | null;
  source_case_id: string | null;
  stage: string;
  court: string | null;
  enforcement_writ_number: string | null;
  enforcement_writ_date: string | null;
  bailiff_name: string | null;
  bailiff_office: string | null;
  police_coordination: boolean;
  target_amount: number;
  collected_amount: number;
  enforcement_type: string;
  property_seized: string | null;
  assets_description: string | null;
  enforcement_location: string | null;
  filing_date: string | null;
  completion_date: string | null;
  enforcement_status: string;
  is_completed: boolean;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m10_linked: boolean;
  m54_collection_linked: boolean;
  m92_notified: boolean;
  m52_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M09Party {
  id: string;
  case_id: string;
  party_type: string;
  name: string;
  role: string | null;
  authority_type: string | null;
  contact_info: string | null;
  legal_representation: string | null;
  created_at: string;
}

export interface M09EnforcementAction {
  id: string;
  case_id: string;
  action_type: string;
  action_title: string;
  action_date: string;
  executed_by: string | null;
  result: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface M09Obstacle {
  id: string;
  case_id: string;
  obstacle_type: string;
  obstacle_title: string;
  obstacle_nature: string;
  filed_by: string | null;
  filed_date: string | null;
  legal_basis: string | null;
  response_memo: string | null;
  response_status: string;
  resolved_date: string | null;
  resolution: string | null;
  created_at: string;
}

export interface M09AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// M10 — Smart Case Core
export interface M10Case {
  id: string;
  case_number: string;
  case_title: string;
  source_engine: string | null;
  source_case_number: string | null;
  source_case_id: string | null;
  stage: string;
  operating_mode: string;
  case_category: string | null;
  court: string | null;
  court_circuit: string | null;
  filing_date: string | null;
  next_hearing_date: string | null;
  next_deadline_date: string | null;
  next_deadline_label: string | null;
  judgment_date: string | null;
  judgment_outcome: string | null;
  is_final: boolean;
  case_tree_encrypted: boolean;
  encryption_standard: string;
  facts_summary: string | null;
  legal_basis: string | null;
  parties_summary: string | null;
  evidence_summary: string | null;
  defense_draft: string | null;
  success_probability: number;
  financial_value: number;
  cost_center_id: string | null;
  assigned_attorney_id: string | null;
  client_name: string | null;
  client_type: string | null;
  m54_cost_center_opened: boolean;
  m92_task_distributed: boolean;
  m52_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  attorney?: { name: string };
}

export interface M10TreeNode {
  id: string;
  case_id: string;
  scm_case_id: string | null;
  node_type: string;
  node_title: string;
  node_content: string | null;
  parent_node_id: string | null;
  node_order: number;
  encrypted: boolean;
  created_at: string;
}

export interface M10Deadline {
  id: string;
  case_id: string;
  scm_case_id: string | null;
  deadline_type: string;
  deadline_label: string;
  deadline_date: string;
  statutory_basis: string | null;
  days_from_filing: number | null;
  status: string;
  completed_at: string | null;
  auto_calculated: boolean;
  created_at: string;
}

export interface M10DefenseDraft {
  id: string;
  case_id: string;
  scm_case_id: string | null;
  draft_title: string;
  draft_type: string;
  draft_content: string | null;
  legal_gaps_identified: string | null;
  generated_by: string;
  review_status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  version: number;
  created_at: string;
}

export interface M10AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// M11 — Trademarks & Industrial Designs
export interface M11Case {
  id: string;
  case_number: string;
  case_title: string;
  case_category: string;
  ip_type: string;
  stage: string;
  trademark_name: string | null;
  trademark_class: string | null;
  design_type: string | null;
  applicant_name: string | null;
  applicant_type: string;
  registration_number: string | null;
  filing_date: string | null;
  deposit_certificate_date: string | null;
  publication_date: string | null;
  opposition_deadline: string | null;
  registration_grant_date: string | null;
  renewal_date: string | null;
  status: string;
  is_registered: boolean;
  is_opposed: boolean;
  opposition_details: string | null;
  infringement_detected: boolean;
  infringement_details: string | null;
  financial_value: number;
  filing_fees: number;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m87_industry_linked: boolean;
  m81_media_linked: boolean;
  m54_finance_linked: boolean;
  m92_notified: boolean;
  m52_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M11SearchResult {
  id: string;
  case_id: string;
  similar_mark: string;
  similar_owner: string | null;
  similar_class: string | null;
  similarity_score: number;
  registration_number: string | null;
  status: string;
  conflict_risk: string;
  search_date: string | null;
  created_at: string;
}

export interface M11Opposition {
  id: string;
  case_id: string;
  opposer_name: string;
  opposition_grounds: string | null;
  opposition_date: string | null;
  response_deadline: string | null;
  response_filed: boolean;
  response_memo: string | null;
  status: string;
  outcome: string | null;
  created_at: string;
}

export interface M11Infringement {
  id: string;
  case_id: string;
  infringer_name: string;
  infringement_type: string | null;
  infringement_details: string | null;
  detection_date: string | null;
  action_taken: string | null;
  legal_action_filed: boolean;
  case_ref: string | null;
  status: string;
  damages_claimed: number;
  created_at: string;
}

export interface M11AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// M06 — Labor Court & Labor Offices
export interface M06Case {
  id: string;
  case_number: string;
  case_title: string;
  case_category: string;
  dispute_subtype: string | null;
  stage: string;
  complaint_ref: string | null;
  court: string | null;
  court_circuit: string | null;
  filing_date: string | null;
  next_hearing_date: string | null;
  judgment_date: string | null;
  judgment_outcome: string | null;
  is_final: boolean;
  settlement_attempted: boolean;
  settlement_result: string | null;
  financial_value: number;
  end_of_service_amount: number;
  leave_balance_amount: number;
  compensation_amount: number;
  court_fees: number;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  employer_name: string | null;
  employee_name: string | null;
  employment_start_date: string | null;
  employment_end_date: string | null;
  monthly_salary: number;
  m10_linked: boolean;
  m54_cost_center_opened: boolean;
  m73_labor_relations_linked: boolean;
  m77_hr_linked: boolean;
  m92_notified: boolean;
  m52_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M06Party {
  id: string;
  case_id: string;
  party_type: string;
  name: string;
  role: string | null;
  entity_type: string | null;
  contact_info: string | null;
  legal_representation: string | null;
  created_at: string;
}

export interface M06Deadline {
  id: string;
  case_id: string;
  deadline_type: string;
  deadline_label: string;
  deadline_date: string;
  statutory_basis: string | null;
  status: string;
  completed_at: string | null;
  auto_inserted: boolean;
  created_at: string;
}

export interface M06SettlementSession {
  id: string;
  case_id: string;
  session_date: string;
  session_type: string;
  attendees_employer: boolean;
  attendees_employee: boolean;
  outcome: string | null;
  minutes_text: string | null;
  next_session_date: string | null;
  created_at: string;
}

export interface M06AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// M07 — Arbitration Circuits (Local & International)
export interface M07Case {
  id: string;
  case_number: string;
  case_title: string;
  case_category: string;
  dispute_subtype: string | null;
  stage: string;
  arbitration_type: string | null;
  arbitration_institution: string | null;
  seat_of_arbitration: string | null;
  number_of_arbitrators: number;
  filing_date: string | null;
  hearing_date: string | null;
  award_date: string | null;
  award_text: string | null;
  is_final: boolean;
  enforceability_status: string | null;
  financial_value: number;
  arbitration_fees: number;
  escrow_amount: number;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m109_biometric_verified: boolean;
  m54_escrow_opened: boolean;
  m9_enforcement_ready: boolean;
  m92_draft_generated: boolean;
  m52_notified: boolean;
  secure_data_room_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M07Arbitrator {
  id: string;
  case_id: string;
  name: string;
  role: string | null;
  appointment_party: string | null;
  qualifications: string | null;
  biometric_verified: boolean;
  created_at: string;
}

export interface M07Party {
  id: string;
  case_id: string;
  party_type: string;
  name: string;
  role: string | null;
  contact_info: string | null;
  legal_representation: string | null;
  created_at: string;
}

export interface M07VirtualHearing {
  id: string;
  case_id: string;
  hearing_date: string;
  hearing_time: string | null;
  duration_minutes: number;
  platform: string | null;
  encryption_standard: string | null;
  recording_hash: string | null;
  biometric_verification: boolean;
  status: string;
  created_at: string;
}

export interface M07DraftAward {
  id: string;
  case_id: string;
  draft_title: string;
  draft_content: string | null;
  generated_by: string;
  review_status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  final_award: boolean;
  created_at: string;
}

export interface M07AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// M08 — Dispute Resolution Committees & Administrative Grievances
export interface M08Case {
  id: string;
  case_number: string;
  case_title: string;
  case_category: string;
  grievance_type: string | null;
  stage: string;
  grievance_body: string | null;
  challenged_authority: string | null;
  challenged_decision: string | null;
  grievance_filing_date: string | null;
  response_deadline: string | null;
  committee_name: string | null;
  committee_decision_date: string | null;
  committee_decision: string | null;
  recommendation: string | null;
  is_resolved: boolean;
  escalated_to_m3: boolean;
  escalation_reason: string | null;
  financial_value: number;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m10_linked: boolean;
  m46_precedents_retrieved: boolean;
  m76_representation_linked: boolean;
  m3_escalation_ready: boolean;
  m92_notified: boolean;
  m52_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M08Party {
  id: string;
  case_id: string;
  party_type: string;
  name: string;
  role: string | null;
  authority_type: string | null;
  contact_info: string | null;
  legal_representation: string | null;
  created_at: string;
}

export interface M08Deadline {
  id: string;
  case_id: string;
  deadline_type: string;
  deadline_label: string;
  deadline_date: string;
  statutory_basis: string | null;
  status: string;
  completed_at: string | null;
  auto_inserted: boolean;
  created_at: string;
}

export interface M08PrecedentReference {
  id: string;
  case_id: string;
  precedent_title: string;
  precedent_ref: string | null;
  precedent_date: string | null;
  ruling_summary: string | null;
  relevance_score: number;
  m46_source: boolean;
  created_at: string;
}

export interface M08CommitteeRecommendation {
  id: string;
  case_id: string;
  recommendation_title: string;
  recommendation_body: string | null;
  legal_opinion: string | null;
  issued_by: string | null;
  issued_at: string | null;
  approval_status: string;
  final_decision: boolean;
  created_at: string;
}

export interface M08AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M12 — Patent & Technological Innovation Engine
// ──────────────────────────────────────────────

export interface M12Patent {
  id: string;
  patent_number: string;
  patent_title: string;
  patent_type: string;
  stage: string;
  status: string;
  inventors: string[] | null;
  assignee: string | null;
  international_class: string | null;
  filing_date: string | null;
  grant_date: string | null;
  priority_date: string | null;
  deposit_certificate_hash: string | null;
  technical_specifications: string | null;
  engineering_drawings: string[] | null;
  lab_results: string | null;
  is_software_patent: boolean;
  is_trade_secret: boolean;
  financial_value: number;
  filing_fees: number;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m10_linked: boolean;
  m54_cost_center_opened: boolean;
  m53_archived: boolean;
  m92_notified: boolean;
  m52_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M12PriorArt {
  id: string;
  patent_id: string;
  reference_number: string;
  title: string;
  source: string;
  similarity_score: number;
  relevance: string;
  created_at: string;
}

export interface M12LifecycleMilestone {
  id: string;
  patent_id: string;
  milestone_type: string;
  milestone_date: string;
  deadline_date: string | null;
  completed: boolean;
  description: string | null;
  created_at: string;
}

export interface M12AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M13 — Copyright & Digital Protection Engine
// ──────────────────────────────────────────────

export interface M13Copyright {
  id: string;
  registration_number: string;
  work_title: string;
  work_type: string;
  stage: string;
  status: string;
  author_name: string;
  author_biometric_id: string | null;
  rights_holder: string | null;
  deposit_hash: string | null;
  drm_protected: boolean;
  is_software_code: boolean;
  source_code_hash: string | null;
  license_type: string | null;
  publication_date: string | null;
  financial_value: number;
  filing_fees: number;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m81_media_linked: boolean;
  m54_finance_linked: boolean;
  m53_archived: boolean;
  m92_notified: boolean;
  m52_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M13Infringement {
  id: string;
  copyright_id: string;
  infringing_party: string;
  infringement_type: string;
  detected_date: string;
  evidence_url: string | null;
  similarity_score: number;
  status: string;
  m10_case_opened: boolean;
  description: string | null;
  created_at: string;
}

export interface M13License {
  id: string;
  copyright_id: string;
  licensee: string;
  license_scope: string;
  royalty_rate: number;
  start_date: string;
  end_date: string | null;
  is_exclusive: boolean;
  m54_finance_linked: boolean;
  created_at: string;
}

export interface M13AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M14 — Cybersecurity & Data Protection Engine
// ──────────────────────────────────────────────

export interface M14Threat {
  id: string;
  incident_number: string;
  incident_title: string;
  threat_type: string;
  severity: string;
  stage: string;
  status: string;
  detected_at: string;
  source_ip: string | null;
  target_system: string | null;
  attack_vector: string | null;
  affected_assets: string[] | null;
  data_breached: boolean;
  gdpr_compliance_flag: boolean;
  zero_trust_violation: boolean;
  containment_status: string;
  financial_impact: number;
  cost_center_id: string | null;
  assigned_analyst_id: string | null;
  m51_incident_ticket_created: boolean;
  m108_disaster_triggered: boolean;
  m109_biometric_required: boolean;
  m54_finance_linked: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  analyst?: { name: string };
}

export interface M14Anomaly {
  id: string;
  threat_id: string;
  anomaly_type: string;
  description: string;
  detected_at: string;
  velocity_flag: boolean;
  off_hours_flag: boolean;
  scope_breach_flag: boolean;
  decryption_failure_flag: boolean;
  risk_score: number;
  auto_alerted: boolean;
  created_at: string;
}

export interface M14AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M15 — Cyber Crime & IT Law Engine
// ──────────────────────────────────────────────

export interface M15Case {
  id: string;
  case_number: string;
  case_title: string;
  case_category: string;
  stage: string;
  status: string;
  crime_type: string;
  incident_date: string | null;
  suspect_name: string | null;
  suspect_biometric_id: string | null;
  victim_entity: string | null;
  digital_evidence_chain: string[] | null;
  damage_estimate: number;
  recovery_amount: number;
  cost_center_id: string | null;
  assigned_attorney_id: string | null;
  m10_linked: boolean;
  m14_incident_id: string | null;
  m54_finance_linked: boolean;
  m51_investigation_ticket: boolean;
  m109_identity_verified: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  attorney?: { name: string };
}

export interface M15Evidence {
  id: string;
  case_id: string;
  evidence_type: string;
  evidence_hash: string;
  collection_date: string;
  collected_by: string;
  chain_of_custody: string;
  is_airgapped: boolean;
  zk_audit_verified: boolean;
  description: string | null;
  created_at: string;
}

export interface M15AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M16 — Digital Transaction & E-Signature Engine
// ──────────────────────────────────────────────

export interface M16Document {
  id: string;
  document_number: string;
  document_title: string;
  document_type: string;
  stage: string;
  status: string;
  document_hash: string | null;
  signed_at: string | null;
  signer_name: string | null;
  signer_biometric_id: string | null;
  co_signer_name: string | null;
  co_signer_biometric_id: string | null;
  biometric_liveness_check: boolean;
  is_biometric_signed: boolean;
  m109_biometric_verified: boolean;
  m49_board_meeting_id: string | null;
  m105_arbitration_id: string | null;
  m52_notification_sent: boolean;
  m10_case_linked: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface M16Signature {
  id: string;
  document_id: string;
  signer_name: string;
  signer_role: string;
  signature_hash: string;
  signed_at: string;
  biometric_type: string | null;
  biometric_verified: boolean;
  ip_address: string | null;
  created_at: string;
}

export interface M16AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M17 — Digital Publishing & Multimedia Engine
// ──────────────────────────────────────────────

export interface M17Content {
  id: string;
  content_number: string;
  content_title: string;
  content_type: string;
  stage: string;
  status: string;
  media_format: string;
  author_name: string;
  publisher: string | null;
  publication_date: string | null;
  content_hash: string | null;
  drm_protected: boolean;
  metadata_extracted: boolean;
  retention_policy: string;
  financial_value: number;
  filing_fees: number;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m81_media_production_linked: boolean;
  m74_press_compliance_checked: boolean;
  m54_finance_linked: boolean;
  m53_archived: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M17License {
  id: string;
  content_id: string;
  licensee: string;
  license_type: string;
  license_scope: string;
  royalty_rate: number;
  start_date: string;
  end_date: string | null;
  is_exclusive: boolean;
  m54_finance_linked: boolean;
  created_at: string;
}

export interface M17AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M18 — Digital Assets & AI Governance Engine
// ──────────────────────────────────────────────

export interface M18Asset {
  id: string;
  asset_number: string;
  asset_name: string;
  asset_type: string;
  stage: string;
  status: string;
  asset_uuid: string | null;
  owner_entity: string | null;
  ai_model_name: string | null;
  ai_model_version: string | null;
  bias_audit_passed: boolean;
  transparency_score: number;
  compliance_status: string;
  is_encrypted: boolean;
  encryption_standard: string | null;
  financial_value: number;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m92_guardrails_verified: boolean;
  m14_monitoring_active: boolean;
  m54_finance_linked: boolean;
  m109_biometric_required: boolean;
  m53_archived: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M18AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M19 — Commercial Contracts & Procurement Engine
// ──────────────────────────────────────────────

export interface M19Contract {
  id: string;
  contract_number: string;
  contract_title: string;
  contract_type: string;
  stage: string;
  status: string;
  party_a: string;
  party_b: string;
  contract_value: number;
  penalty_clauses: string | null;
  force_majeure_clauses: string | null;
  delivery_deadline: string | null;
  incoterms: string | null;
  is_international: boolean;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m53_document_id: string | null;
  m50_risk_assessed: boolean;
  m16_signed: boolean;
  m54_cost_center_opened: boolean;
  m10_deadlines_registered: boolean;
  m51_tasks_generated: boolean;
  m52_notified: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M19Milestone {
  id: string;
  contract_id: string;
  milestone_type: string;
  milestone_date: string;
  deadline_date: string | null;
  completed: boolean;
  description: string | null;
  created_at: string;
}

export interface M19AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M20 — Mergers & Acquisitions Engine
// ──────────────────────────────────────────────

export interface M20Deal {
  id: string;
  deal_number: string;
  deal_title: string;
  deal_type: string;
  stage: string;
  status: string;
  target_company: string;
  acquiring_entity: string;
  deal_value: number;
  share_percentage: number;
  is_cross_border: boolean;
  due_diligence_status: string;
  due_diligence_report: string | null;
  escrow_arrangements: string | null;
  antitrust_clearance: boolean;
  conflict_of_interest_flag: boolean;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m53_document_id: string | null;
  m49_board_approved: boolean;
  m16_signed: boolean;
  m54_finance_linked: boolean;
  m50_risk_assessed: boolean;
  m83_assets_valued: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M20DueDiligenceItem {
  id: string;
  deal_id: string;
  category: string;
  finding: string;
  risk_level: string;
  status: string;
  description: string | null;
  created_at: string;
}

export interface M20AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M21 — Foreign Direct Investment & Company Formation Engine
// ──────────────────────────────────────────────

export interface M21Application {
  id: string;
  application_number: string;
  applicant_name: string;
  investor_nationality: string;
  company_type: string;
  stage: string;
  status: string;
  capital_amount: number;
  currency: string;
  investment_incentives: string | null;
  tax_exemptions: string | null;
  customs_exemptions: string | null;
  gafi_reference: string | null;
  free_zone: boolean;
  security_clearance_status: string;
  bit_reference: string | null;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m53_document_id: string | null;
  m16_signed: boolean;
  m54_finance_linked: boolean;
  m50_risk_assessed: boolean;
  m51_tasks_generated: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M21Shareholder {
  id: string;
  application_id: string;
  shareholder_name: string;
  nationality: string;
  share_percentage: number;
  capital_contribution: number;
  is_foreign: boolean;
  created_at: string;
}

export interface M21AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M22 — Real Estate & Property Development Engine
// ──────────────────────────────────────────────

export interface M22Property {
  id: string;
  property_number: string;
  property_title: string;
  transaction_type: string;
  stage: string;
  status: string;
  property_type: string;
  location: string | null;
  area_sqm: number;
  property_value: number;
  mortgage_registered: boolean;
  mortgage_amount: number;
  encumbrance_free: boolean;
  fidic_contract: boolean;
  developer_agreement: boolean;
  registration_status: string;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m53_document_id: string | null;
  m16_signed: boolean;
  m54_cost_center_opened: boolean;
  m10_deadlines_registered: boolean;
  m51_tasks_generated: boolean;
  m50_risk_assessed: boolean;
  m83_assets_updated: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M22Transaction {
  id: string;
  property_id: string;
  transaction_type: string;
  party_a: string;
  party_b: string;
  transaction_value: number;
  transaction_date: string;
  registration_date: string | null;
  notarized: boolean;
  description: string | null;
  created_at: string;
}

export interface M22AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M23 — Distribution & Commercial Agencies Engine
// ──────────────────────────────────────────────

export interface M23Agency {
  id: string;
  agency_number: string;
  agency_title: string;
  contract_type: string;
  stage: string;
  status: string;
  principal_name: string;
  agent_name: string;
  territory: string | null;
  is_exclusive: boolean;
  commission_rate: number;
  franchise_agreement: boolean;
  brand_license_linked: boolean;
  registration_status: string;
  expiry_date: string | null;
  contract_value: number;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m53_document_id: string | null;
  m26_compliance_checked: boolean;
  m16_signed: boolean;
  m54_finance_linked: boolean;
  m10_deadlines_registered: boolean;
  m51_tasks_generated: boolean;
  m80_trademark_linked: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M23AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M24 — Maritime & Air Commerce Engine
// ──────────────────────────────────────────────

export interface M24Shipment {
  id: string;
  shipment_number: string;
  shipment_title: string;
  transport_mode: string;
  stage: string;
  status: string;
  carrier_name: string;
  vessel_flight: string | null;
  port_of_loading: string | null;
  port_of_discharge: string | null;
  bill_of_lading_number: string | null;
  charter_party: boolean;
  incoterms: string | null;
  cargo_description: string | null;
  cargo_value: number;
  insurance_covered: boolean;
  insurance_amount: number;
  demurrage_claims: number;
  general_average_flag: boolean;
  expected_arrival: string | null;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m53_document_id: string | null;
  m90_import_export_linked: boolean;
  m106_food_security_flag: boolean;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m51_tasks_generated: boolean;
  m109_biometric_required: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M24AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M25 — Strategic Finance & Investment Engine
// ──────────────────────────────────────────────

export interface M25Financing {
  id: string;
  financing_number: string;
  financing_title: string;
  financing_type: string;
  stage: string;
  status: string;
  financier_name: string;
  borrower_name: string;
  principal_amount: number;
  interest_rate: number;
  grace_period_months: number;
  maturity_date: string | null;
  collateral_description: string | null;
  is_syndicated: boolean;
  is_ipo: boolean;
  risk_assessment: string;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m53_document_id: string | null;
  m49_board_approved: boolean;
  m50_risk_assessed: boolean;
  m54_cost_center_opened: boolean;
  m10_deadlines_registered: boolean;
  m51_tasks_generated: boolean;
  m98_stock_exchange_linked: boolean;
  m109_biometric_required: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M25AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M26 — Commercial Compliance & Antitrust Engine
// ──────────────────────────────────────────────

export interface M26Compliance {
  id: string;
  review_number: string;
  review_title: string;
  review_type: string;
  stage: string;
  status: string;
  target_contract_id: string | null;
  target_deal_id: string | null;
  market_share_pct: number;
  concentration_flag: boolean;
  antitrust_clearance: boolean;
  red_alert_triggered: boolean;
  sensitivity_points: string | null;
  review_report: string | null;
  assigned_advisor_id: string | null;
  m20_deal_linked: boolean;
  m23_agency_linked: boolean;
  m54_finance_checked: boolean;
  m10_deadlines_registered: boolean;
  m109_biometric_verified: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M26AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M27 — Inheritance, Wills & Estate Liquidation Engine
// ──────────────────────────────────────────────

export interface M27Estate {
  id: string;
  estate_number: string;
  deceased_name: string;
  death_date: string | null;
  stage: string;
  status: string;
  total_assets: number;
  total_debts: number;
  net_estate: number;
  school_of_thought: string;
  will_present: boolean;
  minors_involved: boolean;
  heirs_count: number;
  liquidation_status: string;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m83_assets_inventoried: boolean;
  m98_stocks_valued: boolean;
  m54_trust_account_opened: boolean;
  m46_zakat_calculated: boolean;
  m22_properties_transferred: boolean;
  m10_deadlines_registered: boolean;
  m109_biometric_verified: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M27Heir {
  id: string;
  estate_id: string;
  heir_name: string;
  relationship: string;
  share_fraction: string;
  share_percentage: number;
  share_amount: number;
  is_minor: boolean;
  guardian_name: string | null;
  created_at: string;
}

export interface M27AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M28 — Endowments & Judicial Guardianship Engine
// ──────────────────────────────────────────────

export interface M28Endowment {
  id: string;
  endowment_number: string;
  endowment_title: string;
  endowment_type: string;
  stage: string;
  status: string;
  endower_name: string;
  guardian_name: string | null;
  beneficiary_purpose: string | null;
  annual_revenue: number;
  annual_expenses: number;
  net_revenue: number;
  reporting_frequency: string;
  next_report_date: string | null;
  termination_status: string;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m83_assets_valued: boolean;
  m54_trust_account_opened: boolean;
  m46_fatwa_referenced: boolean;
  m10_case_linked: boolean;
  m109_biometric_required: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M28AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M29 — Civil Contracts & Leases Engine
// ──────────────────────────────────────────────

export interface M29Contract {
  id: string;
  contract_number: string;
  contract_title: string;
  contract_type: string;
  stage: string;
  status: string;
  party_a: string;
  party_b: string;
  property_subject: string | null;
  contract_value: number;
  is_old_lease: boolean;
  lease_duration_months: number | null;
  rent_amount: number;
  payment_frequency: string;
  termination_clauses: string | null;
  compensation_clauses: string | null;
  delivery_handover_conditions: string | null;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m53_document_id: string | null;
  m46_compliance_checked: boolean;
  m10_deadlines_registered: boolean;
  m54_finance_linked: boolean;
  m83_asset_status_updated: boolean;
  m30_compensation_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M29AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M30 — Compensation & Tort Liability Engine
// ──────────────────────────────────────────────

export interface M30Claim {
  id: string;
  claim_number: string;
  claim_title: string;
  claim_type: string;
  stage: string;
  status: string;
  claimant_name: string;
  defendant_name: string;
  incident_date: string | null;
  incident_location: string | null;
  material_damage: number;
  moral_damage: number;
  total_claimed: number;
  fault_established: boolean;
  causation_proven: boolean;
  success_probability: number;
  expert_report: string | null;
  police_report: string | null;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m10_case_opened: boolean;
  m54_finance_linked: boolean;
  m91_safety_report_linked: boolean;
  m65_medical_malpractice_linked: boolean;
  m107_iot_evidence_linked: boolean;
  m109_biometric_verified: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M30AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M31 — Joint Property & Partition Engine
// ──────────────────────────────────────────────

export interface M31JointProperty {
  id: string;
  case_number: string;
  case_title: string;
  case_type: string;
  stage: string;
  status: string;
  property_description: string;
  property_value: number;
  partners_count: number;
  partition_method: string;
  expert_assigned: string | null;
  consolidation_proposed: boolean;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m83_property_valued: boolean;
  m27_estate_linked: boolean;
  m10_case_opened: boolean;
  m54_finance_linked: boolean;
  m109_biometric_required: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M31Partner {
  id: string;
  joint_property_id: string;
  partner_name: string;
  share_fraction: string;
  share_percentage: number;
  share_value: number;
  is_minors: boolean;
  guardian_name: string | null;
  created_at: string;
}

export interface M31AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M32 — Oral Contracts & Civil Evidence Engine
// ──────────────────────────────────────────────

export interface M32Evidence {
  id: string;
  evidence_number: string;
  evidence_title: string;
  evidence_type: string;
  stage: string;
  status: string;
  case_reference: string | null;
  contract_nature: string;
  witness_count: number;
  oath_type: string | null;
  presumptions: string | null;
  transcription_id: string | null;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m10_case_opened: boolean;
  m54_finance_linked: boolean;
  m56_transcription_linked: boolean;
  m46_compliance_checked: boolean;
  m109_biometric_verified: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M32Witness {
  id: string;
  evidence_id: string;
  witness_name: string;
  witness_statement: string | null;
  statement_date: string | null;
  is_biometric_verified: boolean;
  contradictions_flag: boolean;
  created_at: string;
}

export interface M32AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M33 — Real Estate Security & In-Rem Rights Engine
// ──────────────────────────────────────────────

export interface M33Mortgage {
  id: string;
  mortgage_number: string;
  mortgage_title: string;
  mortgage_type: string;
  stage: string;
  status: string;
  creditor_name: string;
  debtor_name: string;
  secured_amount: number;
  property_subject: string;
  registration_date: string | null;
  renewal_date: string | null;
  release_status: string;
  iot_monitoring_active: boolean;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m83_property_checked: boolean;
  m22_sale_blocked: boolean;
  m54_finance_linked: boolean;
  m75_bank_linked: boolean;
  m10_deadlines_registered: boolean;
  m107_iot_monitoring: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M33AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M34 — Consular & Civil Affairs for Individuals Engine
// ──────────────────────────────────────────────

export interface M34ConsularCase {
  id: string;
  case_number: string;
  case_title: string;
  case_type: string;
  stage: string;
  status: string;
  foreign_national_name: string;
  nationality: string;
  host_country: string | null;
  vienna_convention_applied: boolean;
  document_type: string;
  notarization_required: boolean;
  apostille_required: boolean;
  legal_representation: boolean;
  applicable_law: string | null;
  consular_fees: number;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m97_foreign_affairs_linked: boolean;
  m109_identity_verified: boolean;
  m46_international_law_referenced: boolean;
  m10_case_opened: boolean;
  m54_finance_linked: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M34AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M35 — Customs, Tax & Real Estate Tax Engine
// ──────────────────────────────────────────────

export interface M35TaxFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  taxpayer_name: string;
  tax_category: string;
  tax_period: string | null;
  declared_amount: number;
  assessed_amount: number;
  dispute_amount: number;
  exemptions_applied: string | null;
  deadline_date: string | null;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m54_finance_linked: boolean;
  m90_import_export_linked: boolean;
  m83_property_linked: boolean;
  m46_compliance_checked: boolean;
  m10_case_opened: boolean;
  m109_biometric_required: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M35AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M36 — Environment & Sustainable Development Engine
// ──────────────────────────────────────────────

export interface M36EnvironmentalFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  facility_name: string;
  emission_level: number;
  emission_limit: number;
  compliance_status: string;
  esg_score: number;
  carbon_footprint: number;
  energy_consumption: number;
  inspection_date: string | null;
  next_inspection_date: string | null;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m107_iot_linked: boolean;
  m54_finance_linked: boolean;
  m91_safety_linked: boolean;
  m46_compliance_checked: boolean;
  m10_case_opened: boolean;
  m109_biometric_required: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M36AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M37 — Energy & Natural Resources Engine
// ──────────────────────────────────────────────

export interface M37EnergyProject {
  id: string;
  project_number: string;
  project_title: string;
  project_type: string;
  stage: string;
  status: string;
  concession_area: string | null;
  operator_name: string;
  partner_companies: string | null;
  production_share_rate: number;
  royalty_rate: number;
  contract_value: number;
  energy_output: number;
  license_expiry: string | null;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m107_iot_linked: boolean;
  m54_finance_linked: boolean;
  m36_environmental_linked: boolean;
  m103_mining_linked: boolean;
  m46_compliance_checked: boolean;
  m10_case_opened: boolean;
  m109_biometric_required: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M37AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M38 — Competition & Consumer Protection Engine
// ──────────────────────────────────────────────

export interface M38ConsumerCase {
  id: string;
  case_number: string;
  case_title: string;
  case_type: string;
  stage: string;
  status: string;
  consumer_name: string;
  merchant_name: string;
  product_service: string | null;
  complaint_nature: string;
  claimed_amount: number;
  settlement_status: string;
  warranty_involved: boolean;
  quality_violation: boolean;
  inspection_report: string | null;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m88_internal_trade_linked: boolean;
  m54_finance_linked: boolean;
  m101_maintenance_linked: boolean;
  m46_compliance_checked: boolean;
  m10_case_opened: boolean;
  m109_biometric_required: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M38AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M39 — Sports & Sports Federations Engine
// ──────────────────────────────────────────────

export interface M39SportsContract {
  id: string;
  contract_number: string;
  contract_title: string;
  contract_type: string;
  stage: string;
  status: string;
  party_a: string;
  party_b: string;
  sport_category: string;
  contract_value: number;
  sponsorship_included: boolean;
  broadcasting_rights: boolean;
  image_rights: boolean;
  dispute_status: string;
  drc_ref: string | null;
  cas_ref: string | null;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m80_ip_linked: boolean;
  m77_hr_linked: boolean;
  m105_arbitration_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M39AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M40 — Academic & Higher Education Engine
// ──────────────────────────────────────────────

export interface M40AcademicCase {
  id: string;
  case_number: string;
  case_title: string;
  case_type: string;
  stage: string;
  status: string;
  institution_name: string;
  faculty_member: string;
  academic_rank: string;
  promotion_eligible: boolean;
  research_points: number;
  disciplinary_action: boolean;
  council_decision: string | null;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m53_document_id: string | null;
  m77_hr_linked: boolean;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m80_ip_linked: boolean;
  m49_board_approved: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M40AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M41 — Pre-University & Schools Education Engine
// ──────────────────────────────────────────────

export interface M41EducationFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  institution_name: string;
  institution_type: string;
  license_status: string;
  naqaae_accredited: boolean;
  teacher_name: string | null;
  student_name: string | null;
  fee_dispute: boolean;
  disciplinary_action: boolean;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m77_hr_linked: boolean;
  m46_compliance_checked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M41AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M42 — Local Administration & Occupations Engine
// ──────────────────────────────────────────────

export interface M42LocalFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  applicant_name: string;
  property_location: string | null;
  license_type: string;
  reconciliation_status: string;
  state_property_flag: boolean;
  committee_assigned: boolean;
  fee_amount: number;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m54_finance_linked: boolean;
  m83_property_linked: boolean;
  m10_case_opened: boolean;
  m107_iot_linked: boolean;
  m46_compliance_checked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M42AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M43 — Transport, Logistics & Fleet Engine
// ──────────────────────────────────────────────

export interface M43TransportFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  carrier_name: string;
  fleet_type: string;
  route_description: string | null;
  cargo_description: string | null;
  cargo_value: number;
  insurance_covered: boolean;
  tracking_active: boolean;
  delivery_deadline: string | null;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m107_iot_linked: boolean;
  m54_finance_linked: boolean;
  m91_safety_linked: boolean;
  m46_compliance_checked: boolean;
  m10_case_opened: boolean;
  m109_biometric_required: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M43AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M44 — Administrative Governance & Org Structures Engine
// ──────────────────────────────────────────────

export interface M44GovernanceFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  org_entity: string;
  authority_level: string;
  financial_limit: number;
  delegation_status: string;
  meeting_scheduled: boolean;
  regulations_updated: boolean;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m48_communications_linked: boolean;
  m54_finance_linked: boolean;
  m51_tasks_generated: boolean;
  m46_compliance_checked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M44AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M45 — Internal Investigations & Disciplinary Engine
// ──────────────────────────────────────────────

export interface M45InvestigationFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  respondent_name: string;
  complainant_name: string | null;
  violation_type: string;
  penalty_recommendation: string | null;
  hearing_scheduled: boolean;
  appeal_filed: boolean;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m10_case_opened: boolean;
  m77_hr_linked: boolean;
  m54_finance_linked: boolean;
  m56_transcription_linked: boolean;
  m46_compliance_checked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M45AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M46 — Knowledge Management & Smart Documents Engine
// ──────────────────────────────────────────────

export interface M46KnowledgeDocument {
  id: string;
  document_number: string;
  document_title: string;
  document_type: string;
  stage: string;
  status: string;
  source_authority: string;
  jurisdiction: string | null;
  keywords: string | null;
  retention_policy: string;
  ocr_processed: boolean;
  encrypted: boolean;
  access_level: string;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m10_case_linked: boolean;
  m53_archived: boolean;
  m54_finance_linked: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M46AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M47 — Intelligent Document Recognition & Routing Engine
// ──────────────────────────────────────────────

export interface M47DocumentRecord {
  id: string;
  document_number: string;
  document_title: string;
  document_type: string;
  stage: string;
  status: string;
  source_channel: string;
  ocr_processed: boolean;
  ocr_language: string;
  extracted_metadata: string | null;
  routing_suggestion: string | null;
  routing_target_module: string | null;
  human_approved: boolean;
  approved_by: string | null;
  encrypted: boolean;
  sha3_hash: string | null;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m48_archived: boolean;
  m50_risk_checked: boolean;
  m54_finance_linked: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M47AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M48 — Bulk Folder & File Smart Archiver Engine
// ──────────────────────────────────────────────

export interface M48ArchiveBatch {
  id: string;
  batch_number: string;
  batch_title: string;
  source_scope: string;
  stage: string;
  status: string;
  total_files: number;
  processed_files: number;
  classified_files: number;
  encrypted_files: number;
  proposed_structure: string | null;
  human_approved: boolean;
  approved_by: string | null;
  target_repository: string;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m47_recognition_linked: boolean;
  m50_risk_checked: boolean;
  m55_storage_linked: boolean;
  m54_finance_linked: boolean;
  m46_indexed: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M48AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M49 — Sovereign Boardroom & Executive Governance Engine
// ──────────────────────────────────────────────

export interface M49Meeting {
  id: string;
  meeting_number: string;
  meeting_title: string;
  meeting_type: string;
  stage: string;
  status: string;
  scheduled_date: string | null;
  participants_count: number;
  agenda_items: number;
  decisions_made: number;
  votes_passed: number;
  votes_rejected: number;
  speaker_diarization: boolean;
  minutes_generated: boolean;
  biometric_verified: boolean;
  encrypted: boolean;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m54_finance_linked: boolean;
  m51_tasks_generated: boolean;
  m48_archived: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M49AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M53 — Sovereign Document Studio Engine
// ──────────────────────────────────────────────

export interface M53Document {
  id: string;
  document_number: string;
  document_title: string;
  document_format: string;
  stage: string;
  status: string;
  template_used: boolean;
  template_name: string | null;
  version_number: number;
  track_changes: boolean;
  voice_dictated: boolean;
  encrypted: boolean;
  sha3_hash: string | null;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m10_case_linked: boolean;
  m54_finance_linked: boolean;
  m50_risk_checked: boolean;
  m48_archived: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M53AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M55 — Sovereign Local Object Storage Engine
// ──────────────────────────────────────────────

export interface M55StorageRecord {
  id: string;
  record_number: string;
  record_title: string;
  file_type: string;
  stage: string;
  status: string;
  bucket_name: string;
  file_size: number;
  encrypted: boolean;
  worm_protected: boolean;
  sha3_hash: string | null;
  partition: string;
  retention_policy: string;
  access_level: string;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m48_archived: boolean;
  m53_document_linked: boolean;
  m46_indexed: boolean;
  m109_biometric_required: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M55AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M56 — Local Neural Audio-to-Text Engine
// ──────────────────────────────────────────────

export interface M56Transcription {
  id: string;
  transcription_number: string;
  transcription_title: string;
  audio_source: string;
  stage: string;
  status: string;
  language: string;
  speaker_diarization: boolean;
  speaker_count: number;
  duration_seconds: number;
  transcription_text: string | null;
  timestamp_extracted: boolean;
  encrypted: boolean;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m49_meeting_linked: boolean;
  m53_document_linked: boolean;
  m55_storage_linked: boolean;
  m109_biometric_verified: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M56AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M57 — Sovereign Wellness & Fitness Engine
// ──────────────────────────────────────────────

export interface M57WellnessRecord {
  id: string;
  record_number: string;
  record_title: string;
  record_type: string;
  stage: string;
  status: string;
  member_name: string;
  activity_type: string;
  duration_minutes: number;
  intensity_level: string;
  productivity_score: number;
  pomodoro_sessions: number;
  team_challenge: boolean;
  encrypted: boolean;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m77_hr_linked: boolean;
  m51_tasks_linked: boolean;
  m55_storage_linked: boolean;
  m109_biometric_verified: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M57AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M65 — Medical Institutions & Healthcare Governance Core
// ──────────────────────────────────────────────

export interface M65MedicalFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  facility_name: string;
  license_number: string | null;
  gahar_accredited: boolean;
  malpractice_status: string;
  insurance_claim_ref: string | null;
  claim_amount: number;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m91_safety_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M65AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M66 — Engineering, Architectural & Consulting Sector Core
// ──────────────────────────────────────────────

export interface M66EngineeringFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  office_name: string;
  license_number: string | null;
  fidic_type: string | null;
  contract_value: number;
  variation_orders: number;
  liability_status: string;
  expert_panel_ref: string | null;
  cost_center_id: string | null;
  assigned_advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m62_local_admin_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M66AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  immutable: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// M64 — Professional Syndicates & Federations Core
// ──────────────────────────────────────────────

export interface M64SyndicateFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  member_name: string | null;
  membership_number: string | null;
  syndicate_name: string | null;
  election_ref: string | null;
  disciplinary_status: string | null;
  penalty_type: string | null;
  fund_amount: number;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M64AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────
// M67 — Major Economic, Commercial & Investment Institutions Core
// ──────────────────────────────────────────────

export interface M67EconomicFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  entity_name: string | null;
  holding_structure: string | null;
  deal_value: number;
  due_diligence_ref: string | null;
  fund_type: string | null;
  arbitration_ref: string | null;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m98_market_linked: boolean;
  m77_hr_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M67AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────
// M68 — Foreign Embassies, Diplomatic Missions & Consular Affairs Core
// ──────────────────────────────────────────────

export interface M68EmbassyFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  mission_name: string | null;
  country: string | null;
  immunity_status: string | null;
  consular_ref: string | null;
  staff_type: string | null;
  legal_issue: string | null;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m14_cyber_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M68AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────
// M69 — International Agreements & Cross-Border Contracts Core
// ──────────────────────────────────────────────

export interface M69CrossBorderFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  party_a: string | null;
  party_b: string | null;
  governing_law: string | null;
  incoterms_version: string | null;
  arbitration_forum: string | null;
  ofac_compliant: boolean;
  gdpr_compliant: boolean;
  contract_value: number;
  currency: string;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m14_cyber_linked: boolean;
  m105_arbitration_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M69AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────
// M70 — International Organizations & Regional Bodies Governance Core
// ──────────────────────────────────────────────

export interface M70IntlOrgFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  organization_name: string | null;
  organization_type: string | null;
  hq_agreement_ref: string | null;
  immunity_scope: string | null;
  host_country: string | null;
  fund_amount: number;
  currency: string;
  undt_case_ref: string | null;
  procurement_ref: string | null;
  ingo_compliance: boolean;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m85_tax_linked: boolean;
  m16_esign_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M70AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────
// M71 — NGOs & Civil Society Governance Core
// ──────────────────────────────────────────────

export interface M71NGOFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  organization_name: string | null;
  registration_number: string | null;
  founding_ref: string | null;
  donor_name: string | null;
  funding_source: string | null;
  fund_amount: number;
  currency: string;
  kyc_verified: boolean;
  inspection_status: string | null;
  license_type: string | null;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M71AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────
// M72 — Social Insurance & Economic Security Core
// ──────────────────────────────────────────────

export interface M72InsuranceFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  employer_name: string | null;
  employee_name: string | null;
  subscription_number: string | null;
  insurance_type: string | null;
  base_wage: number;
  variable_wage: number;
  contribution_amount: number;
  pension_type: string | null;
  injury_status: string | null;
  settlement_ref: string | null;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m65_medical_linked: boolean;
  m77_hr_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M72AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────
// M73 — Employment Contracts & Labor Relations Core
// ──────────────────────────────────────────────

export interface M73LaborFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  employer_name: string | null;
  employee_name: string | null;
  contract_type: string | null;
  contract_start: string | null;
  contract_end: string | null;
  monthly_wage: number;
  end_of_service_amount: number;
  collective_agreement_ref: string | null;
  settlement_ref: string | null;
  dispute_status: string | null;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m77_hr_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M73AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────
// M74 — Press & Media Institutions Governance Core
// ──────────────────────────────────────────────

export interface M74MediaFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  media_outlet_name: string | null;
  license_number: string | null;
  license_type: string | null;
  platform_type: string | null;
  drm_protected: boolean;
  copyright_ref: string | null;
  dispute_status: string | null;
  regulatory_body: string | null;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m77_hr_linked: boolean;
  m80_ip_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M74AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────
// M75 — Banks & Financial Institutions Governance Core
// ──────────────────────────────────────────────

export interface M75BankingFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  bank_name: string | null;
  branch_name: string | null;
  license_number: string | null;
  kyc_verified: boolean;
  aml_status: string | null;
  credit_facility_type: string | null;
  facility_amount: number;
  currency: string;
  guarantee_type: string | null;
  ucp_ref: string | null;
  basel_compliant: boolean;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m77_hr_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M75AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────
// M76 — Corporate Legal Departments & In-House Counsel Operations Core
// ──────────────────────────────────────────────

export interface M76InHouseLegalFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  company_name: string | null;
  contract_value: number;
  currency: string;
  external_firm: string | null;
  external_firm_fees: number;
  risk_level: string | null;
  legal_opinion_ref: string | null;
  investigation_status: string | null;
  clm_stage: string | null;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m77_hr_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M76AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────
// M77 — Human Resources & Personnel Management Core
// ──────────────────────────────────────────────

export interface M77HRFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  employee_name: string | null;
  employee_id_number: string | null;
  department: string | null;
  position: string | null;
  hire_date: string | null;
  termination_date: string | null;
  base_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  leave_balance: number;
  performance_rating: string | null;
  disciplinary_action: string | null;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m72_insurance_linked: boolean;
  m76_legal_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M77AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────
// M78 — Compound & HOA Management Engine
// ──────────────────────────────────────────────

export interface M78CompoundFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  compound_name: string | null;
  unit_number: string | null;
  owner_name: string | null;
  tenant_name: string | null;
  maintenance_fund: number;
  currency: string;
  violation_type: string | null;
  penalty_amount: number;
  meeting_ref: string | null;
  bylaws_ref: string | null;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m77_hr_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M78AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────
// M79 — Sports Clubs & Federations Engine
// ──────────────────────────────────────────────

export interface M79SportsClubFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  club_name: string | null;
  federation_name: string | null;
  sport_category: string | null;
  contract_value: number;
  currency: string;
  sponsorship_included: boolean;
  broadcasting_rights: boolean;
  election_ref: string | null;
  license_type: string | null;
  dispute_status: string | null;
  cgsac_ref: string | null;
  cas_ref: string | null;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m77_hr_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M79AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────
// M80 — Maternity, Childhood & Family Welfare Core
// ──────────────────────────────────────────────

export interface M80FamilyWelfareFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  case_party: string | null;
  child_name: string | null;
  custody_status: string | null;
  visitation_rights: boolean;
  alimony_amount: number;
  currency: string;
  welfare_type: string | null;
  care_home_license: string | null;
  emergency_report: boolean;
  social_worker_ref: string | null;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m05_family_court_linked: boolean;
  m10_case_opened: boolean;
  m77_hr_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M80AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────
// M81 — Media Production & Audiovisual Works Engine
// ──────────────────────────────────────────────

export interface M81MediaProductionFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  work_title: string | null;
  production_company: string | null;
  work_type: string | null;
  budget_amount: number;
  currency: string;
  royalty_percentage: number;
  distribution_platform: string | null;
  drm_protected: boolean;
  copyright_ref: string | null;
  censorship_license: string | null;
  dispute_status: string | null;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m80_ip_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M81AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M82TelecomFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  provider_name: string | null;
  license_type: string | null;
  license_number: string | null;
  ntra_ref: string | null;
  sla_metrics: string | null;
  sla_breach: boolean;
  contract_value: number;
  currency: string;
  dpo_assigned: boolean;
  gdpr_compliance: boolean;
  dpa_ref: string | null;
  ip_protection_ref: string | null;
  data_breach_reported: boolean;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m14_cyber_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M82AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M83RealEstateAssetFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  property_name: string | null;
  property_type: string | null;
  location: string | null;
  ownership_status: string | null;
  market_value: number;
  currency: string;
  roi_percentage: number;
  rental_income: number;
  valuation_ref: string | null;
  ivs_standard: boolean;
  mortgage_ref: string | null;
  maintenance_schedule: string | null;
  dispute_status: string | null;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m107_iot_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M83AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M84RailwaysFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  concession_type: string | null;
  operator_name: string | null;
  line_name: string | null;
  contract_value: number;
  currency: string;
  rolling_stock_ref: string | null;
  safety_compliance: boolean;
  accident_reported: boolean;
  penalty_amount: number;
  insurance_claim: number;
  arbitration_ref: string | null;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m107_iot_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M84AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M85LegalAccountingFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  company_name: string | null;
  tax_type: string | null;
  tax_period: string | null;
  declared_amount: number;
  paid_amount: number;
  currency: string;
  ifrs_compliant: boolean;
  audit_opinion: string | null;
  appeal_ref: string | null;
  penalty_amount: number;
  zakat_deducted: boolean;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M85AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M86TourismFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  hotel_name: string | null;
  star_rating: string | null;
  hma_ref: string | null;
  operator_brand: string | null;
  license_number: string | null;
  booking_dispute: boolean;
  liability_claim: number;
  currency: string;
  training_program: boolean;
  cancellation_penalty: number;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m77_hr_linked: boolean;
  m89_security_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M86AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M87IndustrialFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  facility_name: string | null;
  industrial_activity: string | null;
  license_number: string | null;
  license_type: string | null;
  oem_odm: boolean;
  eia_approved: boolean;
  eia_ref: string | null;
  tech_knowhow_ref: string | null;
  production_line: string | null;
  contract_value: number;
  currency: string;
  hazardous_materials: boolean;
  patent_linked: boolean;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m91_hse_linked: boolean;
  m107_iot_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M87AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M88CommerceFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  business_name: string | null;
  business_type: string | null;
  commercial_reg_number: string | null;
  franchise_ref: string | null;
  franchise_brand: string | null;
  distribution_agreement: boolean;
  consumer_complaint: boolean;
  warranty_claim: string | null;
  contract_value: number;
  currency: string;
  promotional_license: boolean;
  antitrust_checked: boolean;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m85_tax_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M88AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M89SecurityFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  company_name: string | null;
  service_type: string | null;
  license_number: string | null;
  guard_count: number;
  criminal_check_passed: boolean;
  facility_name: string | null;
  cash_transport: boolean;
  incident_reported: boolean;
  liability_amount: number;
  insurance_coverage: number;
  currency: string;
  contract_value: number;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m77_hr_linked: boolean;
  m107_iot_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M89AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M90TradeFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  importer_name: string | null;
  exporter_name: string | null;
  origin_country: string | null;
  hs_code: string | null;
  lc_ref: string | null;
  incoterms: string | null;
  bill_of_lading: string | null;
  shipment_value: number;
  customs_duty: number;
  demurrage: number;
  currency: string;
  certificate_of_origin: string | null;
  conformity_certificate: boolean;
  customs_cleared: boolean;
  damage_claim: number;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m85_tax_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M90AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M91HseFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  facility_name: string | null;
  site_type: string | null;
  license_number: string | null;
  license_type: string | null;
  risk_level: string | null;
  incident_reported: boolean;
  incident_type: string | null;
  injuries_count: number;
  fatalities: number;
  hazardous_materials: boolean;
  hazmat_permit_ref: string | null;
  osha_compliant: boolean;
  evacuation_plan: boolean;
  compensation_amount: number;
  currency: string;
  insurance_claim: number;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m77_hr_linked: boolean;
  m107_iot_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M91AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M93MarketingFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  campaign_name: string | null;
  platform_type: string | null;
  ad_license_number: string | null;
  license_type: string | null;
  sponsor_brand: string | null;
  influencer_name: string | null;
  influencer_contract: boolean;
  commission_rate: number;
  campaign_budget: number;
  currency: string;
  ip_slogan_protected: boolean;
  trademark_ref: string | null;
  consumer_protection_checked: boolean;
  misleading_ad_flagged: boolean;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m81_media_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M93AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M94AutomotiveFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  dealership_name: string | null;
  business_type: string | null;
  license_number: string | null;
  vehicle_count: number;
  lease_type: string | null;
  monthly_installment: number;
  contract_value: number;
  currency: string;
  insurance_policy_ref: string | null;
  insurance_coverage: number;
  accident_claim: number;
  warranty_claim: string | null;
  maintenance_ref: string | null;
  gps_tracking: boolean;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m101_maintenance_linked: boolean;
  m107_iot_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M94AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M95AutoManufacturingFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  factory_name: string | null;
  assembly_type: string | null;
  license_number: string | null;
  local_content_percentage: number;
  tech_transfer_ref: string | null;
  oem_licensed: boolean;
  royalty_rate: number;
  supplier_tier: string | null;
  contract_value: number;
  currency: string;
  patent_ref: string | null;
  customs_exemption: boolean;
  export_incentive: boolean;
  quality_standard: string | null;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m80_ip_linked: boolean;
  m90_trade_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M95AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M96ChemicalsFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  facility_name: string | null;
  chemical_type: string | null;
  license_number: string | null;
  production_capacity: number;
  feedstock_ref: string | null;
  feedstock_type: string | null;
  hazmat_permit_ref: string | null;
  hazardous_materials: boolean;
  eia_approved: boolean;
  eia_ref: string | null;
  emission_monitoring: boolean;
  export_certificate: string | null;
  quality_analysis_ref: string | null;
  contract_value: number;
  currency: string;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m91_hse_linked: boolean;
  m107_iot_linked: boolean;
  m90_trade_linked: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M96AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M97ForeignResidencyFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  foreign_national_name: string | null;
  nationality: string | null;
  passport_number: string | null;
  residency_type: string | null;
  permit_number: string | null;
  sponsor_name: string | null;
  employer_name: string | null;
  contract_value: number;
  currency: string;
  tax_deduction: number;
  social_insurance: boolean;
  consular_ref: string | null;
  deportation_flagged: boolean;
  renewal_deadline: string | null;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m77_hr_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M97AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M98CapitalMarketsFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  fund_name: string | null;
  fund_type: string | null;
  license_number: string | null;
  listing_ref: string | null;
  portfolio_value: number;
  currency: string;
  ipo_ref: string | null;
  disclosure_ref: string | null;
  insider_trading_flagged: boolean;
  aml_compliant: boolean;
  kyc_verified: boolean;
  market_maker_ref: string | null;
  custodian_ref: string | null;
  distribution_amount: number;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m14_cyber_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M98AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M99MallFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  mall_name: string | null;
  unit_number: string | null;
  tenant_name: string | null;
  tenant_type: string | null;
  lease_type: string | null;
  base_rent: number;
  percentage_rent_rate: number;
  pos_linked: boolean;
  monthly_sales: number;
  cam_charges: number;
  utility_charges: number;
  ad_space_revenue: number;
  lease_start: string | null;
  lease_end: string | null;
  renewal_notice_date: string | null;
  eviction_flagged: boolean;
  eviction_reason: string | null;
  civil_defense_approved: boolean;
  health_license_ref: string | null;
  contract_value: number;
  currency: string;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m85_tax_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M99AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M100LibraryFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  library_name: string | null;
  library_type: string | null;
  isbn: string | null;
  issn: string | null;
  work_title: string | null;
  author_name: string | null;
  publisher_name: string | null;
  acquisition_type: string | null;
  acquisition_cost: number;
  subscription_annual_fee: number;
  currency: string;
  deposit_ref: string | null;
  legal_deposit_confirmed: boolean;
  copyright_protected: boolean;
  ip_infringement_flagged: boolean;
  archive_type: string | null;
  digitization_status: string | null;
  classification_system: string | null;
  shelf_number: string | null;
  rare_manuscript: boolean;
  preservation_status: string | null;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m80_ip_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M100AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M101MaintenanceFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  facility_name: string | null;
  asset_name: string | null;
  asset_serial: string | null;
  maintenance_type: string | null;
  sla_ref: string | null;
  sla_response_hours: number;
  sla_actual_hours: number;
  sla_breach: boolean;
  penalty_amount: number;
  warranty_ref: string | null;
  warranty_expiry: string | null;
  warranty_claim_flagged: boolean;
  parts_cost: number;
  labor_cost: number;
  total_cost: number;
  currency: string;
  technician_name: string | null;
  iot_sensor_id: string | null;
  predictive_alert: boolean;
  compliance_certificate: string | null;
  contractor_license: string | null;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m107_iot_linked: boolean;
  m88_consumer_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M101AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M102BridgeFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  source_department: string | null;
  target_department: string | null;
  bridge_type: string | null;
  event_trigger: string | null;
  cluster_activated: string[] | null;
  parallel_tasks_count: number;
  completed_tasks_count: number;
  synergy_score: number;
  conflict_flagged: boolean;
  conflict_detail: string | null;
  kpi_label: string | null;
  kpi_value: string | null;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m92_notified: boolean;
  m109_biometric_signed: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M102AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M103QuarryFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  quarry_name: string | null;
  quarry_type: string | null;
  concession_ref: string | null;
  license_number: string | null;
  license_type: string | null;
  license_expiry: string | null;
  gps_coordinates: string | null;
  mineral_type: string | null;
  extraction_volume: number;
  royalty_rate: number;
  royalty_amount: number;
  currency: string;
  environmental_assessment_ref: string | null;
  eia_approved: boolean;
  blasting_permit: string | null;
  safety_compliance: boolean;
  incident_reported: boolean;
  supply_contract_ref: string | null;
  contractor_name: string | null;
  contract_value: number;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m91_hse_linked: boolean;
  m107_iot_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M103AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M104CeramicsFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  factory_name: string | null;
  production_line: string | null;
  license_number: string | null;
  license_type: string | null;
  product_type: string | null;
  design_patent_ref: string | null;
  raw_material_source: string | null;
  clay_supplier: string | null;
  feldspar_supplier: string | null;
  energy_type: string | null;
  gas_contract_ref: string | null;
  energy_consumption: number;
  production_capacity: number;
  local_content_percentage: number;
  export_certificate: string | null;
  origin_certificate: string | null;
  distribution_partner: string | null;
  contract_value: number;
  currency: string;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m80_ip_linked: boolean;
  m90_trade_linked: boolean;
  m103_quarry_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M104AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M105ArbitrationFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  claimant_name: string | null;
  respondent_name: string | null;
  arbitration_type: string | null;
  seat_of_arbitration: string | null;
  governing_law: string | null;
  arbitration_rules: string | null;
  number_of_arbitrators: number;
  arbitrator_names: string[] | null;
  tribunal_president: string | null;
  claim_amount: number;
  counterclaim_amount: number;
  currency: string;
  data_room_access_token: string | null;
  hearing_dates: string[] | null;
  award_status: string | null;
  award_date: string | null;
  award_enforcement_status: string | null;
  conflict_check_passed: boolean;
  fee_estimate: number;
  fee_paid: number;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M105AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M106FoodFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  product_name: string | null;
  product_category: string | null;
  license_number: string | null;
  license_type: string | null;
  license_expiry: string | null;
  haccp_certified: boolean;
  iso_22000_certified: boolean;
  shelf_life_days: number;
  storage_temp_min: number;
  storage_temp_max: number;
  batch_number: string | null;
  origin_country: string | null;
  import_permit_ref: string | null;
  quarantine_status: string | null;
  lab_test_passed: boolean;
  lab_test_ref: string | null;
  recall_issued: boolean;
  recall_reason: string | null;
  supply_contract_ref: string | null;
  contract_value: number;
  currency: string;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m90_trade_linked: boolean;
  m107_iot_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M106AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M107IoTFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  device_name: string | null;
  device_type: string | null;
  device_serial: string | null;
  protocol_type: string | null;
  gps_coordinates: string | null;
  sensor_metric: string | null;
  sensor_value: number;
  threshold_min: number;
  threshold_max: number;
  alert_triggered: boolean;
  alert_severity: string | null;
  alert_timestamp: string | null;
  vision_analysis_ref: string | null;
  heartbeat_status: string | null;
  last_ping: string | null;
  encryption_protocol: string;
  failover_target: string | null;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m91_hse_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M107AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M108DRFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  server_name: string | null;
  server_role: string | null;
  health_status: string | null;
  heartbeat_latency_ms: number;
  threat_type: string | null;
  threat_severity: string | null;
  failover_triggered: boolean;
  failover_target_server: string | null;
  failover_latency_ms: number;
  war_room_activated: boolean;
  air_gapped: boolean;
  active_active_sync: boolean;
  geo_replication_site: string | null;
  red_alert_issued: boolean;
  api_ports_closed: boolean;
  recovery_point_objective: string | null;
  recovery_time_objective: string | null;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m14_cyber_linked: boolean;
  m10_case_opened: boolean;
  m109_biometric_signed: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M108AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}

export interface M109BiometricFile {
  id: string;
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  status: string;
  subject_name: string | null;
  subject_role: string | null;
  identity_type: string | null;
  liveness_check_passed: boolean;
  face_capture_ref: string | null;
  voice_capture_ref: string | null;
  fingerprint_ref: string | null;
  document_hash: string | null;
  sovereign_hash: string | null;
  hash_algorithm: string;
  biometric_sealed: boolean;
  signing_target_doc: string | null;
  signing_target_engine: string | null;
  challenge_initiated_by: string | null;
  challenge_timestamp: string | null;
  verification_timestamp: string | null;
  anti_deepfake_score: number;
  description: string | null;
  advisor_id: string | null;
  m53_document_id: string | null;
  m54_finance_linked: boolean;
  m16_esign_linked: boolean;
  m10_case_opened: boolean;
  m92_notified: boolean;
  cost_center_id: string | null;
  created_at: string;
  updated_at: string;
  advisor?: { name: string };
}

export interface M109AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  actor: string | null;
  actor_role: string | null;
  detail: string | null;
  hash_chain: string | null;
  created_at: string;
}
