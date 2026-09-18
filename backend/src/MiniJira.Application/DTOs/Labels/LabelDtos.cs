using System.ComponentModel.DataAnnotations;

namespace MiniJira.Application.DTOs.Labels;

public class LabelDto
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ColorHex { get; set; } = string.Empty;
}

public class CreateLabelRequest
{
    [Required, MinLength(1), MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    [Required, RegularExpression("^#([A-Fa-f0-9]{6})$")]
    public string ColorHex { get; set; } = "#6366F1";
}
