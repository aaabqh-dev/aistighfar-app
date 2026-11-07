#!/usr/bin/env bash
# يجهّز صوت الإشعار: android/app/src/main/res/raw/astaghfar.wav
#
# الأولوية:
#   1) ملف تسجيل خاص منك في: sound/astaghfar.mp3 (أو .wav / .m4a)
#   2) توليد تلقائي بصوت عربي سعودي (Microsoft ar-SA-HamedNeural) عبر edge-tts
#   3) إن فشل الاثنان: يبقى الصوت الاحتياطي الموجود (نغمة هادئة)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/android/app/src/main/res/raw/astaghfar.wav"
VOICE="${TTS_VOICE:-ar-SA-HamedNeural}"
TEXT="${TTS_TEXT:-أَسْتَغْفِرُ اللّٰهَ}"
TMP="$(mktemp -d)"
mkdir -p "$(dirname "$OUT")"

normalize() {
  # mono 44.1kHz، حد أقصى 5 ثوانٍ، مستوى صوت موحّد
  # يقص الصمت من البداية والنهاية، ثم يضيف 0.25 ثانية في البداية وتلاشي خفيف في النهاية
  ffmpeg -y -loglevel error -i "$1" -vn \
    -af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,afade=t=in:d=0.08,areverse,adelay=250|250,loudnorm=I=-14:TP=-1.0:LRA=7,atrim=0:5" \
    -ac 1 -ar 44100 -sample_fmt s16 "$OUT"
}

for src in "$ROOT/sound/astaghfar.mp3" "$ROOT/sound/astaghfar.wav" "$ROOT/sound/astaghfar.m4a"; do
  if [ -f "$src" ]; then
    echo "استخدام التسجيل الخاص: $src"
    normalize "$src"
    exit 0
  fi
done

if command -v edge-tts >/dev/null 2>&1; then
  echo "توليد الصوت بـ $VOICE ..."
  if edge-tts --voice "$VOICE" --rate=-12% --text "$TEXT" --write-media "$TMP/tts.mp3"; then
    normalize "$TMP/tts.mp3"
    echo "تم توليد الصوت: $OUT"
    exit 0
  fi
  echo "تعذّر توليد الصوت، سيُستخدم الصوت الاحتياطي."
else
  echo "edge-tts غير مثبّت، سيُستخدم الصوت الاحتياطي."
fi

[ -f "$OUT" ] || { echo "لا يوجد صوت احتياطي!"; exit 1; }
