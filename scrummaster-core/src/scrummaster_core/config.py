from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ValidationError


class ScrummasterConfig(BaseModel):
    """Configuration model for Scrummaster."""

    version: str = "1.0"
    project_name: str = ""
    description: str = ""
    default_story_template: str = "default"
    enable_fossil_integration: bool = True
    enable_locking: bool = True
    default_workflow: str = "standard"
    extensions: dict[str, Any] = {}
    templates_path: str = "./templates"
    stories_path: str = "./stories"
    archive_path: str = "./archive"


class ConfigManager:
    """Manages scrummaster configuration."""

    def __init__(self, base_path: str | Path = ".") -> None:
        self.base_path = Path(base_path)
        self.scrummaster_path = self.base_path / "scrummaster"
        self.config_file = self.scrummaster_path / "config.json"
        self._config: ScrummasterConfig | None = None

    def load_config(self) -> ScrummasterConfig:
        """Load configuration from config.json file."""
        if self._config is not None:
            return self._config

        if self.config_file.exists():
            try:
                content = self.config_file.read_text(encoding="utf-8")
                data = json.loads(content)
                self._config = ScrummasterConfig(**data)
            except (json.JSONDecodeError, ValidationError) as e:
                raise ValueError(f"Invalid configuration in {self.config_file}: {e}") from e
        else:
            # Create default configuration
            self._config = ScrummasterConfig()
            self.save_config()

        return self._config

    def save_config(self, config: ScrummasterConfig | None = None) -> None:
        """Save configuration to config.json file."""
        if config is not None:
            self._config = config
        elif self._config is None:
            self._config = ScrummasterConfig()

        # Ensure scrummaster directory exists
        self.scrummaster_path.mkdir(parents=True, exist_ok=True)

        # Write config to file
        with self.config_file.open("w", encoding="utf-8") as f:
            f.write(self._config.model_dump_json(indent=2))

    def update_config(self, **kwargs: Any) -> ScrummasterConfig:
        """Update configuration with provided values."""
        config = self.load_config()

        # Update fields
        for key, value in kwargs.items():
            if hasattr(config, key):
                setattr(config, key, value)

        self.save_config(config)
        return config

    def get_config_value(self, key: str, default: Any = None) -> Any:
        """Get a specific configuration value."""
        config = self.load_config()
        return getattr(config, key, default)
