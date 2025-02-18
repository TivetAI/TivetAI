#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Create bin directory for Tivet
$BinDir = $env:BIN_DIR
$TivetInstall = if ($BinDir) {
	$BinDir
} else {
	"${Home}\.tivet\bin"
}

if (!(Test-Path $TivetInstall)) {
	New-Item $TivetInstall -ItemType Directory | Out-Null
}

$TivetExe = "$TivetInstall\tivet.exe"
$Version = '__VERSION__'
$FileName = 'tivet-x86-windows.exe'

Write-Host
Write-Host "> Installing Tivet CLI ${Version}"

# Download CLI
$DownloadUrl = "https://releases.tivet.gg/tivet/${Version}/${FileName}"
Write-Host
Write-Host "> Downloading ${DownloadUrl}"
Invoke-WebRequest $DownloadUrl -OutFile $TivetExe -UseBasicParsing

# Install CLI
Write-Host
Write-Host "> Installing tivet"
$User = [System.EnvironmentVariableTarget]::User
$Path = [System.Environment]::GetEnvironmentVariable('Path', $User)
if (!(";${Path};".ToLower() -like "*;${TivetInstall};*".ToLower())) {
	[System.Environment]::SetEnvironmentVariable('Path', "${Path};${TivetInstall}", $User)
	$Env:Path += ";${TivetInstall}"
    Write-Host "Please restart your PowerShell session or run the following command to refresh the environment variables:"
    Write-Host "[System.Environment]::SetEnvironmentVariable('Path', '${Path};${TivetInstall}', [System.EnvironmentVariableTarget]::Process)"
}

Write-Host
Write-Host "> Checking installation"
tivet.exe --version

Write-Host
Write-Host "Tivet was installed successfully to ${TivetExe}."
Write-Host "Run 'tivet --help' to get started."
Write-Host
