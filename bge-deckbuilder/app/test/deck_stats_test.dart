import 'dart:convert';
import 'dart:io';

import 'package:dragon_eclipse_deck_builder/deck_stats.dart';
import 'package:dragon_eclipse_deck_builder/main.dart';
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

  group('DeckStats.compute', () {
    test('returns zeroed stats for empty deck', () {
      final deck = Deck(
        id: 'deck-1',
        name: 'Empty Deck',
        mystlingId: 'eldrithia',
        cards: {},
      );

      final stats = DeckStats.compute(catalog, deck);
      expect(stats.totalCards, 0);
      expect(stats.attacks, 0);
      expect(stats.meleeAttacks, 0);
      expect(stats.rangedAttacks, 0);
      expect(stats.movement, 0);
      expect(stats.powerGeneration, 0);
      expect(stats.cardDraw, 0);
      expect(stats.search, 0);
      expect(stats.defense, 0);
      expect(stats.heal, 0);
      expect(stats.cleanse, 0);
      expect(stats.totalStatus, 0);
      expect(stats.burn, 0);
      expect(stats.slow, 0);
      expect(stats.weak, 0);
      expect(stats.silence, 0);
      expect(stats.elementCounts, isEmpty);
      expect(stats.rarityCounts, isEmpty);
    });

    test('computes capability counts multiplied by quantities', () {
      final card1 = catalog.cards[0].id;
      final card2 = catalog.cards[1].id;
      final deck = Deck(
        id: 'deck-1',
        name: 'Eldrithia Deck',
        mystlingId: 'eldrithia',
        cards: {
          card1: 2,
          card2: 1,
        },
      );

      final stats = DeckStats.compute(catalog, deck);
      expect(stats.totalCards, 3);
      expect(stats.elementCounts, isNotEmpty);
      expect(stats.rarityCounts, isNotEmpty);
      expect(stats.attacks, greaterThanOrEqualTo(1));
    });

    test('computes search capability correctly for cards with search', () {
      final searchCard = catalog.cards.firstWhere(
        (c) => c.keywords.contains('Search'),
      );
      final deck = Deck(
        id: 'deck-search',
        name: 'Search Deck',
        mystlingId: 'vogandr',
        cards: {
          searchCard.id: 2,
        },
      );
      final stats = DeckStats.compute(catalog, deck);
      expect(stats.search, 2);
    });
  });

  group('DeckStatsSheet Widget', () {
    testWidgets('displays empty state when deck has no cards', (tester) async {
      final deck = Deck(
        id: 'deck-1',
        name: 'Empty Deck',
        mystlingId: 'eldrithia',
        cards: {},
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DeckStatsSheet(catalog: catalog, deck: deck),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Empty Deck Stats'), findsOneWidget);
      expect(find.text('0/16 cards in deck'), findsOneWidget);
      expect(find.text('No cards in this deck yet'), findsOneWidget);
      expect(find.byIcon(Icons.bar_chart_outlined), findsOneWidget);
    });

    testWidgets('displays categorized stats and bars when deck has cards', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final card1 = catalog.cards[0].id;
      final card2 = catalog.cards[1].id;
      final deck = Deck(
        id: 'deck-1',
        name: 'Battle Deck',
        mystlingId: 'eldrithia',
        cards: {
          card1: 2,
          card2: 1,
        },
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DeckStatsSheet(catalog: catalog, deck: deck),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Battle Deck Stats'), findsOneWidget);
      expect(find.text('3/16 cards in deck'), findsOneWidget);
      expect(find.text('Combat Actions'), findsOneWidget);
      expect(find.text('Resources & Flow'), findsOneWidget);
      expect(find.text('Search'), findsOneWidget);
      expect(find.text('Defense & Sustain'), findsOneWidget);
      expect(find.text('Status & Control'), findsOneWidget);
      expect(find.text('Element Breakdown'), findsOneWidget);
      expect(find.text('Rarity Breakdown'), findsOneWidget);
      expect(find.byType(LinearProgressIndicator), findsWidgets);
    });

    testWidgets('editor stats button opens bottom sheet modal', (tester) async {
      final card1 = catalog.cards[0].id;
      final loadout = Loadout.create(LoadoutMode.quickBattle);
      final deck = loadout.decks.single;
      deck.name = 'Quick Deck';
      deck.mystlingId = 'eldrithia';
      deck.cards[card1] = 2;

      await tester.pumpWidget(
        MaterialApp(
          home: Editor(catalog, loadout, () {}),
        ),
      );
      await tester.pump();

      final statsBtn = find.widgetWithIcon(
        IconButton,
        Icons.bar_chart_outlined,
      );
      expect(statsBtn, findsOneWidget);

      await tester.tap(statsBtn);
      await tester.pumpAndSettle();

      expect(find.text('Quick Deck Stats'), findsOneWidget);
      expect(find.text('2/16 cards in deck'), findsOneWidget);
      expect(find.text('Combat Actions'), findsOneWidget);

      // Tap close button dismisses sheet
      await tester.tap(find.byIcon(Icons.close));
      await tester.pumpAndSettle();

      expect(find.text('Quick Deck Stats'), findsNothing);
    });
  });
}
