using System.ComponentModel.DataAnnotations;
using MiniJira.Domain.Entities;
namespace MiniJira.Application.DTOs.Sprints;

public class SprintRequest
{
    [Required, MaxLength(100)] public string Name { get; set; } = string.Empty;
    [MaxLength(2000)] public string? Goal { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
}
public record SprintDto(Guid Id, Guid ProjectId, string Name, string? Goal,
    DateOnly StartDate, DateOnly EndDate, SprintStatus Status, DateTime? CompletedAt,
    int TaskCount, int DoneCount, int TotalPoints, int DonePoints);
