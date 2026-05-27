#!/usr/bin/env bash
# Télécharge les sources brutes pour build-deck.
# Idempotent : skip ce qui existe déjà.
set -euo pipefail

cd "$(dirname "$0")/../.."
mkdir -p data/raw
cd data/raw

dl() {
  local url="$1"; local out="$2"
  if [ -f "$out" ]; then
    echo "✓ $out déjà présent — skip"
  else
    echo "↓ $url → $out"
    curl -sL --fail -o "$out" "$url"
  fi
}

# BCCWJ short-unit-word frequency (NINJAL, mirroré par toasted-nutbread)
dl "https://github.com/toasted-nutbread/yomichan-bccwj-frequency-dictionary/releases/download/1.0.1/BCCWJ-SUW.zip" "BCCWJ-SUW.zip"
[ -d bccwj-suw ] || unzip -q -o BCCWJ-SUW.zip -d bccwj-suw

# JMdict (multilingual, ~22 MB compressed, ~120 MB raw)
dl "http://ftp.edrdg.org/pub/Nihongo/JMdict.gz" "JMdict.gz"
[ -f JMdict ] || gunzip -k JMdict.gz

# kanjidic2 (~1.5 MB compressed)
dl "http://ftp.edrdg.org/pub/Nihongo/kanjidic2.xml.gz" "kanjidic2.xml.gz"
[ -f kanjidic2.xml ] || gunzip -k kanjidic2.xml.gz

# Tatoeba (per-language, JP / FR sentences + cross-links)
dl "https://downloads.tatoeba.org/exports/per_language/jpn/jpn_sentences.tsv.bz2" "jpn_sentences.tsv.bz2"
[ -f jpn_sentences.tsv ] || bunzip2 -k jpn_sentences.tsv.bz2

dl "https://downloads.tatoeba.org/exports/per_language/fra/fra_sentences.tsv.bz2" "fra_sentences.tsv.bz2"
[ -f fra_sentences.tsv ] || bunzip2 -k fra_sentences.tsv.bz2

dl "https://downloads.tatoeba.org/exports/per_language/jpn/jpn-fra_links.tsv.bz2" "jpn-fra_links.tsv.bz2"
[ -f jpn-fra_links.tsv ] || bunzip2 -k jpn-fra_links.tsv.bz2

echo "✓ Sources prêtes dans data/raw/"
