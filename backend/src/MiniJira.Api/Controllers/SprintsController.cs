using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiniJira.Application.DTOs.Sprints;
using MiniJira.Application.Interfaces;
namespace MiniJira.Api.Controllers;
[ApiController, Authorize, Route("api/projects/{projectId:guid}/sprints")]
public class SprintsController(ISprintService service) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> Get(Guid projectId) => Ok(await service.GetAllAsync(projectId));
    [HttpPost] public async Task<IActionResult> Create(Guid projectId, SprintRequest request) => Ok(await service.CreateAsync(projectId, request));
    [HttpPut("{id:guid}")] public async Task<IActionResult> Update(Guid projectId, Guid id, SprintRequest request) => Ok(await service.UpdateAsync(projectId, id, request));
    [HttpPost("{id:guid}/start")] public async Task<IActionResult> Start(Guid projectId, Guid id) { await service.StartAsync(projectId, id); return NoContent(); }
    [HttpPost("{id:guid}/complete")] public async Task<IActionResult> Complete(Guid projectId, Guid id) { await service.CompleteAsync(projectId, id); return NoContent(); }
    [HttpDelete("{id:guid}")] public async Task<IActionResult> Delete(Guid projectId, Guid id) { await service.DeleteAsync(projectId, id); return NoContent(); }
}
