using System.ComponentModel.DataAnnotations;

namespace MiniJira.Application.DTOs.Comments;

public class CommentDto
{
    public Guid Id { get; set; }
    public Guid TaskItemId { get; set; }
    public Guid AuthorId { get; set; }
    public string AuthorDisplayName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CreateCommentRequest
{
    [Required, MinLength(1), MaxLength(2000)]
    public string Content { get; set; } = string.Empty;
}
