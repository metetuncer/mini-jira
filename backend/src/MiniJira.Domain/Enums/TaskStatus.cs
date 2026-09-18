namespace MiniJira.Domain.Enums;

// "TaskStatus" isim çakışmasını önlemek için MiniJiraTaskStatus kullanılıyor
// (System.Threading.Tasks.TaskStatus ile karışmaması için)
public enum MiniJiraTaskStatus
{
    Todo = 0,
    InProgress = 1,
    Done = 2
}
