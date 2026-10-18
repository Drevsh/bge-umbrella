import 'dart:convert';

class Catalog {
  Catalog(
    this.schemaVersion,
    this.status,
    this.cards,
    this.mystlings,
    this.bonusActions,
  ) : cardsById = {for (final card in cards) card.id: card},
      mystlingsById = {for (final mystling in mystlings) mystling.id: mystling};

  factory Catalog.fromJson(Map<String, dynamic> json) => Catalog(
    json['schemaVersion'] as int,
    json['status'] as String,
    (json['cards'] as List)
        .map((value) => GameCard.fromJson(value as Map<String, dynamic>))
        .toList(),
    (json['mystlings'] as List)
        .map((value) => Mystling.fromJson(value as Map<String, dynamic>))
        .toList(),
    json['bonusActions'] as Map<String, dynamic>,
  );

  final int schemaVersion;
  final String status;
  final List<GameCard> cards;
  final List<Mystling> mystlings;
  final Map<String, dynamic> bonusActions;
  final Map<String, GameCard> cardsById;
  final Map<String, Mystling> mystlingsById;
}

class GameCard {
  GameCard.fromJson(Map<String, dynamic> json)
    : id = json['id'] as String,
      name = json['name'] as String,
      type = json['type'] as String,
      element = json['element'] as String?,
      rarity = json['rarity'] as String,
      source = json['source'] as String,
      mystlingId = json['mystlingId'] as String?,
      copiesInBaseGame = json['copiesInBaseGame'] as int,
      keywords = (json['keywords'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      effects = (json['effects'] as List)
          .map((value) => CardEffect.fromJson(value as Map<String, dynamic>))
          .toList(),
      imagePath = json['imagePath'] as String?;

  final String id;
  final String name;
  final String type;
  final String? element;
  final String rarity;
  final String source;
  final String? mystlingId;
  final int copiesInBaseGame;
  final List<String> keywords;
  final List<CardEffect> effects;
  final String? imagePath;
}

class CardEffect {
  CardEffect.fromJson(Map<String, dynamic> json)
    : type = json['type'] as String,
      text = json['text'] as String;

  final String type;
  final String text;
}

class Mystling {
  Mystling.fromJson(Map<String, dynamic> json)
    : id = json['id'] as String,
      name = json['name'] as String,
      mainElement = json['mainElement'] as String,
      subtype = json['subtype'] as Map<String, dynamic>?,
      subtypes = (json['subtypes'] as List?)
          ?.map((value) => value as Map<String, dynamic>)
          .toList(),
      stats = json['stats'] as Map<String, dynamic>?,
      resourceCaps = json['resourceCaps'] as Map<String, dynamic>?,
      statCardImagePath = json['statCardImagePath'] as String?,
      pvpStatCard = json['pvpStatCard'] as Map<String, dynamic>?,
      specialAbility = json['specialAbility'] as Map<String, dynamic>?;

  final String id;
  final String name;
  final String mainElement;
  final Map<String, dynamic>? subtype;
  final List<Map<String, dynamic>>? subtypes;
  final Map<String, dynamic>? stats;
  final Map<String, dynamic>? resourceCaps;
  final String? statCardImagePath;
  final Map<String, dynamic>? pvpStatCard;
  final Map<String, dynamic>? specialAbility;

  Map<String, dynamic>? statsFor(LoadoutMode mode) =>
      mode == LoadoutMode.campaign
      ? stats
      : pvpStatCard?['stats'] as Map<String, dynamic>?;

  Map<String, dynamic>? resourceCapsFor(LoadoutMode mode) =>
      mode == LoadoutMode.campaign
      ? resourceCaps
      : pvpStatCard?['resourceCaps'] as Map<String, dynamic>?;

  String? statImageFor(LoadoutMode mode) => mode == LoadoutMode.campaign
      ? statCardImagePath
      : pvpStatCard?['imagePath'] as String?;

  String get iconPath => 'images/mystlings/branding/${id}_icon.jpg';

  String? get subtypeElement => subtype?['element'] as String?;
  int get subtypeLimit => subtype?['maxCards'] as int? ?? 0;

  Map<String, int> get subtypeLimits {
    if (subtypes != null) {
      return {
        for (final value in subtypes!)
          value['element'] as String: value['maxCards'] as int,
      };
    }
    if (subtypeElement != null) return {subtypeElement!: subtypeLimit};
    return {};
  }

  String get subtypeDescription => subtypeLimits.entries
      .map((entry) => '${titleCase(entry.key)} (${entry.value})')
      .join(', ');
}

enum LoadoutMode { campaign, quickBattle, challenge }

extension LoadoutModeDisplay on LoadoutMode {
  String get label => switch (this) {
    LoadoutMode.campaign => 'Campaign pair',
    LoadoutMode.quickBattle => 'PvP Quick Battle',
    LoadoutMode.challenge => 'PvP Challenge',
  };

  int get deckCount => switch (this) {
    LoadoutMode.campaign => 2,
    LoadoutMode.quickBattle => 1,
    LoadoutMode.challenge => 3,
  };
}

class Deck {
  Deck({
    required this.id,
    required this.name,
    this.mystlingId,
    Map<String, int>? cards,
  }) : cards = cards ?? {};

  factory Deck.fromJson(Map<String, dynamic> json) => Deck(
    id: json['id'] as String,
    name: json['name'] as String,
    mystlingId: json['mystlingId'] as String?,
    cards: (json['cards'] as Map<String, dynamic>).map(
      (key, value) => MapEntry(key, value as int),
    ),
  );

  final String id;
  String name;
  String? mystlingId;
  final Map<String, int> cards;

  int get cardCount => cards.values.fold(0, (sum, count) => sum + count);

  void changeCard(String cardId, int delta) {
    final next = (cards[cardId] ?? 0) + delta;
    if (next <= 0) {
      cards.remove(cardId);
    } else {
      cards[cardId] = next;
    }
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'mystlingId': mystlingId,
    'cards': cards,
  };
}

class Loadout {
  static int _nextId = 0;
  Loadout({
    required this.id,
    required this.name,
    required this.mode,
    required this.decks,
  });

  factory Loadout.create(LoadoutMode mode) {
    final stamp = '${DateTime.now().microsecondsSinceEpoch}_${_nextId++}';
    return Loadout(
      id: 'loadout_$stamp',
      name: mode.label,
      mode: mode,
      decks: List.generate(
        mode.deckCount,
        (index) => Deck(
          id: 'deck_${stamp}_$index',
          name: mode.label,
        ),
      ),
    );
  }

  factory Loadout.fromJson(Map<String, dynamic> json) => Loadout(
    id: json['id'] as String,
    name: json['name'] as String,
    mode: LoadoutMode.values.byName(json['mode'] as String),
    decks: (json['decks'] as List)
        .map((value) => Deck.fromJson(value as Map<String, dynamic>))
        .toList(),
  );

  String id;
  String name;
  final LoadoutMode mode;
  final List<Deck> decks;

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'mode': mode.name,
    'decks': decks.map((deck) => deck.toJson()).toList(),
  };

  String canonicalJson() => jsonEncode(toJson());
}

String titleCase(String value) => value
    .split('_')
    .map(
      (part) =>
          part.isEmpty ? '' : '${part[0].toUpperCase()}${part.substring(1)}',
    )
    .join(' ');
