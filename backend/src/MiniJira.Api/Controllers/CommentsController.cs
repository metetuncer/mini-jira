using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiniJira.Application.DTOs.Comments;
using MiniJira.Application.Interfaces;

namespace MiniJira.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/projects/{projectId:guid}/tasks/{taskId:guid}/comments")]
public class CommentsController : ControllerBase
{
    private readonly ICommentService _commentService;

    public CommentsController(ICommentService commentService)
    {
        _commentService = commentService;
    }

    [HttpGet]
    public async Task<ActionResult<List<CommentDto>>> GetAll(Guid projectId, Guid taskId) =>
        Ok(await _commentService.GetByTaskAsync(projectId, taskId));

    [HttpPost]
    public async Task<ActionResult<CommentDto>> Add(Guid projectId, Guid taskId, CreateCommentRequest request) =>
        Ok(await _commentService.AddAsync(projectId, taskId, request));

    [HttpDelete("{commentId:guid}")]
    public async Task<IActionResult> Delete(Guid projectId, Guid taskId, Guid commentId)
    {
        await _commentService.DeleteAsync(projectId, taskId, commentId);
        return NoContent();
    }
}
