using MiniJira.Application.DTOs.Attachments;

namespace MiniJira.Application.Interfaces;

public interface IAttachmentService
{
    Task<List<AttachmentDto>> GetByTaskAsync(Guid projectId, Guid taskId);
    Task<AttachmentDto> UploadAsync(Guid projectId, Guid taskId, Stream content, string fileName, string contentType, long length);
    Task<(Stream Content, string ContentType, string FileName)> DownloadAsync(Guid projectId, Guid taskId, Guid attachmentId);
    Task DeleteAsync(Guid projectId, Guid taskId, Guid attachmentId);
}
