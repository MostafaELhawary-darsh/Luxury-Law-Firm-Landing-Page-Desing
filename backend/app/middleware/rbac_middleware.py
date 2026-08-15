from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

from fastapi import Depends, HTTPException

from app.core.dependencies import get_current_user

BLOCKED_MODULES = {
    "quarries-mining": ["M103"],
    "cross-border-contracts": ["M90"],
    "import-export": ["M90"],
    "maritime-commerce": ["M90"],
    "tourism-hotels": ["M86"],
    "automotive-trade": ["M94"],
    "shopping-mall": ["M99"],
}

ENGINE_TO_MODULE = {
    "M90": "import-export",
    "M94": "automotive-trade",
    "M99": "shopping-mall",
    "M86": "tourism-hotels",
    "M103": "quarries-mining",
}


def evaluate_backend_access(
    module_id: str | None = None,
    engine_code: str | None = None,
    granted_modules: list[str] | None = None,
) -> dict[str, Any]:
    granted = set(granted_modules or [])
    target_module = module_id or (ENGINE_TO_MODULE.get(engine_code or "") if engine_code else None)

    if not target_module:
        return {
            "allowed": True,
            "status": 200,
            "reason": "No module or engine restriction applied.",
            "blocked_modules": [],
            "blocked_engines": [],
            "allowed_modules": sorted(granted),
        }

    blocked_engines = BLOCKED_MODULES.get(target_module, [])
    if engine_code and engine_code not in blocked_engines:
        blocked_engines = []

    if not granted or target_module not in granted:
        return {
            "allowed": False,
            "status": 403,
            "reason": f"Module {target_module} is not enabled for this tenant and execution is forbidden.",
            "blocked_modules": [target_module],
            "blocked_engines": blocked_engines if blocked_engines else ([engine_code] if engine_code else []),
            "allowed_modules": sorted(granted),
        }

    if engine_code and engine_code in blocked_engines:
        return {
            "allowed": False,
            "status": 403,
            "reason": f"Engine {engine_code} is disabled for module {target_module}.",
            "blocked_modules": [target_module],
            "blocked_engines": [engine_code],
            "allowed_modules": sorted(granted),
        }

    return {
        "allowed": True,
        "status": 200,
        "reason": "Access granted.",
        "blocked_modules": [],
        "blocked_engines": [],
        "allowed_modules": sorted(granted),
    }


@dataclass(frozen=True)
class Permission:
    module: str
    action: str
    resource: str | None = None

    def to_string(self) -> str:
        if self.resource:
            return f"{self.module}:{self.resource}:{self.action}"
        return f"{self.module}:{self.action}"

    @classmethod
    def from_string(cls, perm: str) -> "Permission":
        parts = perm.split(":")
        if len(parts) == 2:
            return cls(module=parts[0], action=parts[1], resource=None)
        if len(parts) == 3:
            return cls(module=parts[0], action=parts[2], resource=parts[1])
        raise ValueError(f"Invalid permission format: {perm}")


def _build_default_matrix() -> dict[str, set[str]]:
    return {
        "admin": set(),
        "partner": {
            "M06:CASE:CREATE",
            "M06:CASE:READ",
            "M06:CASE:UPDATE",
            "M06:CASE:DELETE",
            "M54:DOC:CREATE",
            "M54:DOC:READ",
            "M54:DOC:UPDATE",
            "M54:DOC:DELETE",
            "M54:DOC:SUBMIT",
            "M54:DOC:APPROVE",
            "M54:TEMPLATE:CREATE",
            "shared:AUDIT:READ",
            "shared:AUDIT:WRITE",
            "shared:TICKET:CREATE",
            "shared:TICKET:READ",
            "shared:TICKET:UPDATE",
            "shared:TICKET:DELETE",
            "shared:MESSAGE:CREATE",
            "shared:MESSAGE:READ",
            "shared:MESSAGE:DELETE",
        },
        "associate": {
            "M06:CASE:READ",
            "M06:CASE:CREATE",
            "M54:DOC:READ",
            "M54:DOC:CREATE",
            "M54:DOC:SUBMIT",
            "shared:AUDIT:READ",
            "shared:TICKET:CREATE",
            "shared:TICKET:READ",
            "shared:TICKET:UPDATE",
            "shared:MESSAGE:CREATE",
            "shared:MESSAGE:READ",
        },
        "paralegal": {
            "M06:CASE:READ",
            "shared:READ",
            "shared:TICKET:CREATE",
            "shared:TICKET:READ",
            "shared:MESSAGE:CREATE",
            "shared:MESSAGE:READ",
        },
        "guest": set(),
    }


class RBACChecker:
    def __init__(self, permission_matrix: dict[str, set[str]] | None = None) -> None:
        self._matrix = permission_matrix or _build_default_matrix()

    @property
    def matrix(self) -> dict[str, set[str]]:
        return self._matrix

    def has_permission(self, role: str, permission: str) -> bool:
        if role == "admin":
            return True
        perms = self._matrix.get(role, set())
        if permission in perms:
            return True
        parts = permission.split(":")
        if len(parts) == 3:
            wildcard = f"{parts[0]}:{parts[1]}:*"
            if wildcard in perms:
                return True
            module_wildcard = f"{parts[0]}:*"
            if module_wildcard in perms:
                return True
        elif len(parts) == 2:
            wildcard = f"{parts[0]}:*"
            if wildcard in perms:
                return True
        return False

    def get_permissions(self, role: str) -> set[str]:
        if role == "admin":
            return {"*"}
        return self._matrix.get(role, set())


_checker = RBACChecker()


def require_permission(permission: str) -> Callable:
    async def dependency(user: dict = Depends(get_current_user)) -> dict:
        role = user.get("role", "guest")
        if not _checker.has_permission(role, permission):
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions for {permission}",
            )

        module_name = permission.split(":", 1)[0].lower()
        decision = evaluate_backend_access(
            module_id=module_name,
            engine_code=permission.split(":", 1)[0] if permission.startswith("M") else None,
            granted_modules=user.get("permissions", []) or [role],
        )
        if not decision["allowed"]:
            raise HTTPException(
                status_code=decision["status"],
                detail=decision["reason"],
            )
        return user

    return dependency


class ABACEvaluator:
    def __init__(self, rbac_checker: RBACChecker | None = None) -> None:
        self._rbac = rbac_checker or _checker

    def evaluate(
        self,
        user_attrs: dict,
        resource_attrs: dict,
        action: str,
    ) -> bool:
        role = user_attrs.get("role", "guest")

        if role == "admin":
            return True

        user_id = user_attrs.get("user_id")
        resource_owner_id = resource_attrs.get("owner_id") or resource_attrs.get("user_id")
        is_owner = (
            user_id is not None
            and resource_owner_id is not None
            and str(user_id) == str(resource_owner_id)
        )

        required_permission = resource_attrs.get("required_permission")
        has_role_perm = False
        if required_permission:
            has_role_perm = self._rbac.has_permission(role, required_permission)

        action_rules = {
            "read": is_owner or has_role_perm,
            "update": is_owner or has_role_perm,
            "delete": has_role_perm and (is_owner or role in ("admin", "partner")),
            "create": has_role_perm,
        }

        return action_rules.get(action, has_role_perm or is_owner)
