$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$MinNodeMajor = 20

function Get-NodeMajor {
  try {
    $version = node -p "Number(process.versions.node.split('.')[0])" 2>$null
    return [int]$version
  } catch {
    return 0
  }
}

function Test-NodeReady {
  $node = Get-Command node -ErrorAction SilentlyContinue
  $npm = Get-Command npm -ErrorAction SilentlyContinue
  return $node -and $npm -and ((Get-NodeMajor) -ge $MinNodeMajor)
}

function Install-Node {
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) {
    throw "winget is required for automatic Node.js install. Install Node.js 20+ from https://nodejs.org/ and run npm run setup."
  }

  Write-Host "Installing Node.js LTS with winget..."
  winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
}

Write-Host "filefront-arena bootstrap"
Write-Host "project: $RootDir"

if (Test-NodeReady) {
  Write-Host "OK Node.js $(node -v)"
  Write-Host "OK npm $(npm -v)"
} else {
  Write-Host "Node.js 20+ and npm are required."
  Install-Node
}

if (-not (Test-NodeReady)) {
  throw "Node.js is still missing or older than 20. Restart PowerShell, or install Node.js 20+ manually, then run npm run setup."
}

Set-Location $RootDir
npm run setup
