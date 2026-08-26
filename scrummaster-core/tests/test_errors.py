from scrummaster_core.errors import ErrorCategory, ScrummasterError, ValidationError


def test_scrummaster_error_to_dict():
    error = ScrummasterError("Generic error", ErrorCategory.SYSTEM, {"code": 500})
    data = error.to_dict()
    assert data["error"]["message"] == "Generic error"
    assert data["error"]["category"] == "system"
    assert data["error"]["details"]["code"] == 500


def test_validation_error():
    error = ValidationError("Invalid input", {"field": "username"})
    assert error.category == ErrorCategory.VALIDATION
    assert error.details["field"] == "username"
