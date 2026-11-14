#!/bin/zsh
# Dither an image into a fixed palette as chunky pixel art (Browserbase look).
# Designs can also dither at runtime (kit/Dithered.tsx); this bakes a file.
#
#   tools/dither.sh in.png out.png [cell=10] [cols=288] [#hex ...]
#   DOTS=1 tools/dither.sh ...   # also draw each pixel as a dot on a faint grid
#
# 1. smooth into flat areas (Kuwahara filter) so it reads as posterised art,
#    not photo noise; 2. shrink to `cols` px wide and remap to the palette with
#    a Riemersma (Hilbert-curve) dither; 3. scale up `cell`x with
#    nearest-neighbour so every pixel is a crisp block.
set -e
in=$1; out=$2; cell=${3:-10}; cols=${4:-288}
shift $(( $# < 4 ? $# : 4 ))
pal=("$@")
(( ${#pal} )) || pal=("#c7cfec" "#4aa3f0" "#141414" "#ef5a24" "#d6e04e" "#4fc26b" "#fbf3cf" "#ffffff")
tmp=$(mktemp -d)
swatches=(); for c in $pal; do swatches+=("xc:$c"); done
magick -size 1x1 $swatches +append "$tmp/pal.png"
magick "$in" -resize "$((cols * 2))x" -kuwahara 3 -resize "${cols}x" -modulate 100,140 \
  -dither Riemersma -remap "$tmp/pal.png" -filter point -resize "$((cell * 100))%" "$tmp/big.png"
if [[ -n $DOTS ]]; then
  # a cell-sized tile: transparent dot, faint white corners
  magick -size ${cell}x${cell} xc:"rgba(255,255,255,0.45)" -fill black -draw "circle $((cell/2.0-0.5)),$((cell/2.0-0.5)) $((cell/2.0-0.5)),$((cell*0.06))" \
    -alpha set -channel A -fx "r>0.5?0.45:0" +channel -fill white -colorize 100 "$tmp/dot.png"
  magick "$tmp/big.png" \( -size $(magick identify -format %wx%h "$tmp/big.png") tile:"$tmp/dot.png" \) -composite "$out"
else
  cp "$tmp/big.png" "$out"
fi
rm -rf "$tmp"
echo "$out"
