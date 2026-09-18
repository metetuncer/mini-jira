using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MiniJira.Application.Common;
using MiniJira.Application.DTOs.Comments;
using MiniJira.Application.Interfaces;
using MiniJira.Domain.Entities;
using MiniJira.Infrastructure.Identity;
using MiniJira.Infrastructure.Persistence;

namespace MiniJira.Infrastructure.Services;

public class CommentService : ICommentService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly UserManager<ApplicationUser> _userManager;

    public CommentService(AppDbContext db, ICurrentUserService currentUser, UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _currentUser = currentUser;
        _userManager = userManager;
    }

    public async Task<List<CommentDto>> GetByTaskAsync(Guid projectId, Guid taskId)
    {
        await EnsureMemberAsync(projectId);
        await EnsureTaskExistsAsync(projectId, taskId);

        var comments = await _db.Comments.Where(c => c.TaskItemId == taskId).OrderBy(c => c.CreatedAt).ToListAsync();
        var authorIds = comments.Select(c => c.AuthorId).Distinct().ToList();
        var authors = await _userManager.Users.Where(u => authorIds.Contains(u.Id)).ToListAsync();

        return comments.Select(c => new CommentDto
        {
            Id = c.Id,
            TaskItemId = c.TaskItemId,
            AuthorId = c.AuthorId,
            AuthorDisplayName = authors.FirstOrDefault(a => a.Id == c.AuthorId)?.DisplayName ?? string.Empty,
            Content = c.Content,
            CreatedAt = c.CreatedAt
        }).ToList();
    }

    public async Task<CommentDto> AddAsync(Guid projectId, Guid taskId, CreateCommentRequest request)
    {
        await EnsureMemberAsync(projectId);
        await EnsureTaskExistsAsync(projectId, taskId);

        var comment = new Comment { TaskItemId = taskId, AuthorId = _currentUser.UserId, Content = request.Content };
        _db.Comments.Add(comment);
        await _db.SaveChangesAsync();

        var author = await _userManager.FindByIdAsync(comment.AuthorId.ToString());

        return new CommentDto
        {
            Id = comment.Id,
            TaskItemId = comment.TaskItemId,
            AuthorId = comment.AuthorId,
            AuthorDisplayName = author?.DisplayName ?? string.Empty,
            Content = comment.Content,
            CreatedAt = comment.CreatedAt
        };
    }

    public async Task DeleteAsync(Guid projectId, Guid taskId, Guid commentId)
    {
        await EnsureMemberAsync(projectId);
        await EnsureTaskExistsAsync(projectId, taskId);
        var comment = await _db.Comments.FirstOrDefaultAsync(c => c.Id == commentId && c.TaskItemId == taskId)
            ?? throw new NotFoundException("Yorum bulunamadı.");

        if (comment.AuthorId != _currentUser.UserId)
        {
            throw new ForbiddenException("Sadece kendi yorumunuzu silebilirsiniz.");
        }

        _db.Comments.Remove(comment);
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

    private async Task EnsureTaskExistsAsync(Guid projectId, Guid taskId)
    {
        var exists = await _db.TaskItems.AnyAsync(t => t.Id == taskId && t.ProjectId == projectId);
        if (!exists)
        {
            throw new NotFoundException("Görev bulunamadı.");
        }
    }
}
