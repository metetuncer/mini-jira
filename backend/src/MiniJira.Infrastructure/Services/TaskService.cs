using Microsoft.EntityFrameworkCore;
using MiniJira.Application.Common;
using MiniJira.Application.DTOs.Tasks;
using MiniJira.Application.Interfaces;
using MiniJira.Domain.Entities;
using MiniJira.Infrastructure.Persistence;

namespace MiniJira.Infrastructure.Services;

public class TaskService : ITaskService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IBoardNotifier _notifier;

    public TaskService(AppDbContext db, ICurrentUserService currentUser, IBoardNotifier notifier)
    {
        _db = db;
        _currentUser = currentUser;
        _notifier = notifier;
    }

    public async Task<List<TaskItemDto>> GetByProjectAsync(Guid projectId, TaskFilterQuery filter)
    {
        await EnsureMemberAsync(projectId);

        var query = _db.TaskItems.Include(t => t.TaskLabels).Where(t => t.ProjectId == projectId);

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim().ToLower();
            query = query.Where(t => t.Title.ToLower().Contains(term) || (t.Description != null && t.Description.ToLower().Contains(term)));
        }

        if (filter.Status.HasValue)
        {
            query = query.Where(t => t.Status == filter.Status.Value);
        }

        if (filter.AssigneeId.HasValue)
        {
            query = query.Where(t => t.AssigneeId == filter.AssigneeId.Value);
        }

        if (filter.LabelId.HasValue)
        {
            query = query.Where(t => t.TaskLabels.Any(tl => tl.LabelId == filter.LabelId.Value));
        }

        var tasks = await query.OrderBy(t => t.Status).ThenBy(t => t.Order).ToListAsync();
        return tasks.Select(ToDto).ToList();
    }

    public async Task<TaskItemDto> GetByIdAsync(Guid projectId, Guid taskId)
    {
        await EnsureMemberAsync(projectId);
        var task = await GetTaskAsync(projectId, taskId);
        return ToDto(task);
    }

    public async Task<TaskItemDto> CreateAsync(Guid projectId, CreateTaskRequest request)
    {
        await EnsureMemberAsync(projectId);

        await using var tx = await _db.Database.BeginTransactionAsync();
        await LockProject(projectId);
        await ValidatePlanning(projectId, request.AssigneeId, request.SprintId, request.Title);
        var maxOrder = await _db.TaskItems.Where(t => t.ProjectId == projectId && t.SprintId == request.SprintId && t.Status == Domain.Enums.MiniJiraTaskStatus.Todo)
            .Select(t => (int?)t.Order).MaxAsync() ?? -1;

        var task = new TaskItem
        {
            ProjectId = projectId,
            Title = request.Title.Trim(),
            Description = request.Description,
            Priority = request.Priority,
            AssigneeId = request.AssigneeId,
            SprintId = request.SprintId,
            IssueType = request.IssueType,
            StoryPoints = request.StoryPoints,
            DueDate = request.DueDate,
            CreatedById = _currentUser.UserId,
            Order = maxOrder + 1
        };

        _db.TaskItems.Add(task);
        await _db.SaveChangesAsync();

        var dto = ToDto(task);
        await tx.CommitAsync();
        await _notifier.TaskCreatedAsync(projectId, dto);
        return dto;
    }

    public async Task<TaskItemDto> UpdateAsync(Guid projectId, Guid taskId, UpdateTaskRequest request)
    {
        await EnsureMemberAsync(projectId);
        await using var tx = await _db.Database.BeginTransactionAsync();
        await LockProject(projectId);
        var task = await GetTaskAsync(projectId, taskId);

        await ValidatePlanning(projectId, request.AssigneeId, request.SprintId, request.Title, task.SprintId);
        task.Title = request.Title.Trim();
        if (task.SprintId != request.SprintId)
        {
            task.Order = (await _db.TaskItems.Where(t => t.ProjectId == projectId && t.SprintId == request.SprintId && t.Status == task.Status)
                .Select(t => (int?)t.Order).MaxAsync() ?? -1) + 1;
        }
        task.SprintId = request.SprintId; task.IssueType = request.IssueType;
        task.StoryPoints = request.StoryPoints; task.DueDate = request.DueDate;
        task.Description = request.Description;
        task.Priority = request.Priority;
        task.AssigneeId = request.AssigneeId;
        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var dto = ToDto(task);
        await tx.CommitAsync();
        await _notifier.TaskUpdatedAsync(projectId, dto);
        return dto;
    }

    public async Task<TaskItemDto> MoveAsync(Guid projectId, Guid taskId, MoveTaskRequest request)
    {
        await EnsureMemberAsync(projectId);
        await using var tx = await _db.Database.BeginTransactionAsync();
        await LockProject(projectId);
        var task = await GetTaskAsync(projectId, taskId);

        if (task.SprintId.HasValue && await _db.Sprints.AnyAsync(s => s.Id == task.SprintId && s.Status == SprintStatus.Completed))
            throw new ValidationAppException("Tamamlanan sprintin görev durumu değiştirilemez.");
        var previousStatus = task.Status;
        var target = await _db.TaskItems.Where(t => t.ProjectId == projectId && t.SprintId == task.SprintId && t.Status == request.Status && t.Id != taskId)
            .OrderBy(t => t.Order).ThenBy(t => t.CreatedAt).ToListAsync();
        target.Insert(Math.Clamp(request.Order, 0, target.Count), task);
        task.Status = request.Status;
        for (var i = 0; i < target.Count; i++) target[i].Order = i;
        if (previousStatus != request.Status)
        {
            var source = await _db.TaskItems.Where(t => t.ProjectId == projectId && t.SprintId == task.SprintId && t.Status == previousStatus && t.Id != taskId)
                .OrderBy(t => t.Order).ThenBy(t => t.CreatedAt).ToListAsync();
            for (var i = 0; i < source.Count; i++) source[i].Order = i;
        }
        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var dto = ToDto(task);
        await tx.CommitAsync();
        await _notifier.BoardChangedAsync(projectId);
        return dto;
    }

    public async Task DeleteAsync(Guid projectId, Guid taskId)
    {
        await EnsureMemberAsync(projectId);
        await using var tx = await _db.Database.BeginTransactionAsync();
        await LockProject(projectId);
        var task = await GetTaskAsync(projectId, taskId);

        _db.TaskItems.Remove(task);
        await _db.SaveChangesAsync();

        await tx.CommitAsync();
        await _notifier.TaskDeletedAsync(projectId, taskId);
    }

    public async Task SetLabelsAsync(Guid projectId, Guid taskId, List<Guid> labelIds)
    {
        await EnsureMemberAsync(projectId);
        var task = await _db.TaskItems.Include(t => t.TaskLabels)
            .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == projectId)
            ?? throw new NotFoundException("Görev bulunamadı.");

        var ids = labelIds.Distinct().ToList();
        if (await _db.Labels.CountAsync(l => l.ProjectId == projectId && ids.Contains(l.Id)) != ids.Count)
            throw new ValidationAppException("Etiketler bu projeye ait olmalıdır.");
        foreach (var link in task.TaskLabels.Where(l => !ids.Contains(l.LabelId)).ToList())
            task.TaskLabels.Remove(link);
        var existingIds = task.TaskLabels.Select(l => l.LabelId).ToHashSet();
        foreach (var labelId in ids.Where(id => !existingIds.Contains(id)))
            task.TaskLabels.Add(new TaskLabel { TaskItemId = taskId, LabelId = labelId });

        task.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _notifier.TaskUpdatedAsync(projectId, ToDto(task));
    }

    // --- yardımcı metotlar ---

    private async Task LockProject(Guid p) => await _db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM \"Projects\" WHERE \"Id\" = {p} FOR UPDATE");

    private async Task ValidatePlanning(Guid projectId, Guid? assignee, Guid? sprint, string title, Guid? previousSprint = null)
    {
        if (string.IsNullOrWhiteSpace(title)) throw new ValidationAppException("Başlık boş olamaz.");
        if (assignee.HasValue && !await _db.ProjectMembers.AnyAsync(m => m.ProjectId == projectId && m.UserId == assignee))
            throw new ValidationAppException("Görev yalnızca proje üyesine atanabilir.");
        if (previousSprint.HasValue && previousSprint != sprint && await _db.Sprints.AnyAsync(s => s.Id == previousSprint && s.Status == SprintStatus.Completed))
            throw new ValidationAppException("Tamamlanan sprintten görev taşınamaz.");
        if (sprint.HasValue)
        {
            var s = await _db.Sprints.FirstOrDefaultAsync(s => s.ProjectId == projectId && s.Id == sprint)
                ?? throw new ValidationAppException("Sprint bu projeye ait değil.");
            if (s.Status == SprintStatus.Completed && previousSprint != sprint)
                throw new ValidationAppException("Tamamlanan sprinte görev eklenemez.");
        }
    }

    private async Task EnsureMemberAsync(Guid projectId)
    {
        var isMember = await _db.ProjectMembers.AnyAsync(m => m.ProjectId == projectId && m.UserId == _currentUser.UserId);
        if (!isMember)
        {
            throw new ForbiddenException("Bu projeye erişim yetkiniz yok.");
        }
    }

    private async Task<TaskItem> GetTaskAsync(Guid projectId, Guid taskId)
    {
        return await _db.TaskItems.Include(t => t.TaskLabels)
            .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == projectId)
            ?? throw new NotFoundException("Görev bulunamadı.");
    }

    private static TaskItemDto ToDto(TaskItem task) => new()
    {
        Id = task.Id,
        ProjectId = task.ProjectId,
        Title = task.Title,
        Description = task.Description,
        Status = task.Status,
        Priority = task.Priority,
        Order = task.Order,
        AssigneeId = task.AssigneeId,
        SprintId = task.SprintId,
        IssueType = task.IssueType,
        StoryPoints = task.StoryPoints,
        DueDate = task.DueDate,
        CreatedById = task.CreatedById,
        CreatedAt = task.CreatedAt,
        UpdatedAt = task.UpdatedAt,
        LabelIds = task.TaskLabels.Select(tl => tl.LabelId).ToList()
    };
}
