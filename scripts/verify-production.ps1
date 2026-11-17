#requires -Version 7
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateRange(1, [long]::MaxValue)]
    [long]$RunId,

    [Parameter(Mandatory)]
    [ValidatePattern('^[0-9a-f]{40}$')]
    [string]$Sha,

    [Parameter(Mandatory)]
    [ValidatePattern('^\d+\.\d+\.\d+$')]
    [string]$Version,

    [ValidateRange(1, 60)]
    [int]$TimeoutMinutes = 20
)

$ErrorActionPreference = 'Stop'
$repository = 'SergeSokolan/songkit'
$deadline = [DateTime]::UtcNow.AddMinutes($TimeoutMinutes)
$previousStatus = ''

do {
    $response = gh run view $RunId --repo $repository --json headSha,headBranch,event,workflowName,status,conclusion,jobs,url
    if ($LASTEXITCODE -ne 0) { throw "Could not read GitHub Actions run $RunId." }
    $run = $response | ConvertFrom-Json
    if ($run.headSha -ne $Sha -or $run.headBranch -ne 'main' -or
        $run.event -ne 'push' -or $run.workflowName -ne 'Verify SongKit') {
        throw "Run $RunId does not match Verify SongKit on main push for $Sha."
    }
    if ($run.status -ne $previousStatus) {
        Write-Host "GitHub Actions: $($run.status) $($run.url)"
        $previousStatus = $run.status
    }
    if ($run.status -eq 'completed') { break }
    if ([DateTime]::UtcNow -ge $deadline) { throw "Timed out waiting for run $RunId." }
    Start-Sleep -Seconds 15
} while ($true)

foreach ($job in @('verify', 'deploy')) {
    $result = $run.jobs | Where-Object name -EQ $job
    if ($result.conclusion -ne 'success') {
        throw "Required job '$job' concluded '$($result.conclusion)'. See $($run.url)."
    }
}
if ($run.conclusion -ne 'success') { throw "Run $RunId concluded '$($run.conclusion)'." }

Write-Host "Verified and deployed commit $Sha."
node (Join-Path $PSScriptRoot 'smoke-production.mjs') $Version
if ($LASTEXITCODE -ne 0) { throw "Production smoke check failed for v$Version." }
