# Re-copy the LogMeIn client page from its source of truth in frank-umbrella/work.
# Run from anywhere — paths are absolute. Does NOT commit or push.
#
# Usage:
#   & "T:\ClaudeCodeRepo\devriz\sync-from-work.ps1"

$ErrorActionPreference = 'Stop'

$src = 'T:\ClaudeCodeRepo\work\logmein'
$dst = 'T:\ClaudeCodeRepo\devriz\lmi'

if (-not (Test-Path $src)) { throw "Source not found: $src" }
if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Path $dst | Out-Null }

# Only mirror the files that ship — skip .scripts (build tool for og-image, not served).
$files = @('index.html', 'favicon.svg', 'apple-touch-icon.png', 'og-image.png')
foreach ($f in $files) {
    $from = Join-Path $src $f
    if (Test-Path $from) {
        Copy-Item -Path $from -Destination (Join-Path $dst $f) -Force
        Write-Host "copied $f"
    } else {
        Write-Warning "missing in source: $f"
    }
}

Write-Host ""
Write-Host "Done. Review with:  git -C T:\ClaudeCodeRepo\devriz diff lmi/"
Write-Host "Push with:          git -C T:\ClaudeCodeRepo\devriz add lmi/ && git -C T:\ClaudeCodeRepo\devriz commit -m 'LMI: sync from work/logmein' && git -C T:\ClaudeCodeRepo\devriz push"
