using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using MiniJira.Infrastructure.Persistence;

namespace MiniJira.Infrastructure.Realtime;

[Authorize]
public class BoardHub(AppDbContext db) : Hub
{
    public static string GroupName(Guid projectId, Guid userId) => $"project-{projectId}-user-{userId}";

    private Guid UserId => Guid.TryParse(Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? Context.User?.FindFirstValue("sub"), out var id) ? id : Guid.Empty;

    private async Task EnsureMemberAsync(Guid projectId)
    {
        if (UserId == Guid.Empty || !await db.ProjectMembers.AsNoTracking()
            .AnyAsync(member => member.ProjectId == projectId && member.UserId == UserId))
            throw new HubException("Bu projeye erişim yetkiniz yok.");
    }

    public override async Task OnConnectedAsync()
    {
        var projectId = Context.GetHttpContext()?.Request.Query["projectId"].ToString();
        try
        {
            if (!Guid.TryParse(projectId, out var id))
                throw new HubException("Geçerli bir proje seçmelisiniz.");
            await JoinProject(id);
            await base.OnConnectedAsync();
        }
        catch
        {
            Context.Abort();
            throw;
        }
    }

    public async Task JoinProject(Guid projectId)
    {
        await EnsureMemberAsync(projectId);
        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(projectId, UserId));
    }

    public async Task LeaveProject(Guid projectId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupName(projectId, UserId));
    }
}
