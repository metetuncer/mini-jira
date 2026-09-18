using System.ComponentModel.DataAnnotations;
using MiniJira.Domain.Enums;

namespace MiniJira.Application.DTOs.Projects;

public class ProjectDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid OwnerId { get; set; }
    public DateTime CreatedAt { get; set; }
    public ProjectRole MyRole { get; set; }
}

public class CreateProjectRequest
{
    [Required, MinLength(2), MaxLength(120)]
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class UpdateProjectRequest
{
    [Required, MinLength(2), MaxLength(120)]
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class ProjectMemberDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public ProjectRole Role { get; set; }
    public DateTime JoinedAt { get; set; }
}

public class AddProjectMemberRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
    public ProjectRole Role { get; set; } = ProjectRole.Member;
}

public class UpdateMemberRoleRequest
{
    public ProjectRole Role { get; set; }
}
