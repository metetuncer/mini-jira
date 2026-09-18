using MiniJira.Application.DTOs.Sprints;
namespace MiniJira.Application.Interfaces;
public interface ISprintService
{
    Task<List<SprintDto>> GetAllAsync(Guid projectId);
    Task<SprintDto> CreateAsync(Guid projectId, SprintRequest request);
    Task<SprintDto> UpdateAsync(Guid projectId, Guid sprintId, SprintRequest request);
    Task StartAsync(Guid projectId, Guid sprintId);
    Task CompleteAsync(Guid projectId, Guid sprintId);
    Task DeleteAsync(Guid projectId, Guid sprintId);
}
