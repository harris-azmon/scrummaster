$ErrorActionPreference = 'Stop'; # stop on all errors

$packageName= 'scrummaster'
$toolsDir   = "$(Split-Path -parent $MyInvocation.MyCommand.Definition)"
$url        = 'https://github.com/harris-azmon/conductor/archive/v0.1.0.zip' # download url
$url64      = $url # 64bit URL here or remove this variable if no 64bit version

$packageArgs = @{
  packageName   = $packageName
  unzipLocation = $toolsDir
  fileType      = 'zip'
  url           = $url
  url64bit      = $url64

  softwareName  = 'scrummaster*' #part or all of the Display Name as you see it in Programs and Features

  checksum      = ''
  checksumType  = 'sha256' #default is md5, can also be sha1, sha256 or sha512
  checksum64    = $checksum
  checksumType64= 'sha256'
}

Install-ChocolateyZipPackage @packageArgs

# Install mise if not present
$misepath = Get-Command mise -ErrorAction SilentlyContinue
if (!$misepath) {
    Write-Host "Installing mise..."
    Invoke-Expression (Invoke-RestMethod https://mise.run)
}

# Run mise install to set up the environment
$installDir = Join-Path $toolsDir "conductor-0.1.0"
Push-Location $installDir
try {
    mise install
    Write-Host "Running scrummaster setup..."
    python scripts/scrummaster_install.py --all
} finally {
    Pop-Location
}

Write-Host "Scrummaster has been installed. Run 'scrummaster:setup' to initialize your project."
