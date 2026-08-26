import json

from scrummaster_core.telemetry import TelemetryLogger


def test_init_creates_log_dir(tmp_path):
    log_dir = tmp_path / "logs"
    TelemetryLogger(log_dir)

    assert log_dir.exists()


def test_log_implementation_attempt_writes_entry(tmp_path):
    logger = TelemetryLogger(tmp_path)
    data = {"status": "success", "task": "test-task"}

    log_file = logger.log_implementation_attempt("story-1", data)

    assert log_file.exists()
    assert log_file.parent == tmp_path
    assert log_file.name.startswith("implement_story-1_")

    entry = json.loads(log_file.read_text(encoding="utf-8"))
    assert entry["story_id"] == "story-1"
    assert entry["data"] == data
    assert "timestamp" in entry
