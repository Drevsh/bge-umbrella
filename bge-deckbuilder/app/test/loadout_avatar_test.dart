import 'dart:convert';
import 'dart:io';

import 'package:dragon_eclipse_deck_builder/loadout_avatar.dart';
import 'package:dragon_eclipse_deck_builder/models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late Catalog catalog;

  setUpAll(() {
    catalog = Catalog.fromJson(
      jsonDecode(File('data/catalog.json').readAsStringSync())
          as Map<String, dynamic>,
    );
  });

  group('LoadoutMystlingAvatar', () {
    testWidgets('renders single branding icon for quickBattle loadout',
        (tester) async {
      final loadout = Loadout(
        id: 'qb-1',
        name: 'Quick Battle',
        mode: LoadoutMode.quickBattle,
        decks: [
          Deck(
            id: 'd1',
            name: 'Eldrithia Deck',
            mystlingId: 'eldrithia',
            cards: {},
          ),
        ],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LoadoutMystlingAvatar(catalog: catalog, loadout: loadout),
          ),
        ),
      );

      final imageFinder = find.byType(Image);
      expect(imageFinder, findsOneWidget);
      final image = tester.widget<Image>(imageFinder);
      expect((image.image as AssetImage).assetName,
          'images/mystlings/branding/eldrithia_icon.jpg');
    });

    testWidgets('renders diagonal split for campaign loadout with 2 mystlings',
        (tester) async {
      final loadout = Loadout(
        id: 'camp-1',
        name: 'Campaign Duo',
        mode: LoadoutMode.campaign,
        decks: [
          Deck(
            id: 'd1',
            name: 'Eldrithia Deck',
            mystlingId: 'eldrithia',
            cards: {},
          ),
          Deck(
            id: 'd2',
            name: 'Alukah Deck',
            mystlingId: 'alukah',
            cards: {},
          ),
        ],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LoadoutMystlingAvatar(catalog: catalog, loadout: loadout),
          ),
        ),
      );

      expect(
        find.byWidgetPredicate(
            (w) => w is ClipPath && w.clipper is DiagonalTopLeftClipper),
        findsOneWidget,
      );
      expect(
        find.byWidgetPredicate(
            (w) => w is ClipPath && w.clipper is DiagonalBottomRightClipper),
        findsOneWidget,
      );
      final images = tester.widgetList<Image>(find.byType(Image)).toList();
      expect(images.length, 2);
      expect((images[0].image as AssetImage).assetName,
          'images/mystlings/branding/eldrithia_icon.jpg');
      expect((images[1].image as AssetImage).assetName,
          'images/mystlings/branding/alukah_icon.jpg');
      expect(
        find.byWidgetPredicate(
            (w) => w is CustomPaint && w.painter is DiagonalDividerPainter),
        findsOneWidget,
      );
    });

    testWidgets('renders 3 center-focused slices for challenge loadout',
        (tester) async {
      final loadout = Loadout(
        id: 'chal-1',
        name: 'PvP Trio',
        mode: LoadoutMode.challenge,
        decks: [
          Deck(
            id: 'd1',
            name: 'Eldrithia Deck',
            mystlingId: 'eldrithia',
            cards: {},
          ),
          Deck(
            id: 'd2',
            name: 'Alukah Deck',
            mystlingId: 'alukah',
            cards: {},
          ),
          Deck(
            id: 'd3',
            name: 'Firple Deck',
            mystlingId: 'firple',
            cards: {},
          ),
        ],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LoadoutMystlingAvatar(catalog: catalog, loadout: loadout),
          ),
        ),
      );

      final images = tester.widgetList<Image>(find.byType(Image)).toList();
      expect(images.length, 3);
      expect((images[0].image as AssetImage).assetName,
          'images/mystlings/branding/eldrithia_icon.jpg');
      expect((images[1].image as AssetImage).assetName,
          'images/mystlings/branding/alukah_icon.jpg');
      expect((images[2].image as AssetImage).assetName,
          'images/mystlings/branding/firple_icon.jpg');
      expect(find.byType(OverflowBox), findsNWidgets(3));
    });
  });
}
