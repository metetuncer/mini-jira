using MiniJira.Application.DTOs.Tasks;

namespace MiniJira.Application.Interfaces;

public interface ITaskService
{
    Task<List<TaskItemDto>> GetByProjectAsync(Guid projectId, TaskFilterQuery filter);
    Task<TaskItemDto> GetByIdAsync(Guid projectId, Guid taskId);
    Task<TaskItemDto> CreateAsync(Guid projectId, CreateTaskRequest request);
    Task<TaskItemDto> UpdateAsync(Guid projectId, Guid taskId, UpdateTaskRequest request);
    Task<TaskItemDto> MoveAsync(Guid projectId, Guid taskId, MoveTaskRequest request);
    Task DeleteAsync(Guid projectId, Guid taskId);
    Task SetLabelsAsync(Guid projectId, Guid taskId, List<Guid> labelIds);
}
