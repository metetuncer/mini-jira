using MiniJira.Application.DTOs.Labels;

namespace MiniJira.Application.Interfaces;

public interface ILabelService
{
    Task<List<LabelDto>> GetByProjectAsync(Guid projectId);
    Task<LabelDto> CreateAsync(Guid projectId, CreateLabelRequest request);
    Task DeleteAsync(Guid projectId, Guid labelId);
}
