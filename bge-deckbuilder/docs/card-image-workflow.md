# Card image enhancement workflow

This documents the process used for the Light Action cards and how to repeat it for another element. It separates visual cleanup from geometric normalization so each result can be checked before it replaces a catalog image.

## 1. Prepare individual card images

1. Start with the original scan for an element and use its crop script to create one upright image per distinct printed card. Remove duplicate appearances of the same card; a physical duplicate is still one catalog image.
2. Keep filenames tied to printed card IDs, for example `DE-CB-97-125.png`. Put the files under `images/<element>/cards/`.
3. Confirm every crop is upright, contains the full printed card, and is named for the correct ID before enhancement.

## 2. Improve color and readability

Use the built-in image editor once per distinct card. Before editing a local image, open it so it is visible to the image editor. Use the scan as the edit target and ask for a conservative restoration. The Light cards used this prompt pattern:

```text
Use case: precise-object-edit. Conservative restoration of the attached physical Dragon Eclipse card scan <CARD_ID>, <CARD_NAME>. ONLY straighten the photographed rectangular border and subtly improve print readability with natural saturation, gentle contrast, and restrained sharpening. Preserve the original illustration, icon shapes, typography, line breaks, wording, card number, and footer exactly. Do not repaint, reinterpret, redesign, replace text, or convert icons into words. If unclear, preserve the existing appearance. Title and rules text to protect: '<EXACT_TITLE>'; '<EXACT_RULES_TEXT>'. Faithful scan restoration, not new artwork.
```

Replace the placeholders with the printed title and a transcription from the card catalog. Keep icon descriptions in brackets as reminders; explicitly tell the editor to retain the printed symbols. Save the result as PNG under the same card ID. Review the entire image against the source scan, especially the rules text, numbers, small icons, and illustration. Reject or regenerate any image that changes printed information or recognizable art. The printed card and rulebook remain authoritative because image editors can reinterpret fine details even with strict prompts.

## 3. Remove the outside margin and normalize dimensions

The Light cards were normalized to **768×1068 pixels**. The script detects the card contour, crops to it, creates transparent rounded corners outside the card, and scales the result to the common canvas. It writes previews to a temporary directory and does not replace the catalog images automatically.

Run it from the repository root, changing the card directory, output directory, and expected count for each element:

```powershell
py -3 scripts/normalize_light_cards.py `
  --cards-dir images/fire/cards `
  --output-dir tmp/normalized_fire_cards `
  --expected-count 14
```

Examples of expected distinct card counts in the current catalog: Earth 14, Air/Wind 14, Water 14, Light 14, Fire 14, and Dark 13. The script expects PNG files named `DE-CB-*-125.png`. Use these options to check its input and choose a separate preview directory:

- `--cards-dir`: folder containing the enhanced PNG cards.
- `--output-dir`: destination for normalized previews.
- `--expected-count`: fail if the folder has a different number of matching cards.

Review the previews for clipped borders, retained white margins, distorted card proportions, or any damaged corners. The normalizer uses the largest region darker than a near-white threshold as the card boundary; it may need adjustment for scans with non-white backgrounds or shadows. Once approved, copy the preview PNGs over their same-named files in `images/<element>/cards/`.

## 4. Update and sync the catalog

1. Set each card's `imagePath` in `data/catalog.json` to its final PNG path, such as `images/fire/cards/DE-CB-55-125.png`.
2. Confirm the catalog has one entry per printed card ID and all referenced image files exist.
3. Run `py -3 scripts/sync_app_assets.py` from the repository root. It copies catalog-referenced images into `app/assets` and refreshes the bundled catalog.
4. Confirm the element's directory is listed under `assets:` in `app/pubspec.yaml` so Flutter bundles the images.

The Light cards now use only the enhanced, normalized PNGs in both `images/light/cards/` and `app/assets/images/light/cards/`. Earlier Light JPG crops were removed after review.
