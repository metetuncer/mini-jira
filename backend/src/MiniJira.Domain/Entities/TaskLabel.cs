namespace MiniJira.Domain.Entities;

// TaskItem <-> Label çoktan çoğa ilişki tablosu
public class TaskLabel
{
    public Guid TaskItemId { get; set; }
    public TaskItem TaskItem { get; set; } = null!;
    public Guid LabelId { get; set; }
    public Label Label { get; set; } = null!;
}
