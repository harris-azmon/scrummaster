from scrummaster_core.models import Phase, Plan, Task, TaskStatus, Story, StoryStatus


def test_task_model():
    task = Task(description="Test Task", status=TaskStatus.PENDING)
    assert task.description == "Test Task"
    assert task.status == TaskStatus.PENDING


def test_phase_model():
    task = Task(description="Test Task", status=TaskStatus.PENDING)
    phase = Phase(name="Phase 1", tasks=[task])
    assert phase.name == "Phase 1"
    assert len(phase.tasks) == 1


def test_plan_model():
    task = Task(description="Test Task", status=TaskStatus.PENDING)
    phase = Phase(name="Phase 1", tasks=[task])
    plan = Plan(phases=[phase])
    assert len(plan.phases) == 1


def test_track_model():
    story = Story(story_id="test_id", description="Test Story", status=StoryStatus.NEW)
    assert story.story_id == "test_id"
    assert story.status == StoryStatus.NEW
