from typing import Dict, Any
from datetime import datetime, timedelta
from app.workers.celery_app import celery_app

def compute_deadlines_for_case(case: Dict[str, Any]) -> Dict[str, Any]:
    # Very simple example: if next_session_date present, create reminders at -30,-7,-1 days
    deadlines = []
    ns = case.get("next_session_date")
    if not ns:
        return {"deadlines": []}
    try:
        dt = datetime.fromisoformat(ns)
    except Exception:
        # expecting ISO format in prototype
        return {"deadlines": []}
    for days_before in (30, 7, 1):
        remind_at = dt - timedelta(days=days_before)
        deadlines.append({"type": f"reminder_{days_before}d", "remind_at": remind_at.isoformat()})
    return {"deadlines": deadlines}

@celery_app.task(name="deadline.compute_for_case")
def compute_deadlines_task(case_payload: Dict[str, Any]):
    return compute_deadlines_for_case(case_payload)
