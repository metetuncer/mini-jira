namespace MiniJira.Application.Interfaces;

public interface IJwtTokenService
{
    string GenerateToken(Guid userId, string email, string displayName);
}
