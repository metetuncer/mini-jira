namespace MiniJira.Application.DTOs.Attachments;

public class AttachmentDto
{
    public Guid Id { get; set; }
    public Guid TaskItemId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public Guid UploadedById { get; set; }
    public DateTime UploadedAt { get; set; }
    public string DownloadUrl { get; set; } = string.Empty;
}
