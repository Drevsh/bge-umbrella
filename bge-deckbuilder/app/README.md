# Dragon Eclipse deck builder

Offline Flutter app for building Campaign pairs, PvP Quick Battle decks, and PvP Challenge lineups from the bundled partial catalog.

Run `flutter pub get`, then `flutter run` with an Android device or emulator. Use `flutter analyze` and `flutter test` to check changes. Before running after catalog updates, execute `py -3 ../scripts/sync_app_assets.py` from this directory.

Loadouts save automatically in the app documents directory. Use the Import / export screen to copy JSON to the clipboard, write an export file in that directory, or paste JSON for a previewed merge. Rule warnings are advisory. See the repository [README](../README.md) for deck rules and catalog status.

The deck editor and catalog show cards in an image grid. In the editor, search normally offers only Action cards eligible for the selected Mystling. **Other Mystlings** separately reveals all Mystling-specific cards, while **Experimental Mode** reveals all catalog cards and allows unrestricted additions. Both switches reset when the editor closes. The **Selected** switch shows cards already in the deck, even if they are outside the current eligibility filter. In normal mode, Add is disabled at deck, subtype, Legendary, and physical-copy limits; rule warnings still describe any existing invalid choices.

## UI styling

The app uses a bright, adventurous tamer theme: warm parchment surfaces, teal as the main action color, gold for highlights, and distinct colors for the six elements. Keep the scanned card art as the visual focus. Use element color to help identify a card, while keeping names, controls, and status text readable without relying on color alone.

The shared Material styling lives in `lib/main.dart` in the `ThemeData` passed to `MaterialApp`. Update that theme for app-wide changes to surfaces, app bars, form fields, chips, and text. `lib/card_grid.dart` owns the card tile presentation and its element accent colors. Keep these sources aligned when changing the palette so the app chrome and card grid feel like one interface.

Transparent element icons live in `assets/element_icons/` and are used in the element filter menus. They are based on the bonus-action reference cards and cleaned into two-color icons: one solid element-colored circle and one ivory symbol, with no medallion border or texture.

When changing the UI, watch for these constraints:

- Check narrow phone widths and larger text settings. The card grid uses two columns on narrow screens; avoid fixed widths or controls that force it to overflow.
- Preserve the card art's portrait ratio and use `BoxFit.contain` so scanned borders and printed details are not cropped.
- Keep the `Valid cards only`, `Other Mystlings`, `Experimental Mode`, and `Selected` controls distinct. Other Mystlings and Experimental Mode are separate eligibility settings, and Selected is a view filter.
- Element colors are accents, not the only labels. Keep element names visible and maintain contrast for text, disabled controls, warnings, and selected states.
- Prefer compact labels and decoration. The card scans already contain detailed artwork and printed iconography, so extra ornamental icons and dense badges compete with the content.
- Use the app theme instead of adding one-off colors or shapes to individual screens. If a component needs an element-specific accent, use the mapping in `card_grid.dart`.

After a UI change, run `dart format lib/main.dart lib/card_grid.dart`, `flutter analyze`, and `flutter test` from `app/`. Check the editor on an actual narrow phone or emulator as well as a wide window; a layout that fits desktop can still overflow or make the controls too small on mobile.
