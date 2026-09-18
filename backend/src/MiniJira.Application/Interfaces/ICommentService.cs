using MiniJira.Application.DTOs.Comments;

namespace MiniJira.Application.Interfaces;

public interface ICommentService
{
    Task<List<CommentDto>> GetByTaskAsync(Guid projectId, Guid taskId);
    Task<CommentDto> AddAsync(Guid projectId, Guid taskId, CreateCommentRequest request);
    Task DeleteAsync(Guid projectId, Guid taskId, Guid commentId);
}
