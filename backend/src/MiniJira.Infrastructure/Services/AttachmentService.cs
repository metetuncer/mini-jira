using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MiniJira.Application.Common;
using MiniJira.Application.DTOs.Attachments;
using MiniJira.Application.Interfaces;
using MiniJira.Domain.Entities;
using MiniJira.Infrastructure.Persistence;

namespace MiniJira.Infrastructure.Services;

// Basit local disk depolama. İleride Azure Blob / S3 uyumlu bir servisle
// değiştirilmek istenirse sadece bu sınıfın implementasyonu değişir (IAttachmentService sabit kalır).
public class AttachmentService : IAttachmentService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly string _storageRoot;

    public AttachmentService(AppDbContext db, ICurrentUserService currentUser, IConfiguration config)
    {
        _db = db;
        _currentUser = currentUser;
        _storageRoot = config["Storage:AttachmentsPath"] ?? "App_Data/attachments";
        Directory.CreateDirectory(_storageRoot);
    }

    public async Task<List<AttachmentDto>> GetByTaskAsync(Guid projectId, Guid taskId)
    {
        await EnsureMemberAsync(projectId);
        if (!await _db.TaskItems.AnyAsync(t => t.Id == taskId && t.ProjectId == projectId))
            throw new NotFoundException("Görev bulunamadı.");
        var items = await _db.Attachments.Where(a => a.TaskItemId == taskId).OrderByDescending(a => a.UploadedAt).ToListAsync();
        return items.Select(a => ToDto(a, projectId)).ToList();
    }

    public async Task<AttachmentDto> UploadAsync(Guid projectId, Guid taskId, Stream content, string fileName, string contentType, long length)
    {
        await EnsureMemberAsync(projectId);
        var taskExists = await _db.TaskItems.AnyAsync(t => t.Id == taskId && t.ProjectId == projectId);
        if (!taskExists)
        {
            throw new NotFoundException("Görev bulunamadı.");
        }

        // Original names are metadata only; disk paths never contain user input.
        var storedName = Guid.NewGuid().ToString("N");
        var fullPath = Path.Combine(_storageRoot, storedName);

        await using (var fileStream = File.Create(fullPath))
        {
            await content.CopyToAsync(fileStream);
        }

        var attachment = new Attachment
        {
            TaskItemId = taskId,
            FileName = fileName,
            StoragePath = storedName,
            ContentType = contentType,
            FileSizeBytes = length,
            UploadedById = _currentUser.UserId
        };

        _db.Attachments.Add(attachment);
        await _db.SaveChangesAsync();

        return ToDto(attachment, projectId);
    }

    public async Task<(Stream Content, string ContentType, string FileName)> DownloadAsync(Guid projectId, Guid taskId, Guid attachmentId)
    {
        await EnsureMemberAsync(projectId);
        if (!await _db.TaskItems.AnyAsync(t => t.Id == taskId && t.ProjectId == projectId))
            throw new NotFoundException("Görev bulunamadı.");
        var attachment = await _db.Attachments.FirstOrDefaultAsync(a => a.Id == attachmentId && a.TaskItemId == taskId)
            ?? throw new NotFoundException("Dosya bulunamadı.");

        var fullPath = Path.Combine(_storageRoot, attachment.StoragePath);
        if (!File.Exists(fullPath))
        {
            throw new NotFoundException("Dosya sunucuda bulunamadı.");
        }

        Stream stream = File.OpenRead(fullPath);
        return (stream, attachment.ContentType, attachment.FileName);
    }

    public async Task DeleteAsync(Guid projectId, Guid taskId, Guid attachmentId)
    {
        await EnsureMemberAsync(projectId);
        if (!await _db.TaskItems.AnyAsync(t => t.Id == taskId && t.ProjectId == projectId))
            throw new NotFoundException("Görev bulunamadı.");
        var attachment = await _db.Attachments.FirstOrDefaultAsync(a => a.Id == attachmentId && a.TaskItemId == taskId)
            ?? throw new NotFoundException("Dosya bulunamadı.");

        var fullPath = Path.Combine(_storageRoot, attachment.StoragePath);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }

        _db.Attachments.Remove(attachment);
        await _db.SaveChangesAsync();
    }

    private async Task EnsureMemberAsync(Guid projectId)
    {
        var isMember = await _db.ProjectMembers.AnyAsync(m => m.ProjectId == projectId && m.UserId == _currentUser.UserId);
        if (!isMember)
        {
            throw new ForbiddenException("Bu projeye erişim yetkiniz yok.");
        }
    }

    private static AttachmentDto ToDto(Attachment attachment, Guid projectId) => new()
    {
        Id = attachment.Id,
        TaskItemId = attachment.TaskItemId,
        FileName = attachment.FileName,
        ContentType = attachment.ContentType,
        FileSizeBytes = attachment.FileSizeBytes,
        UploadedById = attachment.UploadedById,
        UploadedAt = attachment.UploadedAt,
        DownloadUrl = $"/api/projects/{projectId}/tasks/{attachment.TaskItemId}/attachments/{attachment.Id}/download"
    };
}
