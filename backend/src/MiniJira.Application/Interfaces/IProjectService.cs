using MiniJira.Application.DTOs.Projects;

namespace MiniJira.Application.Interfaces;

public interface IProjectService
{
    Task<List<ProjectDto>> GetMyProjectsAsync();
    Task<ProjectDto> GetByIdAsync(Guid projectId);
    Task<ProjectDto> CreateAsync(CreateProjectRequest request);
    Task<ProjectDto> UpdateAsync(Guid projectId, UpdateProjectRequest request);
    Task DeleteAsync(Guid projectId);

    Task<List<ProjectMemberDto>> GetMembersAsync(Guid projectId);
    Task<ProjectMemberDto> AddMemberAsync(Guid projectId, AddProjectMemberRequest request);
    Task<ProjectMemberDto> UpdateMemberRoleAsync(Guid projectId, Guid memberId, UpdateMemberRoleRequest request);
    Task RemoveMemberAsync(Guid projectId, Guid memberId);
}
