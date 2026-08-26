from scrummaster_core.models import TaskStatus
from scrummaster_core.parser import MarkdownParser


def test_parse_plan_creates_default_phase_for_task_without_heading():
    content = "- [ ] Task without a preceding phase heading\n"

    plan = MarkdownParser.parse_plan(content)

    assert len(plan.phases) == 1
    assert plan.phases[0].name == "Default Phase"
    assert plan.phases[0].tasks[0].description == "Task without a preceding phase heading"
    assert plan.phases[0].tasks[0].status == TaskStatus.PENDING


def test_parse_plan_maps_task_status_characters():
    content = "## Phase 1\n- [ ] Pending task\n- [~] In progress task\n- [x] Completed task\n"

    plan = MarkdownParser.parse_plan(content)

    tasks = plan.phases[0].tasks
    assert tasks[0].status == TaskStatus.PENDING
    assert tasks[1].status == TaskStatus.IN_PROGRESS
    assert tasks[2].status == TaskStatus.COMPLETED
