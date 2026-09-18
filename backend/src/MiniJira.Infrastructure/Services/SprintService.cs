using Microsoft.EntityFrameworkCore;
using MiniJira.Application.Common;
using MiniJira.Application.DTOs.Sprints;
using MiniJira.Application.Interfaces;
using MiniJira.Domain.Entities;
using MiniJira.Domain.Enums;
using MiniJira.Infrastructure.Persistence;
namespace MiniJira.Infrastructure.Services;

public class SprintService(AppDbContext db, ICurrentUserService user, IBoardNotifier notifier) : ISprintService
{
    private async Task EnsureAccessAsync(Guid projectId, bool admin = false)
    {
        var member = await db.ProjectMembers.FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == user.UserId);
        if (member == null || (admin && member.Role != ProjectRole.Admin))
            throw new ForbiddenException(admin ? "Sprint yönetimi için yönetici olmalısınız." : "Projeye erişim yetkiniz yok.");
    }
    private static void ValidateRequest(SprintRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.StartDate == default || request.EndDate < request.StartDate)
            throw new ValidationAppException("Sprint adı ve geçerli bir tarih aralığı zorunludur.");
    }
    private async Task<Sprint> GetSprintAsync(Guid projectId, Guid sprintId) => await db.Sprints.Include(candidate => candidate.Tasks)
        .FirstOrDefaultAsync(candidate => candidate.ProjectId == projectId && candidate.Id == sprintId) ?? throw new NotFoundException("Sprint bulunamadı.");
    private static SprintDto Map(Sprint sprint) => new(sprint.Id, sprint.ProjectId, sprint.Name, sprint.Goal, sprint.StartDate, sprint.EndDate,
        sprint.Status, sprint.CompletedAt, sprint.Tasks.Count, sprint.Tasks.Count(task => task.Status == MiniJiraTaskStatus.Done),
        sprint.Tasks.Sum(task => task.StoryPoints ?? 0), sprint.Tasks.Where(task => task.Status == MiniJiraTaskStatus.Done).Sum(task => task.StoryPoints ?? 0));
    // Project row lock serializes planning changes and protects start/complete against task moves.
    private async Task LockProjectAsync(Guid projectId) => await db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM \"Projects\" WHERE \"Id\" = {projectId} FOR UPDATE");
    public async Task<List<SprintDto>> GetAllAsync(Guid projectId)
    {
        await EnsureAccessAsync(projectId);
        return (await db.Sprints.Include(sprint => sprint.Tasks).Where(sprint => sprint.ProjectId == projectId).OrderBy(sprint => sprint.StartDate).ToListAsync()).Select(Map).ToList();
    }
    public async Task<SprintDto> CreateAsync(Guid projectId, SprintRequest request)
    {
        await EnsureAccessAsync(projectId, true);
        ValidateRequest(request);
        var sprint = new Sprint { ProjectId = projectId, Name = request.Name.Trim(), Goal = request.Goal, StartDate = request.StartDate, EndDate = request.EndDate };
        db.Sprints.Add(sprint);
        await db.SaveChangesAsync();
        await notifier.BoardChangedAsync(projectId);
        return Map(sprint);
    }
    public async Task<SprintDto> UpdateAsync(Guid projectId, Guid sprintId, SprintRequest request)
    {
        await EnsureAccessAsync(projectId, true);
        ValidateRequest(request);
        await using var tx = await db.Database.BeginTransactionAsync();
        await LockProjectAsync(projectId);
        var sprint = await GetSprintAsync(projectId, sprintId);
        if (sprint.Status == SprintStatus.Completed) throw new ValidationAppException("Tamamlanan sprint düzenlenemez.");
        sprint.Name = request.Name.Trim();
        sprint.Goal = request.Goal;
        sprint.StartDate = request.StartDate;
        sprint.EndDate = request.EndDate;
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        await notifier.BoardChangedAsync(projectId);
        return Map(sprint);
    }
    public async Task StartAsync(Guid projectId, Guid sprintId)
    {
        await EnsureAccessAsync(projectId, true);
        await using var tx = await db.Database.BeginTransactionAsync();
        await LockProjectAsync(projectId);
        var sprint = await GetSprintAsync(projectId, sprintId);
        if (sprint.Status != SprintStatus.Planned) throw new ValidationAppException("Yalnızca planlanan sprint başlatılabilir.");
        if (await db.Sprints.AnyAsync(candidate => candidate.ProjectId == projectId && candidate.Status == SprintStatus.Active))
            throw new ValidationAppException("Önce aktif sprinti tamamlayın.");
        if (sprint.Tasks.Count == 0) throw new ValidationAppException("Sprinti başlatmadan önce görev ekleyin.");
        sprint.Status = SprintStatus.Active;
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        await notifier.BoardChangedAsync(projectId);
    }
    public async Task CompleteAsync(Guid projectId, Guid sprintId)
    {
        await EnsureAccessAsync(projectId, true);
        await using var tx = await db.Database.BeginTransactionAsync();
        await LockProjectAsync(projectId);
        var sprint = await GetSprintAsync(projectId, sprintId);
        if (sprint.Status != SprintStatus.Active) throw new ValidationAppException("Yalnızca aktif sprint tamamlanabilir.");
        // Unfinished work returns to backlog with its current workflow status preserved.
        await ReturnToBacklogAsync(projectId, sprint.Tasks.Where(task => task.Status != MiniJiraTaskStatus.Done).ToList());
        sprint.Status = SprintStatus.Completed;
        sprint.CompletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        await notifier.BoardChangedAsync(projectId);
    }
    private async Task ReturnToBacklogAsync(Guid projectId, List<TaskItem> tasks)
    {
        foreach (var group in tasks.GroupBy(task => task.Status))
        {
            var next = (await db.TaskItems.Where(task => task.ProjectId == projectId && task.SprintId == null && task.Status == group.Key)
                .Select(task => (int?)task.Order).MaxAsync() ?? -1) + 1;
            foreach (var task in group.OrderBy(task => task.Order))
            {
                task.SprintId = null;
                task.Order = next++;
                task.UpdatedAt = DateTime.UtcNow;
            }
        }
    }
    public async Task DeleteAsync(Guid projectId, Guid sprintId)
    {
        await EnsureAccessAsync(projectId, true);
        await using var tx = await db.Database.BeginTransactionAsync();
        await LockProjectAsync(projectId);
        var sprint = await GetSprintAsync(projectId, sprintId);
        if (sprint.Status != SprintStatus.Planned) throw new ValidationAppException("Yalnızca planlanan sprint silinebilir.");
        await ReturnToBacklogAsync(projectId, sprint.Tasks.ToList());
        db.Sprints.Remove(sprint);
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        await notifier.BoardChangedAsync(projectId);
    }
}
