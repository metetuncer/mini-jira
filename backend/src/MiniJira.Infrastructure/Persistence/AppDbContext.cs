using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using MiniJira.Domain.Entities;
using MiniJira.Infrastructure.Identity;

namespace MiniJira.Infrastructure.Persistence;

public class AppDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Sprint> Sprints => Set<Sprint>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
    public DbSet<TaskItem> TaskItems => Set<TaskItem>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Label> Labels => Set<Label>();
    public DbSet<TaskLabel> TaskLabels => Set<TaskLabel>();
    public DbSet<Attachment> Attachments => Set<Attachment>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Project>(e =>
        {
            e.HasIndex(p => p.OwnerId);
            e.HasMany(p => p.Members).WithOne(m => m.Project).HasForeignKey(m => m.ProjectId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(p => p.Tasks).WithOne(t => t.Project).HasForeignKey(t => t.ProjectId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(p => p.Labels).WithOne(l => l.Project).HasForeignKey(l => l.ProjectId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<ProjectMember>(e =>
        {
            e.HasIndex(m => new { m.ProjectId, m.UserId }).IsUnique();
        });

        builder.Entity<Sprint>(e =>
        {
            e.Property(s => s.Name).HasMaxLength(100);
            e.HasOne(s => s.Project).WithMany().HasForeignKey(s => s.ProjectId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(s => s.ProjectId).IsUnique().HasFilter("\"Status\" = 1");
            e.HasMany(s => s.Tasks).WithOne(t => t.Sprint).HasForeignKey(t => t.SprintId).OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<TaskItem>(e =>
        {
            e.HasIndex(t => new { t.ProjectId, t.Status });
            e.HasMany(t => t.Comments).WithOne(c => c.TaskItem).HasForeignKey(c => c.TaskItemId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(t => t.Attachments).WithOne(a => a.TaskItem).HasForeignKey(a => a.TaskItemId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<TaskLabel>(e =>
        {
            e.HasKey(tl => new { tl.TaskItemId, tl.LabelId });
            e.HasOne(tl => tl.TaskItem).WithMany(t => t.TaskLabels).HasForeignKey(tl => tl.TaskItemId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(tl => tl.Label).WithMany(l => l.TaskLabels).HasForeignKey(tl => tl.LabelId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Label>(e =>
        {
            e.HasIndex(l => new { l.ProjectId, l.Name }).IsUnique();
        });
    }
}
