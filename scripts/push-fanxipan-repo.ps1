param(
  [string]$SourceRoot = (Resolve-Path ".").Path,
  [string]$TargetRepoUrl = "https://github.com/duongonix/fanxipan.git",
  [string]$Branch = "main",
  [string]$CommitMessage = "chore: bootstrap fanxipan release-ready repository",
  [string]$WorkDir = ".tmp/fanxipan_repo_sync"
)

$ErrorActionPreference = "Stop"

function Write-Step($text) {
  Write-Host "==> $text" -ForegroundColor Cyan
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "git is not installed or not available in PATH."
}

$resolvedSource = (Resolve-Path $SourceRoot).Path
$resolvedWork = Join-Path $resolvedSource $WorkDir

Write-Step "Preparing temp workspace at $resolvedWork"
if (Test-Path $resolvedWork) {
  Remove-Item -LiteralPath $resolvedWork -Recurse -Force
}
New-Item -ItemType Directory -Path $resolvedWork | Out-Null

# Keep only files/folders needed for CI, build, test, and release workflows.
$includes = @(
  ".github",
  "crates",
  "packages",
  "example",
  "examples",
  "scripts",
  "schemas",
  "docs",
  "tests",
  "Cargo.toml",
  "Cargo.lock",
  "rust-toolchain.toml",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "README.md",
  "CHANGELOG.md",
  "ROADMAP_90.md",
  ".gitignore"
)

$excludes = @(
  "node_modules",
  ".pnpm-store",
  "target",
  "dist",
  ".tmp",
  ".git"
)

function Copy-TreeFiltered($src, $dst, $excludeNames) {
  if (-not (Test-Path $dst)) {
    New-Item -ItemType Directory -Path $dst -Force | Out-Null
  }
  Get-ChildItem -LiteralPath $src -Force | ForEach-Object {
    if ($excludeNames -contains $_.Name) {
      return
    }
    $targetPath = Join-Path $dst $_.Name
    if ($_.PSIsContainer) {
      Copy-TreeFiltered -src $_.FullName -dst $targetPath -excludeNames $excludeNames
    } else {
      Copy-Item -LiteralPath $_.FullName -Destination $targetPath -Force
    }
  }
}

Write-Step "Copying required project files"
foreach ($item in $includes) {
  $src = Join-Path $resolvedSource $item
  if (-not (Test-Path $src)) {
    Write-Host "Skipping missing path: $item" -ForegroundColor Yellow
    continue
  }
  $dst = Join-Path $resolvedWork $item
  if ((Get-Item $src).PSIsContainer) {
    Copy-TreeFiltered -src $src -dst $dst -excludeNames $excludes
  } else {
    $parent = Split-Path -Parent $dst
    if (-not (Test-Path $parent)) {
      New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    Copy-Item -LiteralPath $src -Destination $dst -Force
  }
}

Set-Location $resolvedWork

Write-Step "Initializing git repository"
git init | Out-Null
git checkout -B $Branch | Out-Null
git add .
if (-not (git diff --cached --quiet)) {
  git commit -m $CommitMessage | Out-Null
} else {
  Write-Host "No changes staged. Nothing to commit." -ForegroundColor Yellow
}

Write-Step "Configuring remote and pushing to $TargetRepoUrl"
if ((git remote) -contains "origin") {
  git remote remove origin
}
git remote add origin $TargetRepoUrl
git push -u origin $Branch --force

Write-Step "Done. Repository pushed successfully."
Write-Host "Temporary synced repository: $resolvedWork" -ForegroundColor Green
