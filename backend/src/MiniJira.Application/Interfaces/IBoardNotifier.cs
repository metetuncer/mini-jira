using MiniJira.Application.DTOs.Tasks;

namespace MiniJira.Application.Interfaces;

// Application katmanının SignalR'a doğrudan bağımlı olmaması için soyutlama.
// Gerçek implementasyon (SignalR Hub Context) Infrastructure/Api katmanında yer alır.
public interface IBoardNotifier
{
    Task BoardChangedAsync(Guid projectId);
    Task TaskCreatedAsync(Guid projectId, TaskItemDto task);
    Task TaskUpdatedAsync(Guid projectId, TaskItemDto task);
    Task TaskMovedAsync(Guid projectId, TaskItemDto task);
    Task TaskDeletedAsync(Guid projectId, Guid taskId);
}
