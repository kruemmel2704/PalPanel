using PalPanel.Server.Hubs;
using PalPanel.Server.Models;
using PalPanel.Server.Services;

var builder = WebApplication.CreateBuilder(args);

// Bind Configuration
var palConfig = new PalPanelConfig();
builder.Configuration.GetSection("PalPanelConfig").Bind(palConfig);
builder.Services.AddSingleton(palConfig);

// Register Services
builder.Services.AddHttpClient<IPalworldRestService, PalworldRestService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(5);
});
builder.Services.AddSingleton<IPalworldRconService, PalworldRconService>();
builder.Services.AddScoped<IPalworldServerService, LinuxServerProcessService>();
builder.Services.AddSingleton<IBackupManagerService, BackupManagerService>();

// Register Background Monitor
builder.Services.AddHostedService<ServerMonitorWorker>();

// Add Controllers & SignalR
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS for React development
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");

// Serve Static React Frontend in Production
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseRouting();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ServerHub>("/hubs/server");

// SPA Fallback
app.MapFallbackToFile("index.html");

app.Run();
