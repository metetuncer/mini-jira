using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MiniJira.Application.Common;
using MiniJira.Application.DTOs.Projects;
using MiniJira.Application.Interfaces;
using MiniJira.Domain.Entities;
using MiniJira.Domain.Enums;
using MiniJira.Infrastructure.Identity;
using MiniJira.Infrastructure.Persistence;

namespace MiniJira.Infrastructure.Services;

public class ProjectService : IProjectService
{
    private readonly IBoardNotifier _notifier;
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly UserManager<ApplicationUser> _userManager;

    public ProjectService(AppDbContext db, ICurrentUserService currentUser, UserManager<ApplicationUser> userManager, IBoardNotifier notifier)
    {
        _notifier = notifier;
        _db = db;
        _currentUser = currentUser;
        _userManager = userManager;
    }

    public async Task<List<ProjectDto>> GetMyProjectsAsync()
    {
        var userId = _currentUser.UserId;

        var query =
            from p in _db.Projects
            join m in _db.ProjectMembers on p.Id equals m.ProjectId
            where m.UserId == userId
            select new ProjectDto
            {
                Id = p.Id,
                Name = p.Name,
                Description = p.Description,
                OwnerId = p.OwnerId,
                CreatedAt = p.CreatedAt,
                MyRole = m.Role
            };

        return await query.OrderByDescending(p => p.CreatedAt).ToListAsync();
    }

    public async Task<ProjectDto> GetByIdAsync(Guid projectId)
    {
        var (project, membership) = await GetProjectAndMembershipAsync(projectId);
        return ToDto(project, membership.Role);
    }

    public async Task<ProjectDto> CreateAsync(CreateProjectRequest request)
    {
        var userId = _currentUser.UserId;

        var project = new Project
        {
            Name = request.Name,
            Description = request.Description,
            OwnerId = userId
        };

        _db.Projects.Add(project);
        _db.ProjectMembers.Add(new ProjectMember
        {
            ProjectId = project.Id,
            UserId = userId,
            Role = ProjectRole.Admin
        });

        await _db.SaveChangesAsync();
        await _notifier.BoardChangedAsync(project.Id);
        return ToDto(project, ProjectRole.Admin);
    }

    public async Task<ProjectDto> UpdateAsync(Guid projectId, UpdateProjectRequest request)
    {
        var (project, membership) = await GetProjectAndMembershipAsync(projectId);
        EnsureAdmin(membership);

        project.Name = request.Name;
        project.Description = request.Description;
        await _db.SaveChangesAsync();
        await _notifier.BoardChangedAsync(projectId);

        return ToDto(project, membership.Role);
    }

    public async Task DeleteAsync(Guid projectId)
    {
        var (project, membership) = await GetProjectAndMembershipAsync(projectId);
        EnsureAdmin(membership);

        _db.Projects.Remove(project);
        await _db.SaveChangesAsync();
        await _notifier.BoardChangedAsync(projectId);
    }

    public async Task<List<ProjectMemberDto>> GetMembersAsync(Guid projectId)
    {
        await GetProjectAndMembershipAsync(projectId);

        var members = await _db.ProjectMembers.Where(m => m.ProjectId == projectId).ToListAsync();
        var userIds = members.Select(m => m.UserId).ToList();
        var users = await _userManager.Users.Where(u => userIds.Contains(u.Id)).ToListAsync();

        return members.Select(m =>
        {
            var user = users.FirstOrDefault(u => u.Id == m.UserId);
            return new ProjectMemberDto
            {
                Id = m.Id,
                UserId = m.UserId,
                Email = user?.Email ?? string.Empty,
                DisplayName = user?.DisplayName ?? string.Empty,
                Role = m.Role,
                JoinedAt = m.JoinedAt
            };
        }).ToList();
    }

    public async Task<ProjectMemberDto> AddMemberAsync(Guid projectId, AddProjectMemberRequest request)
    {
        var (_, membership) = await GetProjectAndMembershipAsync(projectId);
        EnsureAdmin(membership);

        var user = await _userManager.FindByEmailAsync(request.Email)
            ?? throw new NotFoundException("Bu e-posta ile kayıtlı kullanıcı bulunamadı.");

        var alreadyMember = await _db.ProjectMembers.AnyAsync(m => m.ProjectId == projectId && m.UserId == user.Id);
        if (alreadyMember)
        {
            throw new ValidationAppException("Kullanıcı zaten bu projenin üyesi.");
        }

        var newMember = new ProjectMember { ProjectId = projectId, UserId = user.Id, Role = request.Role };
        _db.ProjectMembers.Add(newMember);
        await _db.SaveChangesAsync();
        await _notifier.BoardChangedAsync(projectId);

        return new ProjectMemberDto
        {
            Id = newMember.Id,
            UserId = user.Id,
            Email = user.Email ?? string.Empty,
            DisplayName = user.DisplayName,
            Role = newMember.Role,
            JoinedAt = newMember.JoinedAt
        };
    }

    public async Task<ProjectMemberDto> UpdateMemberRoleAsync(Guid projectId, Guid memberId, UpdateMemberRoleRequest request)
    {
        var (project, membership) = await GetProjectAndMembershipAsync(projectId);
        EnsureAdmin(membership);

        var member = await _db.ProjectMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.ProjectId == projectId)
            ?? throw new NotFoundException("Proje üyesi bulunamadı.");

        if (member.UserId == project.OwnerId)
        {
            throw new ValidationAppException("Proje sahibinin rolü değiştirilemez.");
        }

        member.Role = request.Role;
        await _db.SaveChangesAsync();
        await _notifier.BoardChangedAsync(projectId);

        var user = await _userManager.FindByIdAsync(member.UserId.ToString());
        return new ProjectMemberDto
        {
            Id = member.Id,
            UserId = member.UserId,
            Email = user?.Email ?? string.Empty,
            DisplayName = user?.DisplayName ?? string.Empty,
            Role = member.Role,
            JoinedAt = member.JoinedAt
        };
    }

    public async Task RemoveMemberAsync(Guid projectId, Guid memberId)
    {
        var (project, membership) = await GetProjectAndMembershipAsync(projectId);
        EnsureAdmin(membership);

        var member = await _db.ProjectMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.ProjectId == projectId)
            ?? throw new NotFoundException("Proje üyesi bulunamadı.");

        if (member.UserId == project.OwnerId)
        {
            throw new ValidationAppException("Proje sahibi projeden çıkarılamaz.");
        }

        var assigned = await _db.TaskItems.Where(t => t.ProjectId == projectId && t.AssigneeId == member.UserId).ToListAsync();
        foreach (var task in assigned) { task.AssigneeId = null; task.UpdatedAt = DateTime.UtcNow; }
        _db.ProjectMembers.Remove(member);
        await _db.SaveChangesAsync();
        await _notifier.BoardChangedAsync(projectId);
    }

    // --- yardımcı metotlar ---

    private async Task<(Project Project, ProjectMember Membership)> GetProjectAndMembershipAsync(Guid projectId)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId)
            ?? throw new NotFoundException("Proje bulunamadı.");

        var membership = await _db.ProjectMembers.FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == _currentUser.UserId)
            ?? throw new ForbiddenException("Bu projeye erişim yetkiniz yok.");

        return (project, membership);
    }

    private static void EnsureAdmin(ProjectMember membership)
    {
        if (membership.Role != ProjectRole.Admin)
        {
            throw new ForbiddenException("Bu işlem için proje yöneticisi olmanız gerekir.");
        }
    }

    private static ProjectDto ToDto(Project project, ProjectRole myRole) => new()
    {
        Id = project.Id,
        Name = project.Name,
        Description = project.Description,
        OwnerId = project.OwnerId,
        CreatedAt = project.CreatedAt,
        MyRole = myRole
    };
}
