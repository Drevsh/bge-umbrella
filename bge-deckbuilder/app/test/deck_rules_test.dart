import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:dragon_eclipse_deck_builder/models.dart';
import 'package:dragon_eclipse_deck_builder/rules.dart';
import 'package:dragon_eclipse_deck_builder/storage.dart';

void main() {
  late Catalog catalog;
  setUpAll(() {
    catalog = Catalog.fromJson(
      jsonDecode(File('data/catalog.json').readAsStringSync())
          as Map<String, dynamic>,
    );
  });

  test('rule boundaries and lineup copy conflicts', () {
    final item = Loadout.create(LoadoutMode.campaign);
    final first = item.decks[0];
    final second = item.decks[1];
    first.mystlingId = 'eldrithia';
    second.mystlingId = 'iceling';
    final ids = catalog.cards
        .where((card) => card.mystlingId == 'eldrithia')
        .map((card) => card.id)
        .toList();
    expect(ids.length, greaterThanOrEqualTo(3));
    for (final id in ids.take(3)) {
      first.cards[id] = 1;
    }
    expect(
      validateLoadout(catalog, item).any(
        (warning) =>
            warning.deckIndex == 0 && warning.message.contains('3–6 matching'),
      ),
      isFalse,
    );
    first.cards[ids.first] = 3;
    first.cards[ids[1]] = 3;
    first.cards[ids[2]] = 1;
    expect(
      validateLoadout(
        catalog,
        item,
      ).any((warning) => warning.message.contains('3–6 matching')),
      isTrue,
    );
    first.cards[ids.first] = 1;
    first.cards[ids[1]] = 1;
    first.cards[ids[2]] = 1;
    first.cards['DE-CB-24/125'] = 2;
    second.cards['DE-CB-24/125'] = 1;
    expect(
      validateLoadout(
        catalog,
        item,
      ).any((warning) => warning.message.contains('across the lineup')),
      isTrue,
    );
    second.mystlingId = 'firple';
    expect(
      validateLoadout(
        catalog,
        item,
      ).any((warning) => warning.message.contains('distinct main elements')),
      isFalse,
    );
    second.mystlingId = 'eldrithia';
    expect(
      validateLoadout(
        catalog,
        item,
      ).any((warning) => warning.message.contains('distinct main elements')),
      isTrue,
    );
  });

  test('editor eligibility keeps other Mystlings and experiment separate', () {
    final eldrithia = catalog.mystlingsById['eldrithia']!;
    final neutral = catalog.cards.firstWhere((card) => card.element == null);
    final light = catalog.cards.firstWhere(
      (card) => card.element == 'light' && card.mystlingId == null,
    );
    final dark = catalog.cards.firstWhere(
      (card) => card.element == 'dark' && card.mystlingId == null,
    );
    final fire = catalog.cards.firstWhere(
      (card) => card.element == 'fire' && card.mystlingId == null,
    );
    final own = catalog.cards.firstWhere(
      (card) => card.mystlingId == 'eldrithia',
    );
    final other = catalog.cards.firstWhere(
      (card) => card.mystlingId == 'iceling',
    );
    expect(isCardAvailableForDeck(neutral, eldrithia), isTrue);
    expect(isCardAvailableForDeck(light, eldrithia), isTrue);
    expect(isCardAvailableForDeck(dark, eldrithia), isTrue);
    expect(isCardAvailableForDeck(fire, eldrithia), isFalse);
    expect(isCardAvailableForDeck(own, eldrithia), isTrue);
    expect(isCardAvailableForDeck(other, eldrithia), isFalse);
    expect(
      isCardAvailableForDeck(other, eldrithia, otherMystlings: true),
      isTrue,
    );
    expect(
      isCardAvailableForDeck(fire, eldrithia, otherMystlings: true),
      isFalse,
    );
    expect(isCardAvailableForDeck(fire, eldrithia, experimental: true), isTrue);
    expect(isCardAvailableForDeck(neutral, null), isTrue);
    expect(isCardAvailableForDeck(light, null), isFalse);
    final artios = catalog.mystlingsById['artios']!;
    expect(isCardAvailableForDeck(fire, artios), isTrue);
    expect(isCardAvailableForDeck(dark, artios), isFalse);
  });

  test(
    'ordinary Add respects limits while experimental Add is unrestricted',
    () {
      final item = Loadout.create(LoadoutMode.campaign);
      final deck = item.decks.first..mystlingId = 'eldrithia';
      final other = catalog.cards.firstWhere(
        (card) => card.mystlingId == 'iceling',
      );
      expect(cannotAddCard(catalog, item, deck, other), isNotNull);
      expect(
        cannotAddCard(catalog, item, deck, other, otherMystlings: true),
        isNull,
      );
      final dark = catalog.cards.firstWhere(
        (card) => card.element == 'dark' && card.mystlingId == null,
      );
      deck.cards[dark.id] = 1;
      expect(cannotAddCard(catalog, item, deck, dark), contains('Subtype'));
      expect(
        cannotAddCard(catalog, item, deck, dark, experimental: true),
        isNull,
      );
      deck.cards.clear();
      final neutral = catalog.cards.firstWhere((card) => card.element == null);
      item.decks.last.cards[neutral.id] = neutral.copiesInBaseGame;
      expect(cannotAddCard(catalog, item, deck, neutral), contains('copies'));
      item.decks.last.cards.clear();
      deck.cards[neutral.id] = 16;
      expect(
        cannotAddCard(catalog, item, deck, other, otherMystlings: true),
        contains('full'),
      );
    },
  );

  test('subtype, element and exact card count warnings', () {
    final item = Loadout.create(LoadoutMode.quickBattle);
    final deck = item.decks.single..mystlingId = 'eldrithia';
    final dark = catalog.cards.firstWhere(
      (card) => card.element == 'dark' && card.mystlingId == null,
    );
    final fire = catalog.cards.firstWhere(
      (card) => card.element == 'fire' && card.mystlingId == null,
    );
    deck.cards[dark.id] = 2;
    deck.cards[fire.id] = 1;
    final warnings = validateLoadout(
      catalog,
      item,
    ).map((w) => w.message).join(' ');
    expect(warnings, contains('subtype cards'));
    expect(warnings, contains('ineligible element'));
    expect(warnings, contains('3/16'));
    deck.cards[dark.id] = 15;
    expect(
      validateLoadout(catalog, item).any((w) => w.message.contains('16/16')),
      isFalse,
    );
    deck.cards[dark.id] = 16;
    expect(
      validateLoadout(catalog, item).any((w) => w.message.contains('17/16')),
      isTrue,
    );
  });

  test('legendary and wrong Mystling card warnings', () {
    final item = Loadout.create(LoadoutMode.quickBattle);
    final deck = item.decks.single..mystlingId = 'iceling';
    final legendary = catalog.cards.firstWhere(
      (card) => card.rarity == 'legendary',
    );
    final otherMystling = catalog.cards.firstWhere(
      (card) => card.mystlingId == 'eldrithia',
    );
    deck.cards[legendary.id] = 1;
    expect(
      validateLoadout(
        catalog,
        item,
      ).any((w) => w.message.contains('Legendary cards')),
      isFalse,
    );
    deck.cards[legendary.id] = 2;
    deck.cards[otherMystling.id] = 1;
    final warnings = validateLoadout(
      catalog,
      item,
    ).map((w) => w.message).join(' ');
    expect(warnings, contains('Legendary cards'));
    expect(warnings, contains('another Mystling'));
  });

  test('Artios applies each printed subtype limit separately', () {
    final artios = catalog.mystlingsById['artios']!;
    expect(artios.subtypeLimits, {'fire': 1, 'water': 1, 'earth': 1, 'air': 1});
    final item = Loadout.create(LoadoutMode.quickBattle);
    final deck = item.decks.single..mystlingId = 'artios';
    final fire = catalog.cards.firstWhere(
      (card) => card.element == 'fire' && card.mystlingId == null,
    );
    final water = catalog.cards.firstWhere(
      (card) => card.element == 'water' && card.mystlingId == null,
    );
    final dark = catalog.cards.firstWhere(
      (card) => card.element == 'dark' && card.mystlingId == null,
    );
    deck.cards[fire.id] = 2;
    deck.cards[water.id] = 1;
    deck.cards[dark.id] = 1;
    final warnings = validateLoadout(
      catalog,
      item,
    ).map((w) => w.message).join(' ');
    expect(warnings, contains('Fire subtype cards: 2; limit is 1'));
    expect(warnings, isNot(contains('Water subtype cards')));
    expect(warnings, contains('ineligible element (Dark)'));
  });

  test('PvP mode uses the PvP stat side', () {
    final youngBolb = catalog.mystlingsById['young_bolb']!;
    expect(youngBolb.statsFor(LoadoutMode.campaign)!['health'], 35);
    expect(youngBolb.statsFor(LoadoutMode.quickBattle)!['health'], 40);
    expect(youngBolb.statsFor(LoadoutMode.challenge)!['health'], 40);
    expect(
      youngBolb.statImageFor(LoadoutMode.quickBattle),
      contains('stat_29B'),
    );
    final youngEmberling = catalog.mystlingsById['young_emberling']!;
    expect(youngEmberling.statsFor(LoadoutMode.campaign), isNull);
    expect(youngEmberling.statsFor(LoadoutMode.quickBattle)!['health'], 22);
  });

  test('save, reopen, export and merge with conflict', () async {
    final directory = await Directory.systemTemp.createTemp(
      'deck_builder_test_',
    );
    try {
      final store = LocalStore(directory);
      final items = [
        for (final mode in LoadoutMode.values) Loadout.create(mode),
      ];
      await store.write(items, catalog.schemaVersion);
      final reopened = await store.read();
      expect(reopened.map((item) => item.mode).toList(), LoadoutMode.values);
      final source = exportJson(reopened, catalog.schemaVersion);
      final preview = previewImport(source, catalog);
      expect(preview.unknownCards, isEmpty);
      expect(mergeImport(reopened, preview), 0);
      final changed = previewImport(source, catalog);
      changed.loadouts.first.name = 'Changed';
      expect(mergeImport(reopened, changed), 1);
      expect(reopened.last.name, 'Changed (imported)');
      expect(
        () => previewImport(
          '{"formatVersion":99,"catalogVersion":4,"loadouts":[]}',
          catalog,
        ),
        throwsFormatException,
      );
    } finally {
      await directory.delete(recursive: true);
    }
  });

  test('compareCardsForDeck puts mystling-specific cards first', () {
    final eldrithiaCard = catalog.cards.firstWhere(
      (c) => c.mystlingId == 'eldrithia',
    );
    final genericCard = catalog.cards.firstWhere((c) => c.mystlingId == null);
    final otherMystlingCard = catalog.cards.firstWhere(
      (c) => c.mystlingId != null && c.mystlingId != 'eldrithia',
    );

    // When eldrithia is selected:
    // eldrithiaCard comes before genericCard
    expect(
      compareCardsForDeck(eldrithiaCard, genericCard, mystlingId: 'eldrithia'),
      isNegative,
    );
    expect(
      compareCardsForDeck(genericCard, eldrithiaCard, mystlingId: 'eldrithia'),
      isPositive,
    );

    // eldrithiaCard comes before otherMystlingCard
    expect(
      compareCardsForDeck(
        eldrithiaCard,
        otherMystlingCard,
        mystlingId: 'eldrithia',
      ),
      isNegative,
    );

    // otherMystlingCard comes before genericCard
    expect(
      compareCardsForDeck(
        otherMystlingCard,
        genericCard,
        mystlingId: 'eldrithia',
      ),
      isNegative,
    );
  });
}
