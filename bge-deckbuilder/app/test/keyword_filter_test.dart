import 'dart:convert';
import 'dart:io';

import 'package:dragon_eclipse_deck_builder/keyword_filter.dart';
import 'package:dragon_eclipse_deck_builder/main.dart';
import 'package:dragon_eclipse_deck_builder/models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('GameCard parses keywords correctly from json', () {
    final json = {
      'id': 'TEST-01',
      'type': 'action',
      'name': 'Test Action',
      'rarity': 'common',
      'source': 'booster',
      'copiesInBaseGame': 2,
      'keywords': ['Attack', 'Pierce', 'Mobility'],
      'effects': [
        {'type': 'active', 'text': 'Attack (Pierce 2). Move 1.'}
      ],
    };

    final card = GameCard.fromJson(json);
    expect(card.keywords, ['Attack', 'Pierce', 'Mobility']);
  });

  test('KeywordFilterState matches cards with AND and OR logic', () {
    final card1 = GameCard.fromJson({
      'id': 'C1',
      'type': 'action',
      'name': 'Dash Strike',
      'rarity': 'common',
      'source': 'starting',
      'copiesInBaseGame': 1,
      'keywords': ['Attack', 'Move', 'Mobility'],
      'effects': [],
    });

    final card2 = GameCard.fromJson({
      'id': 'C2',
      'type': 'action',
      'name': 'Iron Wall',
      'rarity': 'common',
      'source': 'starting',
      'copiesInBaseGame': 1,
      'keywords': ['Defense', 'Tank & Sustain'],
      'effects': [],
    });

    // Empty filter matches all
    expect(const KeywordFilterState().matchesCard(card1), isTrue);
    expect(const KeywordFilterState().matchesCard(card2), isTrue);

    // Single keyword filter
    final attackFilter = const KeywordFilterState(selected: {'Attack'});
    expect(attackFilter.matchesCard(card1), isTrue);
    expect(attackFilter.matchesCard(card2), isFalse);

    // AND filter: requires all keywords
    final andFilter = const KeywordFilterState(
      selected: {'Attack', 'Move'},
      matchAll: true,
    );
    expect(andFilter.matchesCard(card1), isTrue);

    final andFilterUnmet = const KeywordFilterState(
      selected: {'Attack', 'Defense'},
      matchAll: true,
    );
    expect(andFilterUnmet.matchesCard(card1), isFalse);

    // OR filter: requires any keyword
    final orFilter = const KeywordFilterState(
      selected: {'Attack', 'Defense'},
      matchAll: false,
    );
    expect(orFilter.matchesCard(card1), isTrue);
    expect(orFilter.matchesCard(card2), isTrue);

    final orFilterUnmet = const KeywordFilterState(
      selected: {'Burn'},
      matchAll: false,
    );
    expect(orFilterUnmet.matchesCard(card1), isFalse);
    expect(orFilterUnmet.matchesCard(card2), isFalse);
  });

  test('cardMatchesSearch matches by keyword, name, id, and effects', () {
    final card = GameCard.fromJson({
      'id': 'DE-CB-42/125',
      'type': 'action',
      'name': 'Dive',
      'rarity': 'ultra_rare',
      'source': 'booster',
      'copiesInBaseGame': 1,
      'keywords': ['Attack', 'Pierce', 'Cleanse', 'Mobility'],
      'effects': [
        {'type': 'active', 'text': 'Cleanse 1. Attack (Pierce 4).'}
      ],
    });

    expect(cardMatchesSearch(card, 'dive'), isTrue);
    expect(cardMatchesSearch(card, 'DE-CB-42'), isTrue);
    expect(cardMatchesSearch(card, 'mobility'), isTrue);
    expect(cardMatchesSearch(card, 'pierce 4'), isTrue);
    expect(cardMatchesSearch(card, 'fireball'), isFalse);
  });

  testWidgets('ActiveKeywordChipsBar displays chips and triggers callbacks', (
    tester,
  ) async {
    String? removed;
    var cleared = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ActiveKeywordChipsBar(
            state: const KeywordFilterState(
              selected: {'Attack', 'Mobility'},
              matchAll: true,
            ),
            onRemove: (kw) => removed = kw,
            onClearAll: () => cleared = true,
          ),
        ),
      ),
    );

    expect(find.text('Keywords (AND):'), findsOneWidget);
    expect(find.text('Attack'), findsOneWidget);
    expect(find.text('Mobility'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.close).first);
    expect(removed, isNotNull);

    await tester.tap(find.text('Clear'));
    expect(cleared, isTrue);
  });

  testWidgets('CatalogView renders keyword filter button and responds to taps', (
    tester,
  ) async {
    final catalog = Catalog.fromJson(
      jsonDecode(File('data/catalog.json').readAsStringSync())
          as Map<String, dynamic>,
    );

    await tester.pumpWidget(MaterialApp(home: CatalogView(catalog)));
    await tester.pump();

    // Verify filter button exists
    expect(find.text('Keywords'), findsOneWidget);

    // Tap keyword filter button to open bottom sheet
    await tester.tap(find.text('Keywords'));
    await tester.pumpAndSettle();

    // Verify filter sheet dialog appears with category headers and chips
    expect(find.text('Filter by Keywords'), findsOneWidget);
    expect(find.text('Combat Actions'), findsOneWidget);
    expect(find.text('ALL (AND)'), findsOneWidget);
    expect(find.text('ANY (OR)'), findsOneWidget);

    // Select Attack chip
    await tester.tap(find.widgetWithText(FilterChip, 'Attack'));
    await tester.pump();

    // Tap Apply button
    await tester.tap(find.widgetWithText(FilledButton, 'Apply (1 selected)'));
    await tester.pumpAndSettle();

    // Verify active filter chip is shown in CatalogView
    expect(find.text('Keywords (1)'), findsOneWidget);
    expect(find.text('Attack'), findsOneWidget);
  });

  testWidgets('cardDetail displays keyword chips and allows tapping to filter', (
    tester,
  ) async {
    final card = GameCard.fromJson({
      'id': 'TEST-01',
      'type': 'action',
      'name': 'Test Action',
      'rarity': 'common',
      'source': 'booster',
      'copiesInBaseGame': 2,
      'keywords': ['Attack', 'Blink'],
      'effects': [
        {'type': 'active', 'text': 'Attack. Blink 2.'}
      ],
    });

    String? tappedKeyword;

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => ElevatedButton(
            onPressed: () => cardDetail(
              context,
              card,
              onKeywordTap: (kw) => tappedKeyword = kw,
            ),
            child: const Text('Open'),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();

    expect(find.text('Keywords:'), findsOneWidget);
    expect(find.widgetWithText(ActionChip, 'Attack'), findsOneWidget);
    expect(find.widgetWithText(ActionChip, 'Blink'), findsOneWidget);

    await tester.tap(find.widgetWithText(ActionChip, 'Blink'));
    await tester.pumpAndSettle();

    expect(tappedKeyword, 'Blink');
  });
}
