import 'dart:convert';
import 'dart:io';

import 'package:dragon_eclipse_deck_builder/main.dart';
import 'package:dragon_eclipse_deck_builder/models.dart';
import 'package:dragon_eclipse_deck_builder/storage.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late Catalog catalog;
  late Directory tempDir;
  late LocalStore store;

  setUpAll(() {
    catalog = Catalog.fromJson(
      jsonDecode(File('data/catalog.json').readAsStringSync())
          as Map<String, dynamic>,
    );
    tempDir = Directory.systemTemp.createTempSync('deck_overview_test_');
    store = LocalStore(tempDir);
  });

  tearDownAll(() {
    try {
      if (tempDir.existsSync()) {
        tempDir.deleteSync(recursive: true);
      }
    } catch (_) {}
  });

  testWidgets('catalog status is complete and no partial warning card appears on Home', (
    tester,
  ) async {
    expect(catalog.status, 'complete');

    await tester.pumpWidget(
      MaterialApp(
        home: Home(catalog, store, settings: const AppSettings()),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.textContaining('Catalog is partial'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('editing deck name and pressing save works cleanly without error', (
    tester,
  ) async {
    final loadout = Loadout.create(LoadoutMode.campaign);
    loadout.name = 'Old Campaign Name';
    loadout.decks[0].mystlingId = 'alukah';
    loadout.decks[1].mystlingId = 'iceling';

    var saved = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Editor(catalog, loadout, () {
          saved = true;
        }),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Old Campaign Name'), findsOneWidget);
    // There is no duplicate per-deck rename row in the body
    expect(find.byTooltip('Rename deck'), findsOneWidget);

    // Tap rename button
    await tester.tap(find.byTooltip('Rename deck'));
    await tester.pumpAndSettle();

    // Verify dialog opened
    expect(find.byType(AlertDialog), findsOneWidget);
    final dialogTextField = find.descendant(
      of: find.byType(AlertDialog),
      matching: find.byType(TextField),
    );
    expect(dialogTextField, findsOneWidget);

    // Enter new name and tap Save
    await tester.enterText(dialogTextField, 'Glorious Duo');
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();

    // Ensure no error was thrown and dialog cleanly dismissed
    expect(tester.takeException(), isNull);
    expect(saved, isTrue);
    expect(loadout.name, 'Glorious Duo');
    expect(loadout.decks[0].name, 'Glorious Duo');
    expect(loadout.decks[1].name, 'Glorious Duo');
    expect(find.text('Glorious Duo'), findsOneWidget);
  });

  testWidgets('deck overview shows deck name only as title and does not repeat it in subtitle', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final item1 = Loadout.create(LoadoutMode.quickBattle);
    item1.name = 'Solo Flame';
    item1.decks.single.mystlingId = 'emberling';

    final item2 = Loadout.create(LoadoutMode.challenge);
    item2.name = 'Championship Trio';
    item2.decks[0].mystlingId = 'alukah';
    item2.decks[1].mystlingId = 'iceling';
    item2.decks[2].mystlingId = 'glarexus';

    await tester.pumpWidget(
      MaterialApp(
        home: Home(
          catalog,
          store,
          settings: const AppSettings(),
          initialItems: [item1, item2],
        ),
      ),
    );
    await tester.pump();

    // Verify no renderflex overflow occurred despite narrow width and warnings present
    expect(tester.takeException(), isNull);

    // Check item 1 (Quick Battle): deck name is only title
    expect(find.text('Solo Flame'), findsOneWidget);
    expect(find.text('Emberling'), findsOneWidget);
    expect(find.textContaining('Solo Flame (Emberling)'), findsNothing);

    // Check item 2 (Challenge): single deck name as title, subtitle has mystlings
    expect(find.text('Championship Trio'), findsOneWidget);
    expect(find.text('Alukah • Iceling • Glarexus'), findsOneWidget);
    expect(find.textContaining('Deck 1'), findsNothing);
  });

  testWidgets('editor choice chips display Mystling names and card counts for multiple decks', (
    tester,
  ) async {
    final loadout = Loadout.create(LoadoutMode.campaign);
    loadout.decks[0].mystlingId = 'alukah';
    loadout.decks[1].mystlingId = 'iceling';

    await tester.pumpWidget(
      MaterialApp(
        home: Editor(catalog, loadout, () {}),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.text('Alukah 0/16'), findsOneWidget);
    expect(find.text('Iceling 0/16'), findsOneWidget);
    expect(find.byType(ChoiceChip), findsNWidgets(2));
  });
}
