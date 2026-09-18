using Microsoft.AspNetCore.Identity;
using MiniJira.Application.Common;
using MiniJira.Application.DTOs.Auth;
using MiniJira.Application.Interfaces;
using MiniJira.Infrastructure.Identity;

namespace MiniJira.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthService(UserManager<ApplicationUser> userManager, IJwtTokenService jwtTokenService)
    {
        _userManager = userManager;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing is not null)
        {
            throw new ValidationAppException("Bu e-posta adresi zaten kayıtlı.");
        }

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = request.Email,
            Email = request.Email,
            DisplayName = request.DisplayName
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var errors = string.Join(" ", result.Errors.Select(e => e.Description));
            throw new ValidationAppException(errors);
        }

        return BuildResponse(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null || !await _userManager.CheckPasswordAsync(user, request.Password))
        {
            throw new ValidationAppException("E-posta veya şifre hatalı.");
        }

        return BuildResponse(user);
    }

    private AuthResponse BuildResponse(ApplicationUser user)
    {
        var token = _jwtTokenService.GenerateToken(user.Id, user.Email!, user.DisplayName);
        return new AuthResponse
        {
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddMinutes(120),
            User = new UserDto { Id = user.Id, Email = user.Email!, DisplayName = user.DisplayName }
        };
    }
}
