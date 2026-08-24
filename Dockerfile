# ----------------------------------------------------
# Stage 1: Build React Frontend
# ----------------------------------------------------
FROM node:20-bookworm-slim AS build-frontend
WORKDIR /client

# Copy package files first for layer caching
COPY src/PalPanel.Client/package*.json ./
RUN npm install

# Copy frontend source code (node_modules is excluded by .dockerignore)
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
COPY --from=build-frontend /client/dist ./wwwroot

# Ensure backups directory exists
RUN mkdir -p /app/backups

ENV ASPNETCORE_URLS=http://0.0.0.0:5000
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 5000

ENTRYPOINT ["dotnet", "PalPanel.Server.dll"]
