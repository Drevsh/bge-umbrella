import 'dart:convert';
import 'dart:io';

import 'package:dragon_eclipse_deck_builder/card_grid.dart';
import 'package:dragon_eclipse_deck_builder/main.dart';
import 'package:dragon_eclipse_deck_builder/models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('editor shows the image grid and independent browse modes', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final catalog = Catalog.fromJson(
      jsonDecode(File('data/catalog.json').readAsStringSync())
          as Map<String, dynamic>,
    );
    final loadout = Loadout.create(LoadoutMode.quickBattle);
    loadout.decks.single.mystlingId = 'eldrithia';
    await tester.pumpWidget(MaterialApp(home: Editor(catalog, loadout, () {})));

    expect(find.byType(SliverGrid), findsOneWidget);
    expect(find.text('Other Mystlings'), findsOneWidget);
    expect(find.text('Experimental Mode'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.ensureVisible(find.text('Experimental Mode'));
    await tester.tap(find.text('Experimental Mode'));
    await tester.pump();
    expect(
      find.text('All cards are available; rule warnings still apply.'),
      findsOneWidget,
    );
    await tester.drag(find.byType(CustomScrollView), const Offset(0, -500));
    await tester.pump();
    expect(find.byType(CardGridTile), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('catalog card grid fits phone and wide layouts', (tester) async {
    final catalog = Catalog.fromJson(
      jsonDecode(File('data/catalog.json').readAsStringSync())
          as Map<String, dynamic>,
    );
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    for (final width in [390.0, 900.0]) {
      tester.view.physicalSize = Size(width, 844);
      await tester.pumpWidget(MaterialApp(home: CatalogView(catalog)));
      await tester.pump();
      expect(find.byType(SliverGrid), findsOneWidget);
      expect(tester.takeException(), isNull);
    }
  });

  testWidgets(
    'editor bonus actions only shows main element bonus action and special abilities',
    (tester) async {
      final catalog = Catalog.fromJson(
        jsonDecode(File('data/catalog.json').readAsStringSync())
            as Map<String, dynamic>,
      );
      final loadout = Loadout.create(LoadoutMode.quickBattle);
      loadout.decks.single.mystlingId = 'eldrithia';

      await tester.pumpWidget(MaterialApp(home: Editor(catalog, loadout, () {})));
      await tester.pump();

      // Tap the bonus actions (bolt) icon
      await tester.tap(find.byIcon(Icons.bolt));
      await tester.pumpAndSettle();

      // Dialog title
      expect(find.text('Eldrithia bonus actions & abilities'), findsOneWidget);

      // Shared actions are present
      expect(find.textContaining('Dash • 1 Power'), findsOneWidget);
      expect(find.textContaining('Prepare • 1 Power'), findsOneWidget);

      // Light elemental bonus action is present
      expect(find.text('Light bonus action'), findsOneWidget);
      expect(find.textContaining('Exchange • 1 Power'), findsOneWidget);

      // Eldrithia special abilities are present
      expect(find.text('Special ability (50A)'), findsOneWidget);
      expect(find.textContaining('Seek Equilibrium • 2 Power'), findsOneWidget);
      expect(find.textContaining('Contrast • 5 Power'), findsOneWidget);

      // Other elemental bonus actions are NOT present
      expect(find.textContaining('Accelerate'), findsNothing);
      expect(find.textContaining('Foresight'), findsNothing);
      expect(find.textContaining('Unity'), findsNothing);
      expect(find.textContaining('Fury'), findsNothing);
      expect(find.textContaining('Flow'), findsNothing);
    },
  );

  testWidgets('editor displays warnings inline and shows details in popover', (
    tester,
  ) async {
    final catalog = Catalog.fromJson(
      jsonDecode(File('data/catalog.json').readAsStringSync())
          as Map<String, dynamic>,
    );
    final loadout = Loadout.create(LoadoutMode.quickBattle);
    loadout.decks.single.mystlingId = 'eldrithia';

    await tester.pumpWidget(MaterialApp(home: Editor(catalog, loadout, () {})));
    await tester.pump();

    // 0/16 cards with rule warnings (e.g. 0/16 cards warning)
    expect(find.textContaining('rule warnings'), findsNothing);
    expect(find.byType(PopupMenuButton<void>), findsOneWidget);

    // Tap the popover anchor
    await tester.tap(find.byType(PopupMenuButton<void>));
    await tester.pumpAndSettle();

    // Verify warning messages appear inside the popup menu
    expect(find.textContaining('16 cards'), findsWidgets);
  });

  testWidgets('editor remove all cards button clears deck after confirmation', (
    tester,
  ) async {
    final catalog = Catalog.fromJson(
      jsonDecode(File('data/catalog.json').readAsStringSync())
          as Map<String, dynamic>,
    );
    final loadout = Loadout.create(LoadoutMode.quickBattle);
    final deck = loadout.decks.single;
    deck.mystlingId = 'eldrithia';
    deck.cards['1'] = 2;
    deck.cards['2'] = 1;

    await tester.pumpWidget(MaterialApp(home: Editor(catalog, loadout, () {})));
    await tester.pump();

    expect(find.text('3/16 cards'), findsOneWidget);
    final removeAllBtn = find.widgetWithIcon(
      IconButton,
      Icons.delete_sweep_outlined,
    );
    expect(removeAllBtn, findsOneWidget);

    // Tapping the remove all button shows confirmation dialog
    await tester.tap(removeAllBtn);
    await tester.pumpAndSettle();

    expect(find.text('Remove all cards?'), findsOneWidget);
    expect(
      find.text('Are you sure you want to remove all cards from this deck?'),
      findsOneWidget,
    );

    // Cancel does not remove cards
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(deck.cards.isNotEmpty, isTrue);
    expect(find.text('3/16 cards'), findsOneWidget);

    // Tap again and confirm
    await tester.tap(removeAllBtn);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Remove all'));
    await tester.pumpAndSettle();

    expect(deck.cards.isEmpty, isTrue);
    expect(find.text('0/16 cards'), findsOneWidget);

    // Now the button should be disabled
    final btnWidget = tester.widget<IconButton>(removeAllBtn);
    expect(btnWidget.onPressed, isNull);
  });

  testWidgets('editor displays mystling-specific cards first in the grid', (
    tester,
  ) async {
    final catalog = Catalog.fromJson(
      jsonDecode(File('data/catalog.json').readAsStringSync())
          as Map<String, dynamic>,
    );
    final loadout = Loadout.create(LoadoutMode.quickBattle);
    loadout.decks.single.mystlingId = 'eldrithia';

    await tester.pumpWidget(MaterialApp(home: Editor(catalog, loadout, () {})));
    await tester.pump();

    // The first card tiles in the grid should be Eldrithia-specific cards
    final tiles =
        tester.widgetList<CardGridTile>(find.byType(CardGridTile)).toList();
    expect(tiles, isNotEmpty);
    expect(tiles.first.card.mystlingId, 'eldrithia');
  });

  testWidgets(
    'editor mystling selection and element filtering use element icons',
    (tester) async {
      final catalog = Catalog.fromJson(
        jsonDecode(File('data/catalog.json').readAsStringSync())
            as Map<String, dynamic>,
      );
      final loadout = Loadout.create(LoadoutMode.quickBattle);
      loadout.decks.single.mystlingId = 'eldrithia';

      await tester.pumpWidget(
        MaterialApp(home: Editor(catalog, loadout, () {})),
      );
      await tester.pump();

      // Verify mystling selection has the light element icon asset
      final lightIcon = find.byWidgetPredicate(
        (widget) =>
            widget is Image &&
            widget.image is AssetImage &&
            (widget.image as AssetImage).assetName ==
                'assets/element_icons/light.png',
      );
      expect(lightIcon, findsWidgets);

      // Verify elementFilterLabel produces Row with element icon and text for elements
      final fireLabel = elementFilterLabel('fire');
      expect(fireLabel, isA<Row>());
    },
  );
}

