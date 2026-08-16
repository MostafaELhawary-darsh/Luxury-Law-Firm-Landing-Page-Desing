from __future__ import annotations

import base64
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

_aes_key_bytes: bytes = bytes.fromhex(settings.AES_256_KEY)
_aesgcm: AESGCM = AESGCM(_aes_key_bytes)

_hasher: PasswordHasher = PasswordHasher()


class CryptoService:
    @staticmethod
    def encrypt(plaintext: str) -> str:
        nonce: bytes = os.urandom(12)
        ciphertext: bytes = _aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
        combined: bytes = nonce + ciphertext
        return base64.urlsafe_b64encode(combined).decode("utf-8")

    @staticmethod
    def decrypt(ciphertext: str) -> str:
        combined: bytes = base64.urlsafe_b64decode(ciphertext.encode("utf-8"))
        nonce: bytes = combined[:12]
        ct: bytes = combined[12:]
        plaintext: bytes = _aesgcm.decrypt(nonce, ct, None)
        return plaintext.decode("utf-8")


class PasswordService:
    @staticmethod
    def hash_password(password: str) -> str:
        return _hasher.hash(password)

    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        try:
            return _hasher.verify(password_hash, password)
        except (VerifyMismatchError, InvalidHashError):
            return False


class JWTManager:
    @staticmethod
    def create_token(
        user_id: str | uuid.UUID,
        role: str,
        permissions: list[str] | None = None,
    ) -> str:
        now: datetime = datetime.now(timezone.utc)
        expire: datetime = now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
        payload: dict[str, Any] = {
            "sub": str(user_id),
            "role": role,
            "permissions": permissions or [],
            "iat": now,
            "exp": expire,
            "iss": settings.APP_NAME,
        }
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    @staticmethod
    def decode_token(token: str) -> dict[str, Any]:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            issuer=settings.APP_NAME,
        )
