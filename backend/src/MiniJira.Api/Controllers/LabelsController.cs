using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiniJira.Application.DTOs.Labels;
using MiniJira.Application.Interfaces;

namespace MiniJira.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/projects/{projectId:guid}/labels")]
public class LabelsController : ControllerBase
{
    private readonly ILabelService _labelService;

    public LabelsController(ILabelService labelService)
    {
        _labelService = labelService;
    }

    [HttpGet]
    public async Task<ActionResult<List<LabelDto>>> GetAll(Guid projectId) =>
        Ok(await _labelService.GetByProjectAsync(projectId));

    [HttpPost]
    public async Task<ActionResult<LabelDto>> Create(Guid projectId, CreateLabelRequest request) =>
        Ok(await _labelService.CreateAsync(projectId, request));

    [HttpDelete("{labelId:guid}")]
    public async Task<IActionResult> Delete(Guid projectId, Guid labelId)
    {
        await _labelService.DeleteAsync(projectId, labelId);
        return NoContent();
    }
}
