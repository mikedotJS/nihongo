# Build-deck — génération du deck vocabulaire

Pipeline qui produit `src/data/deck.generated.json` (top 1000 BCCWJ avec sens
français, exemples Tatoeba, décomposition kanji).

## Sources

- **[BCCWJ-SUW](https://github.com/toasted-nutbread/yomichan-bccwj-frequency-dictionary/releases)** — fréquence officielle NINJAL (short unit words)
- **[JMdict](https://www.edrdg.org/jmdict/edict_doc.html)** — dictionnaire JP multilingue (FR pour ~15k entrées)
- **[kanjidic2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project)** — info kanji avec sens FR partiels
- **[Tatoeba](https://tatoeba.org/en/downloads)** — paires de phrases JP↔FR

## Usage

```bash
# 1. Télécharger les sources brutes (~30 MB compressé, ~200 MB décompressé).
./scripts/build-deck/download.sh

# 2. Lancer le pipeline.
node scripts/build-deck/index.mjs --top 1000

# Le résultat est écrit dans src/data/deck.generated.json.
```

## Personnalisation

- `--top N` : nombre de mots de contenu cibles (défaut 1000). Le scanner
  inspecte `N × 5` entrées BCCWJ pour filtrer les particules/grammar et
  garder N mots de contenu.
- `--out path` : chemin de sortie alternatif.

## Stats typiques (top 1000)

- ~96 % avec traduction française (JMdict)
- ~98 % avec exemple Tatoeba
- ~16 % des kanji ont un sens français (kanjidic2) ; le reste retombe sur EN

## Limites connues

- Pas de furigana sur les phrases d'exemple (le texte brut suffit en v1).
- Mots multi-kanji (ex. 時間) émettent un seul segment ruby au lieu d'un par
  kanji — la décomposition par kanji apparaît quand même dans le champ
  `kanjis` du verso.
- ぢ et づ partagent les romaji `ji` et `zu` avec じ et ず — voulu, c'est la
  réalité du japonais.
