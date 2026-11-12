# build-deck.ps1 - builds Loadout-how-it-works.pptx from deck-content.json and shots\
#
# Usage (PowerShell 5.1):
#   powershell -ExecutionPolicy Bypass -File build-deck.ps1 [-RenderDir <folder>]
#
# Drives the PowerPoint already installed on this PC through COM. Nothing is
# downloaded or installed. Every slide is laid out by coordinates on a blank
# 16:9 slide (960 x 540 points), text is Segoe UI, notes and alt text are
# written from the JSON, the deck is saved beside this script, and each slide
# is exported as a 1920 px PNG to -RenderDir. PowerPoint is closed in a finally
# block: if it was already running before the script started, only the
# presentation made here is closed and the running copy is left alone.
# ASCII only in this file.

param(
  [string]$RenderDir = ""
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$data = Get-Content -Raw -Path (Join-Path $here "deck-content.json") | ConvertFrom-Json
$out = Join-Path $here $data.file
$shots = Join-Path $here $data.shotsFolder
if ($RenderDir -eq "") { $RenderDir = Join-Path $here "render" }
Add-Type -AssemblyName System.Drawing

$timer = [System.Diagnostics.Stopwatch]::StartNew()
$before = @(Get-Process POWERPNT -ErrorAction SilentlyContinue)
$wasRunning = $before.Count -gt 0
Write-Output ("PowerPoint processes before: " + $before.Count)

# ---------- helpers ----------
function Rgb([string]$hex) {
  $r = [Convert]::ToInt32($hex.Substring(0, 2), 16)
  $g = [Convert]::ToInt32($hex.Substring(2, 2), 16)
  $b = [Convert]::ToInt32($hex.Substring(4, 2), 16)
  return $r + 256 * $g + 65536 * $b
}
function Col([string]$name) {
  $v = $data.colors.$name
  if ($v) { return $v } else { return $name }
}
$FONT = "Segoe UI"
$CHAR = Col "charcoal"
$SW = 960; $SH = 540; $M = 48
$TOP = 118; $BOTTOM = 512

function ImgSize([string]$path) {
  $img = [System.Drawing.Image]::FromFile($path)
  try { return @($img.Width, $img.Height) } finally { $img.Dispose() }
}

function Add-Text($slide, [string]$name, [double]$x, [double]$y, [double]$w, [double]$h, [string]$text, [double]$size, [string]$color, [bool]$bold, [int]$align) {
  $s = $slide.Shapes.AddTextbox(1, $x, $y, $w, $h)
  $s.Name = $name
  $tf = $s.TextFrame
  $tf.MarginLeft = 0; $tf.MarginRight = 0; $tf.MarginTop = 0; $tf.MarginBottom = 0
  $tf.WordWrap = -1
  $tf.AutoSize = 0
  $tr = $tf.TextRange
  $tr.Text = $text
  $tr.Font.Name = $FONT
  $tr.Font.Size = $size
  $tr.Font.Color.RGB = (Rgb $color)
  $tr.Font.Bold = $(if ($bold) { -1 } else { 0 })
  $tr.ParagraphFormat.Alignment = $align
  return $s
}

# "Label: text" lines, the label bold, one paragraph each
# one text box per line, evenly spaced down the column: the label bold on its
# own line, the sentence under it
function Add-Lines($slide, [double]$x, [double]$y, [double]$w, [double]$h, $lines, [double]$size, [string]$color) {
  $step = $h / $lines.Count
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $lab = $lines[$i][0]
    $s = Add-Text $slide ("Line " + $lab) $x ($y + $i * $step) $w ($step - 10) ($lab + "`r" + $lines[$i][1]) $size $color $false 1
    $s.TextFrame.TextRange.Paragraphs(1).Font.Bold = -1
  }
}

function Add-Box($slide, [string]$name, [double]$x, [double]$y, [double]$w, [double]$h, [string]$fill, [string]$line, [double]$adj) {
  $s = $slide.Shapes.AddShape(5, $x, $y, $w, $h)
  $s.Name = $name
  $s.Adjustments.Item(1) = $adj
  $s.Fill.Solid()
  $s.Fill.ForeColor.RGB = (Rgb $fill)
  if ($line -eq "") { $s.Line.Visible = 0 } else { $s.Line.Visible = -1; $s.Line.ForeColor.RGB = (Rgb $line); $s.Line.Weight = 1.5 }
  $s.Shadow.Visible = 0
  return $s
}

function Add-Pic($slide, [string]$file, [double]$x, [double]$y, [double]$w, [double]$h, [string]$alt) {
  $p = $slide.Shapes.AddPicture($file, 0, -1, $x, $y, $w, $h)
  $p.LockAspectRatio = -1
  $p.AlternativeText = $alt
  $p.Name = "Screenshot " + [System.IO.Path]::GetFileNameWithoutExtension($file)
  return $p
}

# a phone outline (rounded charcoal body) with the screenshot inside, height H
function Add-Phone($slide, [string]$file, [double]$x, [double]$y, [double]$H, [string]$alt, [string]$bezel) {
  $sz = ImgSize $file
  $bz = 7
  $sh = $H - 2 * $bz
  $swid = $sh * $sz[0] / $sz[1]
  $null = Add-Box $slide "Phone outline" $x $y ($swid + 2 * $bz) $H $bezel "" 0.07
  $null = Add-Pic $slide $file ($x + $bz) ($y + $bz) $swid $sh $alt
  return ($swid + 2 * $bz)
}
function PhoneWidth([string]$file, [double]$H) {
  $sz = ImgSize $file
  return ($H - 14) * $sz[0] / $sz[1] + 14
}

function Set-Notes($slide, [string]$text) {
  $ph = $slide.NotesPage.Shapes.Placeholders(2)
  $tr = $ph.TextFrame.TextRange
  $tr.Text = $text
  $tr.Font.Name = $FONT
}

function Add-Header($slide, $sd) {
  $band = $slide.Shapes.AddShape(1, $M, 28, ($SW - 2 * $M), 8)
  $band.Name = "Door color band"
  $band.Fill.Solid(); $band.Fill.ForeColor.RGB = (Rgb (Col $sd.band)); $band.Line.Visible = 0; $band.Shadow.Visible = 0
  $null = Add-Text $slide "Title" $M 46 ($SW - 2 * $M) 56 $sd.title 36 $CHAR $true 1
}

# the four places with the three moves between them, as native shapes
function Add-Places($slide, $places, $moves, [double]$y, [string]$fill, [string]$text, [string]$line) {
  $n = $places.Count; $gap = 100
  $bw = (($SW - 2 * $M) - ($n - 1) * $gap) / $n; $bh = 58
  $boxes = @()
  for ($i = 0; $i -lt $n; $i++) {
    $bx = $M + $i * ($bw + $gap)
    $b = Add-Box $slide ("Place " + $places[$i]) $bx $y $bw $bh $fill $line 0.15
    $tr = $b.TextFrame.TextRange
    $tr.Text = $places[$i]; $tr.Font.Name = $FONT; $tr.Font.Size = 26; $tr.Font.Bold = -1; $tr.Font.Color.RGB = (Rgb $text)
    $tr.ParagraphFormat.Alignment = 2
    $b.TextFrame.VerticalAnchor = 3
    $boxes += $b
  }
  for ($i = 0; $i -lt $n - 1; $i++) {
    $x1 = $M + ($i + 1) * $bw + $i * $gap
    $c = $slide.Shapes.AddConnector(1, $x1, $y + $bh / 2, $x1 + $gap, $y + $bh / 2)
    $c.ConnectorFormat.BeginConnect($boxes[$i], 4)
    $c.ConnectorFormat.EndConnect($boxes[$i + 1], 2)
    $c.Line.ForeColor.RGB = (Rgb $line); $c.Line.Weight = 2; $c.Line.EndArrowheadStyle = 2
    $c.Name = "Move " + $moves[$i]
    $null = Add-Text $slide ("Label " + $moves[$i]) ($x1 - 6) ($y - 4) ($gap + 12) 26 $moves[$i] 20 $text $true 2
  }
}

# ---------- build ----------
$app = $null; $pres = $null
# Every COM object below lives inside this function, so they all go out of
# scope (and can be collected) before PowerPoint is asked to quit.
function Build-Deck($app) {
  $pres = $app.Presentations.Add(0)
  try {
  $pres.PageSetup.SlideWidth = $SW
  $pres.PageSetup.SlideHeight = $SH
  # theme fonts to Segoe UI, so no Calibri is left in masters or notes
  foreach ($th in @($pres.SlideMaster.Theme, $pres.NotesMaster.Theme)) {
    try { $th.ThemeFontScheme.MajorFont.Item(1).Name = $FONT; $th.ThemeFontScheme.MinorFont.Item(1).Name = $FONT } catch { Write-Warning ("Theme font: " + $_.Exception.Message) }
  }

  $idx = 0
  foreach ($sd in $data.slides) {
    $idx++
    $slide = $pres.Slides.Add($idx, 12)
    $slide.FollowMasterBackground = 0
    $slide.Background.Fill.Solid()
    $dark = ($sd.kind -eq "title" -or $sd.kind -eq "closing")
    $slide.Background.Fill.ForeColor.RGB = $(if ($dark) { Rgb $CHAR } else { Rgb "FFFFFF" })
    $files = @(); foreach ($f in @($sd.shots)) { if ($f) { $files += (Join-Path $shots $f) } }
    foreach ($f in $files) { if (-not (Test-Path $f)) { throw "Missing screenshot: $f" } }

    switch ($sd.kind) {
      "title" {
        $null = Add-Text $slide "Company line 1" 64 52 400 28 $sd.company[0] 22 "FFFFFF" $true 1
        $null = Add-Text $slide "Company line 2" 64 80 400 28 $sd.company[1] 22 (Col "blue") $true 1
        $null = Add-Text $slide "Title" 64 170 520 90 $sd.title 66 "FFFFFF" $true 1
        $null = Add-Text $slide "Subtitle" 64 268 500 80 $sd.subtitle 28 (Col "light") $false 1
        $null = Add-Text $slide "Sample data" 64 452 500 28 $sd.small 20 (Col "light") $false 1
        $H = 440; $pw = PhoneWidth $files[0] $H
        $null = Add-Phone $slide $files[0] (896 - $pw) 50 $H $sd.alt[0] "3A414B"
      }
      "line" {
        Add-Header $slide $sd
        Add-Places $slide $sd.places $sd.moves 120 "F3F5F8" $CHAR $CHAR
        $sz = ImgSize $files[0]
        $h = $BOTTOM - 200; $w = $h * $sz[0] / $sz[1]
        $null = Add-Pic $slide $files[0] (($SW - $w) / 2) 200 $w $h $sd.alt[0]
      }
      "roles" {
        Add-Header $slide $sd
        $cw = (($SW - 2 * $M) - 24) / 2; $ch = 178
        for ($i = 0; $i -lt $sd.roles.Count; $i++) {
          $cx = $M + ($i % 2) * ($cw + 24); $cy = 126 + [Math]::Floor($i / 2) * ($ch + 22)
          $null = Add-Box $slide ("Card " + $sd.roles[$i][0]) $cx $cy $cw $ch "F3F5F8" "" 0.06
          $null = Add-Text $slide ("Role " + $sd.roles[$i][0]) ($cx + 24) ($cy + 22) ($cw - 48) 36 $sd.roles[$i][0] 26 $CHAR $true 1
          $null = Add-Text $slide ("Does " + $sd.roles[$i][0]) ($cx + 24) ($cy + 66) ($cw - 48) 96 $sd.roles[$i][1] 22 $CHAR $false 1
        }
      }
      "closing" {
        $null = Add-Text $slide "Title" $M 60 ($SW - 2 * $M) 64 $sd.title 44 "FFFFFF" $true 1
        Add-Places $slide $sd.places @("Pull", "Pick up", "Deliver") 160 $CHAR "FFFFFF" "FFFFFF"
        $y = 278
        foreach ($l in $sd.lines) {
          $null = Add-Text $slide ("Label " + $l[0]) $M $y ($SW - 2 * $M) 30 $l[0] 22 (Col "light") $false 1
          $null = Add-Text $slide ("Value " + $l[0]) $M ($y + 32) ($SW - 2 * $M) 40 $l[1] 30 "FFFFFF" $true 1
          $y += 100
        }
      }
      default {
        # "step" and "picture": text on the left, screenshots on the right
        Add-Header $slide $sd
        $sz0 = ImgSize $files[0]
        $desktop = ($files.Count -eq 1 -and $sz0[0] -gt $sz0[1] * 1.2)
        $phoneShot = ($sz0[1] -gt $sz0[0] * 1.5)
        if ($desktop) {
          $w = 560; $h = $w * $sz0[1] / $sz0[0]
          $px = $SW - $M - $w
          $p = Add-Pic $slide $files[0] $px ($TOP + 8) $w $h $sd.alt[0]
          $p.Line.Visible = -1; $p.Line.ForeColor.RGB = (Rgb (Col "light")); $p.Line.Weight = 1
          $textW = $px - $M - 32
        } elseif ($phoneShot) {
          $H = $BOTTOM - $TOP + 2; $gap = 18
          $tot = 0; foreach ($f in $files) { $tot += (PhoneWidth $f $H) }
          $tot += ($files.Count - 1) * $gap
          $px = $SW - $M - $tot
          $textW = [Math]::Min($px - $M - 32, 500)
          # a lone phone sits centered in the space the text leaves
          if ($files.Count -eq 1) { $px = $M + $textW + (($SW - $M) - ($M + $textW) - $tot) / 2 }
          $x = $px
          for ($i = 0; $i -lt $files.Count; $i++) { $x += (Add-Phone $slide $files[$i] $x $TOP $H $sd.alt[$i] $CHAR) + $gap }
        } else {
          $h = $BOTTOM - $TOP + 2; $w = $h * $sz0[0] / $sz0[1]
          $px = $SW - $M - $w
          $p = Add-Pic $slide $files[0] $px $TOP $w $h $sd.alt[0]
          $p.Line.Visible = -1; $p.Line.ForeColor.RGB = (Rgb (Col "light")); $p.Line.Weight = 1
          $textW = $px - $M - 32
        }
        $size = $(if ($textW -lt 300) { 20 } else { 22 })
        $null = Add-Lines $slide $M ($TOP + 14) $textW ($BOTTOM - $TOP - 14) $sd.lines $size $CHAR
      }
    }
    Set-Notes $slide $sd.notes
  }

  if (Test-Path $out) { Remove-Item $out -Force }
  $pres.SaveAs($out, 24)
  Write-Output ("Saved " + $out + " (" + [Math]::Round((Get-Item $out).Length / 1MB, 2) + " MB, " + $pres.Slides.Count + " slides)")
  if ((Get-Item $out).Length -gt 25MB) { Write-Warning "Deck is over 25 MB: downscale the phone shots to 1170 px wide." }

  New-Item -ItemType Directory -Force $RenderDir | Out-Null
  Get-ChildItem $RenderDir -Filter "slide-*.png" -ErrorAction SilentlyContinue | Remove-Item -Force
  for ($i = 1; $i -le $pres.Slides.Count; $i++) {
    $pres.Slides.Item($i).Export((Join-Path $RenderDir ("slide-{0:D2}.png" -f $i)), "PNG", 1920, 1080)
  }
  Write-Output ("Exported " + $pres.Slides.Count + " slide PNGs to " + $RenderDir)
  $fonts = @(); for ($i = 1; $i -le $pres.Fonts.Count; $i++) { $fonts += $pres.Fonts.Item($i).Name }
  Write-Output ("Fonts in the deck: " + ($fonts -join ", "))
  }
  finally {
    # close only the presentation made here
    try { $pres.Close() } catch {}
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($pres)
  }
}

$app = $null
try {
  $app = New-Object -ComObject PowerPoint.Application
  Build-Deck $app
}
finally {
  [GC]::Collect(); [GC]::WaitForPendingFinalizers(); [GC]::Collect(); [GC]::WaitForPendingFinalizers()
  if ($app -ne $null) {
    if (-not $wasRunning) { try { $app.Quit() } catch {} }
    while ([System.Runtime.InteropServices.Marshal]::ReleaseComObject($app) -gt 0) {}
    $app = $null
  }
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
  # wait up to 10 s for the copy this script started to exit
  $mine = { @(Get-Process POWERPNT -ErrorAction SilentlyContinue | Where-Object { $before.Id -notcontains $_.Id }) }
  for ($t = 0; $t -lt 20 -and (& $mine).Count -gt 0; $t++) { Start-Sleep -Milliseconds 500 }
  $after = @(Get-Process POWERPNT -ErrorAction SilentlyContinue)
  Write-Output ("PowerPoint processes after: " + $after.Count + " (started by this script and still running: " + (& $mine).Count + ")")
  $timer.Stop()
  Write-Output ("Build took " + [Math]::Round($timer.Elapsed.TotalSeconds, 1) + " s")
}
