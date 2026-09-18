using System.ComponentModel.DataAnnotations;
using MiniJira.Domain.Enums;

namespace MiniJira.Application.DTOs.Tasks;

public class TaskItemDto
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    [EnumDataType(typeof(MiniJiraTaskStatus))]
    public MiniJiraTaskStatus Status { get; set; }
    [EnumDataType(typeof(TaskPriority))]
    public TaskPriority Priority { get; set; }
    public int Order { get; set; }
    public Guid? SprintId { get; set; }
    [Range(0, 3)]
    public int IssueType { get; set; } // 0 Task, 1 Bug, 2 Story, 3 Epic
    [Range(0, 1000)]
    public int? StoryPoints { get; set; }
    public DateOnly? DueDate { get; set; }
    public Guid? AssigneeId { get; set; }
    public Guid CreatedById { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public List<Guid> LabelIds { get; set; } = new();
}

public class CreateTaskRequest
{
    [Required, MinLength(1), MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    [EnumDataType(typeof(TaskPriority))]
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    public Guid? SprintId { get; set; }
    [Range(0, 3)]
    public int IssueType { get; set; } // 0 Task, 1 Bug, 2 Story, 3 Epic
    [Range(0, 1000)]
    public int? StoryPoints { get; set; }
    public DateOnly? DueDate { get; set; }
    public Guid? AssigneeId { get; set; }
}

public class UpdateTaskRequest
{
    [Required, MinLength(1), MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    [EnumDataType(typeof(TaskPriority))]
    public TaskPriority Priority { get; set; }
    public Guid? SprintId { get; set; }
    [Range(0, 3)]
    public int IssueType { get; set; } // 0 Task, 1 Bug, 2 Story, 3 Epic
    [Range(0, 1000)]
    public int? StoryPoints { get; set; }
    public DateOnly? DueDate { get; set; }
    public Guid? AssigneeId { get; set; }
}

public class MoveTaskRequest
{
    [EnumDataType(typeof(MiniJiraTaskStatus))]
    public MiniJiraTaskStatus Status { get; set; }
    public int Order { get; set; }
}

// Query string ile gelen arama / filtre parametreleri
public class TaskFilterQuery
{
    public string? Search { get; set; }
    public MiniJiraTaskStatus? Status { get; set; }
    public Guid? SprintId { get; set; }
    [Range(0, 3)]
    public int IssueType { get; set; } // 0 Task, 1 Bug, 2 Story, 3 Epic
    [Range(0, 1000)]
    public int? StoryPoints { get; set; }
    public DateOnly? DueDate { get; set; }
    public Guid? AssigneeId { get; set; }
    public Guid? LabelId { get; set; }
}
