# ----------------------------------------------------
# Stage 1: Build React Frontend
# ----------------------------------------------------
FROM node:20-alpine AS build-frontend
WORKDIR /client

COPY src/PalPanel.Client/package*.json ./
RUN npm ci --prefer-offline --no-audit

COPY src/PalPanel.Client/ ./
RUN npm run build

# ----------------------------------------------------
# Stage 2: Build .NET 8 Backend
# ----------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build-backend
WORKDIR /src

COPY src/PalPanel.Server/PalPanel.Server.csproj ./PalPanel.Server/
RUN dotnet restore ./PalPanel.Server/PalPanel.Server.csproj

COPY src/PalPanel.Server/ ./PalPanel.Server/
RUN dotnet publish ./PalPanel.Server/PalPanel.Server.csproj -c Release -o /app/publish /p:UseAppHost=false

# ----------------------------------------------------
# Stage 3: Runtime Container
# ----------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Install bash, procps and curl for Linux monitoring
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    procps \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build-backend /app/publish .
COPY --from=build-frontend /PalPanel.Server/wwwroot ./wwwroot

# Ensure backups directory exists
RUN mkdir -p /app/backups

ENV ASPNETCORE_URLS=http://0.0.0.0:5000
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 5000

ENTRYPOINT ["dotnet", "PalPanel.Server.dll"]
