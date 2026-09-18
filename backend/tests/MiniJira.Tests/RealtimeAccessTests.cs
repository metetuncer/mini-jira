using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Http.Connections.Features;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MiniJira.Domain.Entities;
using MiniJira.Infrastructure.Persistence;
using MiniJira.Infrastructure.Realtime;
using Moq;
using Xunit;

namespace MiniJira.Tests;

public class RealtimeAccessTests
{
    private static AppDbContext Database() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static Mock<HubCallerContext> Caller(Guid userId, Guid projectId)
    {
        var http = new DefaultHttpContext();
        http.Request.QueryString = new QueryString($"?projectId={projectId}");
        var feature = new Mock<IHttpContextFeature>();
        feature.SetupGet(value => value.HttpContext).Returns(http);
        var features = new FeatureCollection();
        features.Set(feature.Object);
        var caller = new Mock<HubCallerContext>();
        caller.SetupGet(value => value.ConnectionId).Returns("test-connection");
        caller.SetupGet(value => value.Features).Returns(features);
        caller.SetupGet(value => value.User).Returns(new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, userId.ToString())], "test")));
        return caller;
    }

    [Fact]
    public async Task Connection_and_join_reject_non_members()
    {
        await using var db = Database();
        var projectId = Guid.NewGuid();
        var caller = Caller(Guid.NewGuid(), projectId);
        var groups = new Mock<IGroupManager>();
        var hub = new BoardHub(db) { Context = caller.Object, Groups = groups.Object };

        await Assert.ThrowsAsync<HubException>(() => hub.OnConnectedAsync());
        caller.Verify(context => context.Abort(), Times.Once);
        await Assert.ThrowsAsync<HubException>(() => hub.JoinProject(projectId));
        groups.Verify(group => group.AddToGroupAsync(It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Member_joins_only_their_project_user_group()
    {
        await using var db = Database();
        var projectId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        db.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = userId });
        await db.SaveChangesAsync();
        var groups = new Mock<IGroupManager>();
        groups.Setup(group => group.AddToGroupAsync(It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        var hub = new BoardHub(db) { Context = Caller(userId, projectId).Object, Groups = groups.Object };

        await hub.OnConnectedAsync();
        groups.Verify(group => group.AddToGroupAsync("test-connection",
            BoardHub.GroupName(projectId, userId), It.IsAny<CancellationToken>()), Times.Once);
        await Assert.ThrowsAsync<HubException>(() => hub.JoinProject(Guid.NewGuid()));
    }

    [Fact]
    public async Task Broadcast_excludes_removed_members_and_other_projects()
    {
        await using var db = Database();
        var projectId = Guid.NewGuid();
        var owner = new ProjectMember { ProjectId = projectId, UserId = Guid.NewGuid() };
        var member = new ProjectMember { ProjectId = projectId, UserId = Guid.NewGuid() };
        db.ProjectMembers.AddRange(owner, member,
            new ProjectMember { ProjectId = Guid.NewGuid(), UserId = Guid.NewGuid() });
        await db.SaveChangesAsync();

        var recipients = new List<string[]>();
        var proxy = new Mock<IClientProxy>();
        proxy.Setup(client => client.SendCoreAsync(It.IsAny<string>(), It.IsAny<object?[]>(),
            It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        var clients = new Mock<IHubClients>();
        clients.Setup(client => client.Groups(It.IsAny<IReadOnlyList<string>>()))
            .Callback<IReadOnlyList<string>>(groups => recipients.Add(groups.ToArray()))
            .Returns(proxy.Object);
        var context = new Mock<IHubContext<BoardHub>>();
        context.SetupGet(value => value.Clients).Returns(clients.Object);
        var notifier = new BoardNotifier(context.Object, db);

        await notifier.BoardChangedAsync(projectId);
        Assert.Equal(2, recipients[0].Length);
        Assert.Contains(BoardHub.GroupName(projectId, member.UserId), recipients[0]);

        db.ProjectMembers.Remove(member);
        await db.SaveChangesAsync();
        await notifier.BoardChangedAsync(projectId);
        Assert.Equal([BoardHub.GroupName(projectId, owner.UserId)], recipients[1]);
    }
}
