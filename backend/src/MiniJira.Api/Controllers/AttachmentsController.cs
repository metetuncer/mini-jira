using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiniJira.Application.DTOs.Attachments;
using MiniJira.Application.Interfaces;

namespace MiniJira.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/projects/{projectId:guid}/tasks/{taskId:guid}/attachments")]
public class AttachmentsController : ControllerBase
{
    private readonly IAttachmentService _attachmentService;

    public AttachmentsController(IAttachmentService attachmentService)
    {
        _attachmentService = attachmentService;
    }

    [HttpGet]
    public async Task<ActionResult<List<AttachmentDto>>> GetAll(Guid projectId, Guid taskId) =>
        Ok(await _attachmentService.GetByTaskAsync(projectId, taskId));

    [HttpPost]
    [RequestSizeLimit(20_000_000)] // 20 MB
    public async Task<ActionResult<AttachmentDto>> Upload(Guid projectId, Guid taskId, IFormFile file)
    {
        await using var stream = file.OpenReadStream();
        var result = await _attachmentService.UploadAsync(projectId, taskId, stream, file.FileName, file.ContentType, file.Length);
        return Ok(result);
    }

    [HttpGet("{attachmentId:guid}/download")]
    public async Task<IActionResult> Download(Guid projectId, Guid taskId, Guid attachmentId)
    {
        var (content, contentType, fileName) = await _attachmentService.DownloadAsync(projectId, taskId, attachmentId);
        return File(content, string.IsNullOrEmpty(contentType) ? "application/octet-stream" : contentType, fileName);
    }

    [HttpDelete("{attachmentId:guid}")]
    public async Task<IActionResult> Delete(Guid projectId, Guid taskId, Guid attachmentId)
    {
        await _attachmentService.DeleteAsync(projectId, taskId, attachmentId);
        return NoContent();
    }
}
