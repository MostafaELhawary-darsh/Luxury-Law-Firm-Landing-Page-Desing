from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

# Core simplified models converted from src/lib/firmTypes.ts

class CaseBase(BaseModel):
    case_number: Optional[str]
    case_title: Optional[str]
    case_type: Optional[str]
    court_level: Optional[str]
    court_name: Optional[str]
    subject: Optional[str]
    client_id: Optional[str]
    responsible_attorney_id: Optional[str]
    opposing_party: Optional[str]
    status: Optional[str]
    filed_date: Optional[str]
    next_session_date: Optional[str]

class CaseCreate(CaseBase):
    case_title: str

class Case(CaseBase):
    id: str
    client: Optional[Dict[str, Any]] = None
    attorney: Optional[Dict[str, Any]] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "uuid",
                "case_number": "2026/001",
                "case_title": "Acme vs. State",
                "case_type": "civil",
                "court_level": "high",
            }
        }
    }

class CourtSession(BaseModel):
    id: str
    case_id: str
    session_date: str
    session_time: str
    court_name: str
    circuit: Optional[str]
    session_type: Optional[str]
    attendees_plaintiff: Optional[bool] = False
    attendees_defendant: Optional[bool] = False
    documents_submitted: Optional[str]
    requests_submitted: Optional[str]
    defenses_submitted: Optional[str]
    memos_submitted: Optional[str]
    court_decision: Optional[str]
    ruling_text: Optional[str]
    status: Optional[str]
    case: Optional[Case]

class POA(BaseModel):
    id: str
    poa_number: Optional[str]
    poa_type: Optional[str]
    client_id: Optional[str]
    issued_date: Optional[str]
    expiry_date: Optional[str]
    scope: Optional[str]
    notary_name: Optional[str]
    status: Optional[str]
    document_url: Optional[str]
    client: Optional[Dict[str, Any]]

class Task(BaseModel):
    id: str
    title: str
    description: Optional[str]
    task_type: Optional[str]
    priority: Optional[str]
    status: Optional[str]
    due_date: Optional[str]
    assigned_to: Optional[str]
    case_id: Optional[str]
    client_id: Optional[str]
    assignee: Optional[Dict[str, Any]]
    case: Optional[Dict[str, Any]]
    client: Optional[Dict[str, Any]]

class StaffMember(BaseModel):
    id: str
    attorney_id: Optional[str]
    staff_type: Optional[str]
    department: Optional[str]
    hire_date: Optional[str]
    base_salary: Optional[float]
    allowances: Optional[float]
    bank_account: Optional[str]
    tax_id: Optional[str]
    social_insurance_number: Optional[str]
    status: Optional[str]
    attorney: Optional[Dict[str, Any]]

class BankAccount(BaseModel):
    id: str
    bank_name: Optional[str]
    account_number: Optional[str]
    iban: Optional[str]
    account_type: Optional[str]
    currency: Optional[str]
    current_balance: Optional[float]
    status: Optional[str]

class Check(BaseModel):
    id: str
    check_number: Optional[str]
    bank_account_id: Optional[str]
    client_id: Optional[str]
    check_type: Optional[str]
    amount: Optional[float]
    issue_date: Optional[str]
    due_date: Optional[str]
    payee: Optional[str]
    status: Optional[str]
    notes: Optional[str]
    bank: Optional[Dict[str, Any]]
    client: Optional[Dict[str, Any]]

class Salary(BaseModel):
    id: str
    staff_id: str
    month: int
    year: int
    base_amount: float
    allowances_amount: float
    deductions: float
    net_amount: float
    payment_date: Optional[str]
    status: Optional[str]
    staff: Optional[StaffMember]

class Meeting(BaseModel):
    id: str
    title: str
    meeting_type: Optional[str]
    scheduled_date: Optional[str]
    duration_minutes: Optional[int]
    platform: Optional[str]
    meeting_url: Optional[str]
    organizer_id: Optional[str]
    agenda: Optional[str]
    participants: Optional[List[str]] = []
    shared_documents: Optional[List[str]] = []
    status: Optional[str]
    language: Optional[str]
    organizer: Optional[Dict[str, Any]]
    privilege_mode: Optional[bool]
    recording_enabled: Optional[bool]
    encryption_key_ref: Optional[str]
    mom_status: Optional[str]
    is_internal: Optional[bool]
    max_participants: Optional[int]

class MeetingParticipant(BaseModel):
    id: str
    meeting_id: str
    name: str
    role: Optional[str]
    email: Optional[str]
    join_status: Optional[str]
    joined_at: Optional[str]
    is_host: Optional[bool]

class MeetingMinute(BaseModel):
    id: str
    meeting_id: str
    content: str
    status: Optional[str]
    approved_by: Optional[str]
    approved_at: Optional[str]
    created_at: Optional[str]

class MeetingTask(BaseModel):
    id: str
    meeting_id: str
    minute_id: Optional[str]
    title: str
    assignee: Optional[str]
    deadline: Optional[str]
    status: Optional[str]
    synced_to_trello: Optional[bool]
    trello_card_id: Optional[str]

class InternalTask(BaseModel):
    id: str
    title: str
    description: Optional[str]
    task_type: Optional[str]
    priority: Optional[str]
    status: Optional[str]
    due_date: Optional[str]
    assigned_to: Optional[str]
    case_id: Optional[str]
    client_id: Optional[str]
    module_id: Optional[str]
    resource_id: Optional[str]
    source_engine: Optional[str]
    auto_generated: Optional[bool]
    client_visible: Optional[bool]
    hours_logged: Optional[float]
    tags: Optional[List[str]] = []
    encrypted_attachments: Optional[List[str]] = []
    resolved_at: Optional[str]
    closed_at: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]
    assignee: Optional[Dict[str, Any]]
    case: Optional[Dict[str, Any]]
    client: Optional[Dict[str, Any]]

class TaskActivityEntry(BaseModel):
    id: str
    task_id: str
    actor: Optional[str]
    action: str
    old_value: Optional[str]
    new_value: Optional[str]
    metadata: Optional[Dict[str, Any]] = {}
    created_at: Optional[str]

class TaskComment(BaseModel):
    id: str
    task_id: str
    author: Optional[str]
    body: str
    created_at: Optional[str]

class OmniEngine(BaseModel):
    id: str
    engine_code: Optional[str]
    engine_name: Optional[str]
    engine_name_ar: Optional[str]
    category: Optional[str]
    department: Optional[str]
    description: Optional[str]
    icon: Optional[str]
    active: Optional[bool]
    can_activate: Optional[bool]
    created_at: Optional[str]

class OmniCommand(BaseModel):
    id: str
    raw_input: Optional[str]
    input_type: Optional[str]
    intent: Optional[str]
    intent_confidence: Optional[float]
    entities: Optional[List[str]] = []
    status: Optional[str]
    total_subtasks: Optional[int]
    completed_subtasks: Optional[int]
    synthesis_output: Optional[str]
    created_at: Optional[str]
    completed_at: Optional[str]

class OmniSubtask(BaseModel):
    id: str
    command_id: str
    engine_code: Optional[str]
    engine_name_ar: Optional[str]
    task_title: Optional[str]
    task_description: Optional[str]
    department: Optional[str]
    status: Optional[str]
    execution_order: Optional[int]
    result_data: Optional[Dict[str, Any]] = {}
    error_message: Optional[str]
    started_at: Optional[str]
    completed_at: Optional[str]
    created_at: Optional[str]

class OmniAuditLog(BaseModel):
    id: str
    command_id: str
    action: Optional[str]
    actor: Optional[str]
    engine_code: Optional[str]
    detail: Optional[str]
    severity: Optional[str]
    encryption_context: Optional[str]
    created_at: Optional[str]

class Mailbox(BaseModel):
    id: str
    email_address: Optional[str]
    display_name: Optional[str]
    owner_type: Optional[str]
    owner_id: Optional[str]
    department: Optional[str]
    storage_quota_mb: Optional[int]
    storage_used_mb: Optional[int]
    pgp_public_key: Optional[str]
    pgp_fingerprint: Optional[str]
    smime_cert_ref: Optional[str]
    e2ee_enabled: Optional[bool]
    status: Optional[str]
    created_at: Optional[str]

class SovereignEmail(BaseModel):
    id: str
    mailbox_id: str
    direction: Optional[str]
    from_address: Optional[str]
    to_address: Optional[str]
    cc_addresses: Optional[str]
    subject: Optional[str]
    body: Optional[str]
    attachments: Optional[List[str]] = []
    is_encrypted: Optional[bool]
    encryption_method: Optional[str]
    is_read: Optional[bool]
    read_at: Optional[str]
    read_receipt_sent: Optional[bool]
    read_receipt_confirmed_at: Optional[str]
    is_archived: Optional[bool]
    case_id: Optional[str]
    client_id: Optional[str]
    smart_parsed: Optional[bool]
    parsed_entities: Optional[Dict[str, Any]] = {}
    parsed_intent: Optional[str]
    auto_task_created: Optional[bool]
    priority: Optional[str]
    has_invoice: Optional[bool]
    invoice_processed: Optional[bool]
    meeting_id: Optional[str]
    thread_id: Optional[str]
    created_at: Optional[str]
    case: Optional[Dict[str, Any]]
    client: Optional[Dict[str, Any]]

class MailAlias(BaseModel):
    id: str
    alias_address: Optional[str]
    display_name: Optional[str]
    target_addresses: Optional[List[str]] = []
    department: Optional[str]
    alias_type: Optional[str]
    active: Optional[bool]
    created_at: Optional[str]

class MailNotification(BaseModel):
    id: str
    notification_type: Optional[str]
    recipient_address: Optional[str]
    recipient_name: Optional[str]
    subject: Optional[str]
    body: Optional[str]
    related_case_id: Optional[str]
    related_client_id: Optional[str]
    related_meeting_id: Optional[str]
    source_engine: Optional[str]
    status: Optional[str]
    scheduled_for: Optional[str]
    sent_at: Optional[str]
    read_at: Optional[str]
    priority: Optional[str]
    created_at: Optional[str]

class MailAuditLog(BaseModel):
    id: str
    email_id: Optional[str]
    action: Optional[str]
    actor: Optional[str]
    detail: Optional[str]
    ip_address: Optional[str]
    encryption_context: Optional[str]
    created_at: Optional[str]

class InvoiceOcr(BaseModel):
    id: str
    email_id: str
    vendor_name: Optional[str]
    invoice_number: Optional[str]
    invoice_date: Optional[str]
    amount: Optional[float]
    currency: Optional[str]
    due_date: Optional[str]
    ocr_confidence: Optional[float]
    finance_status: Optional[str]
    finance_entry_id: Optional[str]
    created_at: Optional[str]

class RiskAssessment(BaseModel):
    id: str
    title: Optional[str]
    description: Optional[str]
    risk_type: Optional[str]
    risk_level: Optional[str]
    probability: Optional[float]
    financial_impact: Optional[float]
    status: Optional[str]
    source_engine: Optional[str]
    case_id: Optional[str]
    client_id: Optional[str]
    contract_ref: Optional[str]
    document_ref: Optional[str]
    detected_conflicts: Optional[List[str]] = []
    recommended_actions: Optional[List[str]] = []
    board_escalated: Optional[bool]
    created_at: Optional[str]
    updated_at: Optional[str]
    case: Optional[Dict[str, Any]]
    client: Optional[Dict[str, Any]]

class ClauseExtraction(BaseModel):
    id: str
    document_name: Optional[str]
    document_ref: Optional[str]
    clause_type: Optional[str]
    clause_text: Optional[str]
    obligation_party: Optional[str]
    deadline_date: Optional[str]
    penalty_text: Optional[str]
    penalty_amount: Optional[float]
    financial_exposure: Optional[float]
    risk_assessment_id: Optional[str]
    nlp_confidence: Optional[float]
    status: Optional[str]
    created_at: Optional[str]

class EarlyWarning(BaseModel):
    id: str
    risk_assessment_id: str
    warning_type: Optional[str]
    severity: Optional[str]
    message: Optional[str]
    target_engine: Optional[str]
    board_agenda_item: Optional[bool]
    acknowledged: Optional[bool]
    acknowledged_at: Optional[str]
    acknowledged_by: Optional[str]
    created_at: Optional[str]

class RiskDeadline(BaseModel):
    id: str
    title: Optional[str]
    deadline_type: Optional[str]
    deadline_date: Optional[str]
    related_case_id: Optional[str]
    related_client_id: Optional[str]
    contract_ref: Optional[str]
    responsible_party: Optional[str]
    alert_sent_60d: Optional[bool]
    alert_sent_30d: Optional[bool]
    alert_sent_7d: Optional[bool]
    draft_notice_generated: Optional[bool]
    status: Optional[str]
    created_at: Optional[str]

# End of converted types (initial subset)
