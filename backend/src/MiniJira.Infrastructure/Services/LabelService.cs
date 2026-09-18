using Microsoft.EntityFrameworkCore;
using MiniJira.Application.Common;
using MiniJira.Application.DTOs.Labels;
using MiniJira.Application.Interfaces;
using MiniJira.Domain.Entities;
using MiniJira.Infrastructure.Persistence;

namespace MiniJira.Infrastructure.Services;

public class LabelService : ILabelService
{
    private readonly IBoardNotifier _notifier;
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public LabelService(AppDbContext db, ICurrentUserService currentUser, IBoardNotifier notifier)
    {
        _notifier = notifier;
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<List<LabelDto>> GetByProjectAsync(Guid projectId)
    {
        await EnsureMemberAsync(projectId);
        var labels = await _db.Labels.Where(l => l.ProjectId == projectId).OrderBy(l => l.Name).ToListAsync();
        return labels.Select(ToDto).ToList();
    }

    public async Task<LabelDto> CreateAsync(Guid projectId, CreateLabelRequest request)
    {
        await EnsureMemberAsync(projectId);

        var exists = await _db.Labels.AnyAsync(l => l.ProjectId == projectId && l.Name == request.Name);
        if (exists)
        {
            throw new ValidationAppException("Bu isimde bir etiket zaten var.");
        }

        var label = new Label { ProjectId = projectId, Name = request.Name, ColorHex = request.ColorHex };
        _db.Labels.Add(label);
        await _db.SaveChangesAsync();
        await _notifier.BoardChangedAsync(projectId);

        return ToDto(label);
    }

    public async Task DeleteAsync(Guid projectId, Guid labelId)
    {
        await EnsureMemberAsync(projectId);
        var label = await _db.Labels.FirstOrDefaultAsync(l => l.Id == labelId && l.ProjectId == projectId)
            ?? throw new NotFoundException("Etiket bulunamadı.");

        _db.Labels.Remove(label);
        await _db.SaveChangesAsync();
        await _notifier.BoardChangedAsync(projectId);
    }

    private async Task EnsureMemberAsync(Guid projectId)
    {
        var isMember = await _db.ProjectMembers.AnyAsync(m => m.ProjectId == projectId && m.UserId == _currentUser.UserId);
        if (!isMember)
        {
            throw new ForbiddenException("Bu projeye erişim yetkiniz yok.");
        }
    }

    private static LabelDto ToDto(Label label) => new()
    {
        Id = label.Id,
        ProjectId = label.ProjectId,
        Name = label.Name,
        ColorHex = label.ColorHex
    };
}
