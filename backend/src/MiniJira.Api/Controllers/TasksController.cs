using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiniJira.Application.DTOs.Tasks;
using MiniJira.Application.Interfaces;
using MiniJira.Domain.Enums;

namespace MiniJira.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/projects/{projectId:guid}/tasks")]
public class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;

    public TasksController(ITaskService taskService)
    {
        _taskService = taskService;
    }

    [HttpGet]
    public async Task<ActionResult<List<TaskItemDto>>> GetAll(
        Guid projectId,
        [FromQuery] string? search,
        [FromQuery] MiniJiraTaskStatus? status,
        [FromQuery] Guid? assigneeId,
        [FromQuery] Guid? labelId)
    {
        var filter = new TaskFilterQuery { Search = search, Status = status, AssigneeId = assigneeId, LabelId = labelId };
        return Ok(await _taskService.GetByProjectAsync(projectId, filter));
    }

    [HttpGet("{taskId:guid}")]
    public async Task<ActionResult<TaskItemDto>> GetById(Guid projectId, Guid taskId) =>
        Ok(await _taskService.GetByIdAsync(projectId, taskId));

    [HttpPost]
    public async Task<ActionResult<TaskItemDto>> Create(Guid projectId, CreateTaskRequest request)
    {
        var task = await _taskService.CreateAsync(projectId, request);
        return CreatedAtAction(nameof(GetById), new { projectId, taskId = task.Id }, task);
    }

    [HttpPut("{taskId:guid}")]
    public async Task<ActionResult<TaskItemDto>> Update(Guid projectId, Guid taskId, UpdateTaskRequest request) =>
        Ok(await _taskService.UpdateAsync(projectId, taskId, request));

    [HttpPatch("{taskId:guid}/move")]
    public async Task<ActionResult<TaskItemDto>> Move(Guid projectId, Guid taskId, MoveTaskRequest request) =>
        Ok(await _taskService.MoveAsync(projectId, taskId, request));

    [HttpPut("{taskId:guid}/labels")]
    public async Task<IActionResult> SetLabels(Guid projectId, Guid taskId, [FromBody] List<Guid> labelIds)
    {
        await _taskService.SetLabelsAsync(projectId, taskId, labelIds);
        return NoContent();
    }

    [HttpDelete("{taskId:guid}")]
    public async Task<IActionResult> Delete(Guid projectId, Guid taskId)
    {
        await _taskService.DeleteAsync(projectId, taskId);
        return NoContent();
    }
}
