namespace MiniJira.Domain.Entities;

public class Label
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string ColorHex { get; set; } = "#6366F1";

    public ICollection<TaskLabel> TaskLabels { get; set; } = new List<TaskLabel>();
}
