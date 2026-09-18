using MiniJira.Domain.Enums;

namespace MiniJira.Domain.Entities;

public class TaskItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public MiniJiraTaskStatus Status { get; set; } = MiniJiraTaskStatus.Todo;
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;

    // Aynı sütun (status) içindeki kartların sırasını belirler (drag & drop için)
    public int Order { get; set; }

    public Guid? SprintId { get; set; }
    public int IssueType { get; set; } // 0 Task, 1 Bug, 2 Story, 3 Epic
    public int? StoryPoints { get; set; }
    public DateOnly? DueDate { get; set; }
    public Sprint? Sprint { get; set; }

    public Guid? AssigneeId { get; set; }
    public Guid CreatedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<TaskLabel> TaskLabels { get; set; } = new List<TaskLabel>();
    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
}
