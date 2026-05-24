param(
  [string]$SourceRoot = (Resolve-Path ".").Path,
  [string]$WorkDir = ".tmp/fanxipan_repo_sync",
  [string]$RepoUrl = "https://github.com/duongonix/fanxipan_repo.git",
  [string]$Branch = "main",
  [string]$CommitMessage = "chore: sync fanxipan release workspace",
  [string]$Tag = "",
  [switch]$SyncVersionsFromTag,
  [switch]$NoPush,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Step([string]$text) {
  Write-Host "==> $text" -ForegroundColor Cyan
}

function Run([string]$command) {
  Write-Host "   $command" -ForegroundColor DarkGray
  if (-not $DryRun) {
    Invoke-Expression $command
    if ($LASTEXITCODE -ne 0) {
      throw "Command failed: $command"
    }
  }
}

function IsFanxipanPackageName([string]$name) {
  if ([string]::IsNullOrWhiteSpace($name)) { return $false }
  if ($name -eq "fanxipan") { return $true }
  if ($name -eq "vite-plugin-fanxipan") { return $true }
  if ($name -eq "create-fanxipan") { return $true }
  if ($name.StartsWith("@fanxipan/")) { return $true }
  return $false
}

function UpdateJsonFile([string]$path, [object]$obj) {
  $json = $obj | ConvertTo-Json -Depth 100
  [System.IO.File]::WriteAllText($path, ($json + "`n"), (New-Object System.Text.UTF8Encoding($false)))
}

function BumpFanxipanVersions([string]$repoRoot, [string]$version) {
  Step "Aligning Fanxipan package versions to $version"
  $pkgFiles = Get-ChildItem -LiteralPath $repoRoot -Recurse -Filter package.json -File |
    Where-Object { $_.FullName -notmatch "\\node_modules\\" }

  $fanxipanNames = New-Object System.Collections.Generic.HashSet[string]
  foreach ($file in $pkgFiles) {
    $obj = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
    if (IsFanxipanPackageName([string]$obj.name)) {
      $fanxipanNames.Add([string]$obj.name) | Out-Null
    }
  }

  foreach ($file in $pkgFiles) {
    $obj = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
    $changed = $false

    if (IsFanxipanPackageName([string]$obj.name)) {
      if ([string]$obj.version -ne $version) {
        $obj.version = $version
        $changed = $true
      }
    }

    foreach ($section in @("dependencies", "devDependencies", "peerDependencies", "optionalDependencies")) {
      if (-not ($obj.PSObject.Properties.Name -contains $section)) { continue }
      $depObj = $obj.$section
      if ($null -eq $depObj) { continue }
      foreach ($depName in @($depObj.PSObject.Properties.Name)) {
        if (-not $fanxipanNames.Contains($depName)) { continue }
        $currentSpec = [string]$depObj.$depName
        if ($currentSpec.StartsWith("workspace:")) {
          if ($currentSpec -ne "workspace:*") {
            $depObj.$depName = "workspace:*"
            $changed = $true
          }
        } else {
          if ($currentSpec -ne $version) {
            $depObj.$depName = $version
            $changed = $true
          }
        }
      }
    }

    if ($changed) {
      UpdateJsonFile -path $file.FullName -obj $obj
      Write-Host "   updated: $($file.FullName)" -ForegroundColor DarkGray
    }
  }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "git is not installed or not available in PATH."
}

if (-not (Get-Command robocopy -ErrorAction SilentlyContinue)) {
  throw "robocopy is not available on this machine."
}

$resolvedSource = (Resolve-Path $SourceRoot).Path
$resolvedWork = Join-Path $resolvedSource $WorkDir

# Avoid "detected dubious ownership" on Windows when workspace user context changes.
if (-not $DryRun) {
  try {
    & git config --global --add safe.directory $resolvedWork | Out-Null
  } catch {
    Write-Host "   warning: unable to update global git safe.directory; continuing" -ForegroundColor Yellow
  }
}

$includePaths = @(
  ".github",
  "crates",
  "packages",
  "scripts",
  "schemas",
  "docs",
  "tests",
  "example",
  "examples",
  "Cargo.toml",
  "Cargo.lock",
  "rust-toolchain.toml",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "README.md",
  "CHANGELOG.md",
  ".gitignore"
)

$excludeDirs = @(
  ".git",
  "node_modules",
  ".pnpm-store",
  "target",
  "dist",
  ".tmp",
  ".turbo",
  ".next",
  ".svelte-kit",
  "coverage"
)

$excludeFiles = @(
  "*.log",
  "*.tmp"
)

if (-not (Test-Path $resolvedWork)) {
  Step "Creating workspace $resolvedWork"
  if (-not $DryRun) {
    New-Item -ItemType Directory -Path $resolvedWork -Force | Out-Null
  }
}

if (-not (Test-Path (Join-Path $resolvedWork ".git"))) {
  Step "Initializing git workspace in .tmp"
  Run "git -C `"$resolvedWork`" init"
  Run "git -C `"$resolvedWork`" remote add origin `"$RepoUrl`""
} else {
  $originUrl = ""
  try { $originUrl = (git -C $resolvedWork remote get-url origin).Trim() } catch { $originUrl = "" }
  if ([string]::IsNullOrWhiteSpace($originUrl)) {
    Step "Configuring origin remote"
    Run "git -C `"$resolvedWork`" remote add origin `"$RepoUrl`""
  } elseif ($originUrl -ne $RepoUrl) {
    Step "Updating origin remote URL"
    Run "git -C `"$resolvedWork`" remote set-url origin `"$RepoUrl`""
  }
}

Step "Preparing clean tracked tree in .tmp workspace"
if (-not $DryRun) {
  Get-ChildItem -LiteralPath $resolvedWork -Force | Where-Object { $_.Name -ne ".git" } | Remove-Item -Recurse -Force
}

Step "Syncing selected paths to .tmp workspace"
foreach ($path in $includePaths) {
  $src = Join-Path $resolvedSource $path
  if (-not (Test-Path $src)) {
    Write-Host "   skip missing: $path" -ForegroundColor Yellow
    continue
  }
  $dst = Join-Path $resolvedWork $path
  $srcItem = Get-Item -LiteralPath $src

  if ($srcItem.PSIsContainer) {
    if (-not $DryRun) {
      New-Item -ItemType Directory -Path $dst -Force | Out-Null
    }
    $xd = ($excludeDirs | ForEach-Object { "`"$_`"" }) -join " "
    $xf = ($excludeFiles | ForEach-Object { "`"$_`"" }) -join " "
    $cmd = "robocopy `"$src`" `"$dst`" /E /R:2 /W:1 /NFL /NDL /NJH /NJS /NP /XD $xd /XF $xf"
    if ($DryRun) {
      Write-Host "   $cmd" -ForegroundColor DarkGray
    } else {
      cmd /c $cmd | Out-Null
      $rc = $LASTEXITCODE
      if ($rc -ge 8) {
        throw "robocopy failed for $path with exit code $rc"
      }
    }
  } else {
    if (-not $DryRun) {
      $parent = Split-Path -Parent $dst
      if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
      }
      Copy-Item -LiteralPath $src -Destination $dst -Force
    } else {
      Write-Host "   copy `"$src`" -> `"$dst`"" -ForegroundColor DarkGray
    }
  }
}

Step "Committing synced changes"
if (-not [string]::IsNullOrWhiteSpace($Tag)) {
  if ($Tag -notmatch "^fanxipan-v\d+\.\d+\.\d+([\-+].+)?$") {
    throw "Invalid tag format '$Tag'. Expected: fanxipan-v1.2.3 or fanxipan-v1.2.3-rc.1"
  }
}

  if ($SyncVersionsFromTag -or -not [string]::IsNullOrWhiteSpace($Tag)) {
  if ([string]::IsNullOrWhiteSpace($Tag)) {
    throw "SyncVersionsFromTag requires -Tag fanxipan-vX.Y.Z."
  }
  $releaseVersion = ($Tag -replace "^fanxipan-v", "")
  if (-not $DryRun) {
    BumpFanxipanVersions -repoRoot $resolvedWork -version $releaseVersion
    Step "Refreshing lockfile after version alignment"
    Run "pnpm -C `"$resolvedWork`" install --lockfile-only"
  } else {
    Write-Host "   dry-run: would align Fanxipan versions to $releaseVersion" -ForegroundColor Yellow
    Write-Host "   dry-run: would run pnpm install --lockfile-only" -ForegroundColor Yellow
  }
}

Run "git -C `"$resolvedWork`" checkout -B `"$Branch`""
Run "git -C `"$resolvedWork`" add -A"

if (-not $DryRun) {
  & git -C $resolvedWork diff --cached --quiet
  $hasChanges = ($LASTEXITCODE -ne 0)
  if ($hasChanges) {
    Run "git -C `"$resolvedWork`" commit -m `"$CommitMessage`""
  } else {
    Write-Host "   no staged changes; skip commit" -ForegroundColor Yellow
  }
} else {
  Write-Host "   dry-run: skip actual commit check/commit" -ForegroundColor Yellow
}

if (-not $NoPush) {
  Step "Pushing branch"
  Run "git -C `"$resolvedWork`" push -u origin `"$Branch`""
}

if (-not [string]::IsNullOrWhiteSpace($Tag)) {
  Step "Creating/updating tag $Tag"
  Run "git -C `"$resolvedWork`" tag -f `"$Tag`""
  if (-not $NoPush) {
    Step "Pushing tag $Tag"
    Run "git -C `"$resolvedWork`" push origin `"$Tag`" --force"
  }
}

Step "Done"
Write-Host "Workspace: $resolvedWork" -ForegroundColor Green
Write-Host "Branch   : $Branch" -ForegroundColor Green
if (-not [string]::IsNullOrWhiteSpace($Tag)) {
  Write-Host "Tag      : $Tag" -ForegroundColor Green
}
