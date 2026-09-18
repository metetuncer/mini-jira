using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiniJira.Application.DTOs.Projects;
using MiniJira.Application.Interfaces;

namespace MiniJira.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/projects")]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _projectService;

    public ProjectsController(IProjectService projectService)
    {
        _projectService = projectService;
    }

    [HttpGet]
    public async Task<ActionResult<List<ProjectDto>>> GetMyProjects() =>
        Ok(await _projectService.GetMyProjectsAsync());

    [HttpGet("{projectId:guid}")]
    public async Task<ActionResult<ProjectDto>> GetById(Guid projectId) =>
        Ok(await _projectService.GetByIdAsync(projectId));

    [HttpPost]
    public async Task<ActionResult<ProjectDto>> Create(CreateProjectRequest request)
    {
        var project = await _projectService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { projectId = project.Id }, project);
    }

    [HttpPut("{projectId:guid}")]
    public async Task<ActionResult<ProjectDto>> Update(Guid projectId, UpdateProjectRequest request) =>
        Ok(await _projectService.UpdateAsync(projectId, request));

    [HttpDelete("{projectId:guid}")]
    public async Task<IActionResult> Delete(Guid projectId)
    {
        await _projectService.DeleteAsync(projectId);
        return NoContent();
    }

    [HttpGet("{projectId:guid}/members")]
    public async Task<ActionResult<List<ProjectMemberDto>>> GetMembers(Guid projectId) =>
        Ok(await _projectService.GetMembersAsync(projectId));

    [HttpPost("{projectId:guid}/members")]
    public async Task<ActionResult<ProjectMemberDto>> AddMember(Guid projectId, AddProjectMemberRequest request) =>
        Ok(await _projectService.AddMemberAsync(projectId, request));

    [HttpPut("{projectId:guid}/members/{memberId:guid}")]
    public async Task<ActionResult<ProjectMemberDto>> UpdateMemberRole(Guid projectId, Guid memberId, UpdateMemberRoleRequest request) =>
        Ok(await _projectService.UpdateMemberRoleAsync(projectId, memberId, request));

    [HttpDelete("{projectId:guid}/members/{memberId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid projectId, Guid memberId)
    {
        await _projectService.RemoveMemberAsync(projectId, memberId);
        return NoContent();
    }
}
