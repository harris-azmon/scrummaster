from __future__ import annotations

from enum import Enum
from typing import Any


class ErrorCategory(str, Enum):
    VALIDATION = "validation"
    VCS = "vcs"
    SYSTEM = "system"
    USER = "user"


class ScrummasterError(Exception):
    """Base class for all Scrummaster errors."""

    def __init__(self, message: str, category: ErrorCategory, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.category = category
        self.details = details or {}

    def to_dict(self) -> dict[str, Any]:
        return {"error": {"message": self.message, "category": self.category.value, "details": self.details}}


class ValidationError(ScrummasterError):
    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, ErrorCategory.VALIDATION, details)


class VCSError(ScrummasterError):
    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, ErrorCategory.VCS, details)


class ProjectError(ScrummasterError):
    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, ErrorCategory.SYSTEM, details)
