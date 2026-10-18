import 'models.dart';

class RuleWarning {
  const RuleWarning(this.deckIndex, this.message);
  final int? deckIndex;
  final String message;
}

/// Cards offered by the editor before the user's search and display filters.
bool isCardAvailableForDeck(
  GameCard card,
  Mystling? mystling, {
  bool otherMystlings = false,
  bool experimental = false,
}) {
  if (experimental) return true;
  if (card.type != 'action') return false;
  if (card.mystlingId != null) {
    if (card.mystlingId == mystling?.id) return true;
    if (otherMystlings) return true;
    return false;
  }
  if (card.element == null) return true;
  return card.element == mystling?.mainElement ||
      (mystling?.subtypeLimits.containsKey(card.element) ?? false);
}

/// Sorts cards placing the active deck Mystling's cards first, followed by
/// any other Mystling-specific cards, then generic cards, sorting alphabetically by name.
int compareCardsForDeck(GameCard a, GameCard b, {String? mystlingId}) {
  final aIsDeckMystling = mystlingId != null && a.mystlingId == mystlingId;
  final bIsDeckMystling = mystlingId != null && b.mystlingId == mystlingId;
  if (aIsDeckMystling != bIsDeckMystling) {
    return aIsDeckMystling ? -1 : 1;
  }

  final aIsMystlingSpecific = a.mystlingId != null;
  final bIsMystlingSpecific = b.mystlingId != null;
  if (aIsMystlingSpecific != bIsMystlingSpecific) {
    return aIsMystlingSpecific ? -1 : 1;
  }

  return a.name.compareTo(b.name);
}

/// Returns why another copy cannot be added in ordinary editing mode.
String? cannotAddCard(
  Catalog catalog,
  Loadout loadout,
  Deck deck,
  GameCard card, {
  bool otherMystlings = false,
  bool experimental = false,
}) {
  if (experimental) return null;
  final mystling = catalog.mystlingsById[deck.mystlingId];
  if (!isCardAvailableForDeck(card, mystling, otherMystlings: otherMystlings)) {
    return 'Card is not eligible for this Mystling';
  }
  if (deck.cardCount >= 16) return 'Deck is full (16 cards)';
  final pooledCount = loadout.decks.fold<int>(
    0,
    (sum, item) => sum + (item.cards[card.id] ?? 0),
  );
  if (pooledCount >= card.copiesInBaseGame) {
    return 'No base-game copies remain';
  }
  if (card.rarity == 'legendary') {
    final count = deck.cards.entries.fold<int>(0, (sum, entry) {
      final selected = catalog.cardsById[entry.key];
      return sum + (selected?.rarity == 'legendary' ? entry.value : 0);
    });
    if (count >= 1) return 'Only one Legendary card is allowed';
  }
  if (mystling != null && card.mystlingId == mystling.id) {
    final count = deck.cards.entries.fold<int>(0, (sum, entry) {
      final selected = catalog.cardsById[entry.key];
      return sum + (selected?.mystlingId == mystling.id ? entry.value : 0);
    });
    if (count >= 6) return 'At most six matching Mystling cards';
  }
  if (card.element != null && card.element != mystling?.mainElement) {
    final limit = mystling?.subtypeLimits[card.element];
    if (limit != null) {
      final count = deck.cards.entries.fold<int>(0, (sum, entry) {
        final selected = catalog.cardsById[entry.key];
        return sum + (selected?.element == card.element ? entry.value : 0);
      });
      if (count >= limit) return 'Subtype card limit reached';
    }
  }
  return null;
}

List<RuleWarning> validateLoadout(Catalog catalog, Loadout loadout) {
  final warnings = <RuleWarning>[];
  if (loadout.decks.length != loadout.mode.deckCount) {
    warnings.add(
      RuleWarning(
        null,
        '${loadout.mode.label} needs ${loadout.mode.deckCount} decks.',
      ),
    );
  }
  final elementOwners = <String, int>{};
  final pooledCopies = <String, int>{};
  for (var index = 0; index < loadout.decks.length; index++) {
    final deck = loadout.decks[index];
    final mystling = catalog.mystlingsById[deck.mystlingId];
    if (mystling == null) {
      warnings.add(
        RuleWarning(
          index,
          deck.mystlingId == null
              ? 'Choose a Mystling.'
              : 'Unknown Mystling: ${deck.mystlingId}.',
        ),
      );
    } else if (loadout.mode != LoadoutMode.quickBattle) {
      final previous = elementOwners[mystling.mainElement];
      if (previous != null) {
        warnings.add(
          RuleWarning(
            index,
            '${mystling.name} shares ${titleCase(mystling.mainElement)} with deck ${previous + 1}. Choose distinct main elements.',
          ),
        );
      } else {
        elementOwners[mystling.mainElement] = index;
      }
    }
    if (deck.cardCount != 16) {
      warnings.add(
        RuleWarning(index, 'Deck has ${deck.cardCount}/16 Action cards.'),
      );
    }
    var specific = 0;
    var legendary = 0;
    final subtypeCounts = <String, int>{};
    for (final entry in deck.cards.entries) {
      final card = catalog.cardsById[entry.key];
      final quantity = entry.value;
      if (quantity <= 0) {
        warnings.add(
          RuleWarning(index, '${entry.key} has an invalid quantity.'),
        );
        continue;
      }
      if (card == null) {
        warnings.add(RuleWarning(index, 'Unknown card: ${entry.key}.'));
        continue;
      }
      if (card.type != 'action') {
        warnings.add(RuleWarning(index, '${card.name} is not an Action card.'));
      }
      if (card.rarity == 'legendary') legendary += quantity;
      if (card.mystlingId != null) {
        if (card.mystlingId == deck.mystlingId) {
          specific += quantity;
        } else {
          warnings.add(
            RuleWarning(index, '${card.name} belongs to another Mystling.'),
          );
        }
      }
      if (mystling != null && card.element != null) {
        if (card.element == mystling.mainElement) {
          // Main-element cards have no subtype limit.
        } else if (mystling.subtypeLimits.containsKey(card.element)) {
          subtypeCounts[card.element!] =
              (subtypeCounts[card.element!] ?? 0) + quantity;
        } else {
          warnings.add(
            RuleWarning(
              index,
              '${card.name} has an ineligible element (${titleCase(card.element!)}).',
            ),
          );
        }
      }
      if (quantity > card.copiesInBaseGame) {
        warnings.add(
          RuleWarning(
            index,
            '${card.name}: $quantity copies selected; base game has ${card.copiesInBaseGame}.',
          ),
        );
      }
      pooledCopies[card.id] = (pooledCopies[card.id] ?? 0) + quantity;
    }
    if (specific < 3 || specific > 6) {
      warnings.add(
        RuleWarning(
          index,
          'Deck needs 3–6 matching Mystling cards ($specific selected).',
        ),
      );
    }
    if (legendary > 1) {
      warnings.add(
        RuleWarning(
          index,
          'Deck has $legendary Legendary cards; maximum is 1.',
        ),
      );
    }
    if (mystling != null) {
      for (final limit in mystling.subtypeLimits.entries) {
        final count = subtypeCounts[limit.key] ?? 0;
        if (count > limit.value) {
          warnings.add(
            RuleWarning(
              index,
              '${titleCase(limit.key)} subtype cards: $count; limit is ${limit.value}.',
            ),
          );
        }
      }
    }
  }
  if (loadout.decks.length > 1) {
    for (final entry in pooledCopies.entries) {
      final card = catalog.cardsById[entry.key];
      if (card != null && entry.value > card.copiesInBaseGame) {
        warnings.add(
          RuleWarning(
            null,
            '${card.name}: ${entry.value} copies across the lineup; base game has ${card.copiesInBaseGame}.',
          ),
        );
      }
    }
  }
  return warnings;
}
