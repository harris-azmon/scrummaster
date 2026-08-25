-- Scrummaster fossil ticket schema extension
--
-- Fossil's ticket table lives in the repository's own SQLite database and can be
-- extended with plain ALTER TABLE statements — this is the supported mechanism for
-- custom ticket fields (the web-UI ticket configuration editor produces the same
-- effect, plus optional display-form artifacts, which are not required for the
-- `fossil ticket add`/`fossil ticket change` CLI commands used by Scrummaster's
-- skills to work).
--
-- Apply once per repository, right after `fossil open`:
--   fossil sql < templates/fossil/ticket_schema.sql
--
-- One ticket = one ACID. `story_id` and `epic_id` let `fossil ticket list
-- story_id "<id>"` answer "is this story done?"; `acid` is the stable
-- `<story-name>.<COMPONENT>.<n>[-<sub>]` identifier from the story's spec.md.

ALTER TABLE ticket ADD COLUMN epic_id TEXT;
ALTER TABLE ticket ADD COLUMN story_id TEXT;
ALTER TABLE ticket ADD COLUMN acid TEXT;
ALTER TABLE ticket ADD COLUMN component TEXT;
ALTER TABLE ticket ADD COLUMN deprecated BOOLEAN DEFAULT 0;

-- Helpful indexes for `fossil ticket list story_id "..."` / status rollups.
CREATE INDEX IF NOT EXISTS ticket_story_id_idx ON ticket(story_id);
CREATE INDEX IF NOT EXISTS ticket_epic_id_idx ON ticket(epic_id);
CREATE INDEX IF NOT EXISTS ticket_acid_idx ON ticket(acid);
