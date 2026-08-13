*** Begin Patch
*** Add File: backend/app/api/v1/audit.py
+from fastapi import APIRouter, Depends, HTTPException
+from pydantic import BaseModel
+from app.db.session import get_db
+from sqlalchemy.ext.asyncio import AsyncSession
+from app.db import crud
+from datetime import datetime
+
+router = APIRouter()
+
+
+class AuditIn(BaseModel):
+    action: str
+    resource: str
+    resource_id: str | None = None
+    actor: str | None = None
+    details: dict | None = None
+
+
+@router.post('/audit', tags=['audit'])
+async def create_audit(item: AuditIn, db: AsyncSession = Depends(get_db)):
+    # Write audit record to DB using server credentials
+    try:
+        q = """
+        INSERT INTO audit_logs (action, resource, resource_id, actor, details, created_at)
+        VALUES (:action, :resource, :resource_id, :actor, :details, :created_at)
+        """
+        params = {
+            'action': item.action,
+            'resource': item.resource,
+            'resource_id': item.resource_id,
+            'actor': item.actor or 'anonymous',
+            'details': item.details,
+            'created_at': datetime.utcnow(),
+        }
+        await db.execute(q, params)
+        await db.commit()
+        return {'ok': True}
+    except Exception as e:
+        raise HTTPException(status_code=500, detail=str(e))
+
*** End Patch
