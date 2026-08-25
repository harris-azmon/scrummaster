import pytest
from scrummaster_core.config import ScrummasterConfig, ConfigManager


def test_load_config_creates_default_when_missing(tmp_path):
    manager = ConfigManager(tmp_path)
    config = manager.load_config()

    assert config.version == "1.0"
    assert (tmp_path / "scrummaster" / "config.json").exists()


def test_load_config_reads_existing_file(tmp_path):
    scrummaster_dir = tmp_path / "scrummaster"
    scrummaster_dir.mkdir()
    (scrummaster_dir / "config.json").write_text('{"project_name": "my-project"}', encoding="utf-8")

    manager = ConfigManager(tmp_path)
    config = manager.load_config()

    assert config.project_name == "my-project"


def test_load_config_caches_result(tmp_path):
    manager = ConfigManager(tmp_path)
    first = manager.load_config()
    second = manager.load_config()

    assert first is second


def test_load_config_invalid_json_raises(tmp_path):
    scrummaster_dir = tmp_path / "scrummaster"
    scrummaster_dir.mkdir()
    (scrummaster_dir / "config.json").write_text("not json", encoding="utf-8")

    manager = ConfigManager(tmp_path)
    with pytest.raises(ValueError, match="Invalid configuration"):
        manager.load_config()


def test_load_config_validation_error_raises(tmp_path):
    scrummaster_dir = tmp_path / "scrummaster"
    scrummaster_dir.mkdir()
    (scrummaster_dir / "config.json").write_text('{"enable_locking": "not-a-bool"}', encoding="utf-8")

    manager = ConfigManager(tmp_path)
    with pytest.raises(ValueError, match="Invalid configuration"):
        manager.load_config()


def test_save_config_with_explicit_config(tmp_path):
    manager = ConfigManager(tmp_path)
    config = ScrummasterConfig(project_name="explicit")
    manager.save_config(config)

    reloaded = ConfigManager(tmp_path).load_config()
    assert reloaded.project_name == "explicit"


def test_save_config_without_prior_load_uses_default(tmp_path):
    manager = ConfigManager(tmp_path)
    manager.save_config()

    reloaded = ConfigManager(tmp_path).load_config()
    assert reloaded.version == "1.0"


def test_update_config_sets_known_fields_and_ignores_unknown(tmp_path):
    manager = ConfigManager(tmp_path)
    updated = manager.update_config(project_name="updated", not_a_real_field="ignored")

    assert updated.project_name == "updated"
    assert not hasattr(updated, "not_a_real_field")

    reloaded = ConfigManager(tmp_path).load_config()
    assert reloaded.project_name == "updated"


def test_get_config_value_returns_field_or_default(tmp_path):
    manager = ConfigManager(tmp_path)
    manager.update_config(project_name="lookup-me")

    assert manager.get_config_value("project_name") == "lookup-me"
    assert manager.get_config_value("missing_field", "fallback") == "fallback"
