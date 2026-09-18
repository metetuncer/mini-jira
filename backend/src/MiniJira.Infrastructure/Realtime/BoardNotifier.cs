using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MiniJira.Application.DTOs.Tasks;
using MiniJira.Application.Interfaces;
using MiniJira.Infrastructure.Persistence;

namespace MiniJira.Infrastructure.Realtime;

public class BoardNotifier(IHubContext<BoardHub> hubContext, AppDbContext db) : IBoardNotifier
{
    // Resolve current recipients for each event, excluding removed members even
    // when they still have an open connection from before their removal.
    private async Task SendAsync(Guid projectId, string eventName, object payload)
    {
        var userIds = await db.ProjectMembers.AsNoTracking()
            .Where(member => member.ProjectId == projectId)
            .Select(member => member.UserId).ToListAsync();
        var groups = userIds.Select(userId => BoardHub.GroupName(projectId, userId)).ToList();
        if (groups.Count > 0)
            await hubContext.Clients.Groups(groups).SendAsync(eventName, payload);
    }

    public Task BoardChangedAsync(Guid projectId) =>
        SendAsync(projectId, "boardChanged", projectId);

    public Task TaskCreatedAsync(Guid projectId, TaskItemDto task) =>
        SendAsync(projectId, "taskCreated", task);

    public Task TaskUpdatedAsync(Guid projectId, TaskItemDto task) =>
        SendAsync(projectId, "taskUpdated", task);

    public Task TaskMovedAsync(Guid projectId, TaskItemDto task) =>
        SendAsync(projectId, "taskMoved", task);

    public Task TaskDeletedAsync(Guid projectId, Guid taskId) =>
        SendAsync(projectId, "taskDeleted", taskId);
}
