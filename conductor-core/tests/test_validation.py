from conductor_core.validation import ValidationService


def test_validate_gemini_toml(tmp_path):
    templates = tmp_path / "templates"
    templates.mkdir()
    (templates / "setup.j2").write_text("CORE PROMPT")

    commands = tmp_path / "commands"
    commands.mkdir()
    toml = commands / "setup.toml"
    # Use raw string or careful escaping for multi-line
    content = 'description = "test"\nprompt = """CORE PROMPT"""'
    toml.write_text(content)

    service = ValidationService(str(templates))
    valid, msg = service.validate_gemini_toml(str(toml), "setup.j2")
    assert valid is True
    assert msg == "Matches core template"


def test_validate_gemini_toml_mismatch(tmp_path):
    templates = tmp_path / "templates"
    templates.mkdir()
    (templates / "setup.j2").write_text("CORE PROMPT")

    commands = tmp_path / "commands"
    commands.mkdir()
    toml = commands / "setup.toml"
    content = 'description = "test"\nprompt = """DIFFERENT PROMPT"""'
    toml.write_text(content)

    service = ValidationService(str(templates))
    valid, msg = service.validate_gemini_toml(str(toml), "setup.j2")
    assert valid is False
    assert msg == "Content mismatch"


def test_synchronize_gemini_toml_missing_file(tmp_path):
    templates = tmp_path / "templates"
    templates.mkdir()
    (templates / "setup.j2").write_text("CORE PROMPT")

    service = ValidationService(str(templates))
    ok, msg = service.synchronize_gemini_toml(str(tmp_path / "missing.toml"), "setup.j2")
    assert ok is False
    assert "File not found" in msg


def test_synchronize_gemini_toml_replaces_triple_quoted_prompt(tmp_path):
    templates = tmp_path / "templates"
    templates.mkdir()
    (templates / "setup.j2").write_text("NEW PROMPT")

    toml = tmp_path / "setup.toml"
    toml.write_text('description = "test"\nprompt = """OLD PROMPT"""')

    service = ValidationService(str(templates))
    ok, _ = service.synchronize_gemini_toml(str(toml), "setup.j2")
    assert ok is True

    updated = toml.read_text()
    assert "NEW PROMPT" in updated
    assert "OLD PROMPT" not in updated


def test_synchronize_gemini_toml_replaces_empty_prompt(tmp_path):
    templates = tmp_path / "templates"
    templates.mkdir()
    (templates / "setup.j2").write_text("NEW PROMPT")

    toml = tmp_path / "setup.toml"
    toml.write_text('description = "test"\nprompt = ""')

    service = ValidationService(str(templates))
    ok, _ = service.synchronize_gemini_toml(str(toml), "setup.j2")
    assert ok is True

    updated = toml.read_text()
    assert "NEW PROMPT" in updated


def test_synchronize_gemini_toml_appends_prompt_when_absent(tmp_path):
    templates = tmp_path / "templates"
    templates.mkdir()
    (templates / "setup.j2").write_text("NEW PROMPT")

    toml = tmp_path / "setup.toml"
    toml.write_text('description = "test"')

    service = ValidationService(str(templates))
    ok, _ = service.synchronize_gemini_toml(str(toml), "setup.j2")
    assert ok is True

    updated = toml.read_text()
    assert 'description = "test"' in updated
    assert "NEW PROMPT" in updated
