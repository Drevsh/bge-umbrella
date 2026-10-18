import 'package:flutter/material.dart';

import 'models.dart';

class DeckStats {
  const DeckStats({
    required this.totalCards,
    required this.attacks,
    required this.meleeAttacks,
    required this.rangedAttacks,
    required this.movement,
    required this.powerGeneration,
    required this.cardDraw,
    required this.search,
    required this.defense,
    required this.heal,
    required this.cleanse,
    required this.totalStatus,
    required this.burn,
    required this.slow,
    required this.weak,
    required this.silence,
    required this.elementCounts,
    required this.rarityCounts,
  });

  final int totalCards;

  // Combat Actions
  final int attacks;
  final int meleeAttacks;
  final int rangedAttacks;
  final int movement;

  // Resources & Flow
  final int powerGeneration;
  final int cardDraw;
  final int search;

  // Defense & Sustain
  final int defense;
  final int heal;
  final int cleanse;

  // Status & Control
  final int totalStatus;
  final int burn;
  final int slow;
  final int weak;
  final int silence;

  // Breakdown maps
  final Map<String, int> elementCounts;
  final Map<String, int> rarityCounts;

  static DeckStats compute(Catalog catalog, Deck deck) {
    int total = 0;
    int attacks = 0;
    int melee = 0;
    int ranged = 0;
    int movement = 0;
    int powerGen = 0;
    int draw = 0;
    int search = 0;
    int defense = 0;
    int heal = 0;
    int cleanse = 0;
    int statusTotal = 0;
    int burn = 0;
    int slow = 0;
    int weak = 0;
    int silence = 0;
    final elementCounts = <String, int>{};
    final rarityCounts = <String, int>{};

    final attackRegex = RegExp(
      r'\bAttack\b|\bDeal\s+\d+\s+Damage\b',
      caseSensitive: false,
    );
    final rangedRegex = RegExp(
      r'in (?:any )?range|range \d+',
      caseSensitive: false,
    );
    final moveRegex = RegExp(r'\bMove\b|\bBlink\b', caseSensitive: false);
    final powerRegex = RegExp(
      r'\bGain \d+ Power\b|\bGain Power\b',
      caseSensitive: false,
    );
    final drawRegex = RegExp(
      r'\bdraw \d+ card|\bdraw a card\b|\bdraw 1\b',
      caseSensitive: false,
    );
    final searchRegex = RegExp(r'\bSearch\b', caseSensitive: false);
    final defRegex = RegExp(
      r'\bDefense\b|reduce it to\b',
      caseSensitive: false,
    );
    final healRegex = RegExp(r'\bHeal\b|\bHealed\b', caseSensitive: false);
    final cleanseRegex = RegExp(r'\bCleanse\b', caseSensitive: false);
    final burnRegex = RegExp(r'\bBurn\b', caseSensitive: false);
    final slowRegex = RegExp(r'\bSlow\b', caseSensitive: false);
    final weakRegex = RegExp(r'\bWeak\b', caseSensitive: false);
    final silenceRegex = RegExp(r'\bSilence\b', caseSensitive: false);

    for (final entry in deck.cards.entries) {
      final count = entry.value;
      if (count <= 0) continue;
      total += count;

      final card = catalog.cardsById[entry.key];
      if (card == null) continue;

      final text = card.effects.map((e) => e.text).join(' ');
      final keywords = card.keywords;

      // Combat Actions
      final isAttack = keywords.contains('Attack') || attackRegex.hasMatch(text);
      if (isAttack) {
        attacks += count;
        if (rangedRegex.hasMatch(text)) {
          ranged += count;
        } else {
          melee += count;
        }
      }

      if (keywords.contains('Move') ||
          keywords.contains('Blink') ||
          moveRegex.hasMatch(text)) {
        movement += count;
      }

      // Resources & Flow
      if (powerRegex.hasMatch(text)) {
        powerGen += count;
      }
      if (keywords.contains('Draw') || drawRegex.hasMatch(text)) {
        draw += count;
      }
      if (keywords.contains('Search') || searchRegex.hasMatch(text)) {
        search += count;
      }

      // Defense & Sustain
      if (keywords.contains('Defense') || defRegex.hasMatch(text)) {
        defense += count;
      }
      if (keywords.contains('Heal') || healRegex.hasMatch(text)) {
        heal += count;
      }
      if (keywords.contains('Cleanse') || cleanseRegex.hasMatch(text)) {
        cleanse += count;
      }

      // Status & Control
      final hasBurn = keywords.contains('Burn') || burnRegex.hasMatch(text);
      final hasSlow = keywords.contains('Slow') || slowRegex.hasMatch(text);
      final hasWeak = keywords.contains('Weak') || weakRegex.hasMatch(text);
      final hasSilence =
          keywords.contains('Silence') || silenceRegex.hasMatch(text);

      if (hasBurn) burn += count;
      if (hasSlow) slow += count;
      if (hasWeak) weak += count;
      if (hasSilence) silence += count;
      if (hasBurn || hasSlow || hasWeak || hasSilence) {
        statusTotal += count;
      }

      // Elements & Rarities
      final elem = card.element ?? 'neutral';
      elementCounts[elem] = (elementCounts[elem] ?? 0) + count;
      rarityCounts[card.rarity] = (rarityCounts[card.rarity] ?? 0) + count;
    }

    return DeckStats(
      totalCards: total,
      attacks: attacks,
      meleeAttacks: melee,
      rangedAttacks: ranged,
      movement: movement,
      powerGeneration: powerGen,
      cardDraw: draw,
      search: search,
      defense: defense,
      heal: heal,
      cleanse: cleanse,
      totalStatus: statusTotal,
      burn: burn,
      slow: slow,
      weak: weak,
      silence: silence,
      elementCounts: elementCounts,
      rarityCounts: rarityCounts,
    );
  }
}

Future<void> showDeckStatsSheet(
  BuildContext context,
  Catalog catalog,
  Deck deck,
) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  showDragHandle: true,
  builder: (context) => DeckStatsSheet(catalog: catalog, deck: deck),
);

class DeckStatsSheet extends StatelessWidget {
  const DeckStatsSheet({
    required this.catalog,
    required this.deck,
    super.key,
  });

  final Catalog catalog;
  final Deck deck;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final stats = DeckStats.compute(catalog, deck);

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      minChildSize: 0.4,
      maxChildSize: 0.92,
      builder: (context, scrollController) => Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${deck.name} Stats',
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${stats.totalCards}/16 cards in deck',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: colors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Close',
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: stats.totalCards == 0
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.bar_chart_outlined,
                            size: 56,
                            color: colors.outline,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'No cards in this deck yet',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Add cards to see stats for attacks, movement, energy generation, and status effects.',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: colors.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView(
                    controller: scrollController,
                    padding: EdgeInsets.fromLTRB(
                      16,
                      12,
                      16,
                      24 + MediaQuery.paddingOf(context).bottom,
                    ),
                    children: [
                      _StatGroupCard(
                        title: 'Combat Actions',
                        icon: Icons.sports_kabaddi,
                        accentColor: colors.primary,
                        children: [
                          _StatBar(
                            label: 'Total Attacks',
                            count: stats.attacks,
                            total: stats.totalCards,
                            barColor: colors.primary,
                          ),
                          _StatBar(
                            label: '  • Melee Attacks',
                            count: stats.meleeAttacks,
                            total: stats.totalCards,
                            barColor: colors.primary.withAlpha(200),
                          ),
                          _StatBar(
                            label: '  • Ranged Attacks',
                            count: stats.rangedAttacks,
                            total: stats.totalCards,
                            barColor: colors.primary.withAlpha(200),
                          ),
                          _StatBar(
                            label: 'Movement & Blink',
                            count: stats.movement,
                            total: stats.totalCards,
                            barColor: Colors.teal,
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _StatGroupCard(
                        title: 'Resources & Flow',
                        icon: Icons.bolt,
                        accentColor: Colors.amber.shade800,
                        children: [
                          _StatBar(
                            label: 'Power Generation',
                            count: stats.powerGeneration,
                            total: stats.totalCards,
                            barColor: Colors.amber.shade800,
                          ),
                          _StatBar(
                            label: 'Card Draw',
                            count: stats.cardDraw,
                            total: stats.totalCards,
                            barColor: Colors.indigo,
                          ),
                          _StatBar(
                            label: 'Search',
                            count: stats.search,
                            total: stats.totalCards,
                            barColor: Colors.teal.shade700,
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _StatGroupCard(
                        title: 'Defense & Sustain',
                        icon: Icons.shield_outlined,
                        accentColor: Colors.green.shade700,
                        children: [
                          _StatBar(
                            label: 'Defense & Shields',
                            count: stats.defense,
                            total: stats.totalCards,
                            barColor: Colors.green.shade700,
                          ),
                          _StatBar(
                            label: 'Heal',
                            count: stats.heal,
                            total: stats.totalCards,
                            barColor: Colors.lightGreen.shade700,
                          ),
                          _StatBar(
                            label: 'Cleanse',
                            count: stats.cleanse,
                            total: stats.totalCards,
                            barColor: Colors.cyan.shade700,
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _StatGroupCard(
                        title: 'Status & Control',
                        icon: Icons.auto_awesome,
                        accentColor: Colors.purple.shade700,
                        children: [
                          _StatBar(
                            label: 'Total Status Cards',
                            count: stats.totalStatus,
                            total: stats.totalCards,
                            barColor: Colors.purple.shade700,
                          ),
                          _StatBar(
                            label: '  • Burn',
                            count: stats.burn,
                            total: stats.totalCards,
                            barColor: Colors.deepOrange,
                          ),
                          _StatBar(
                            label: '  • Slow',
                            count: stats.slow,
                            total: stats.totalCards,
                            barColor: Colors.blueGrey,
                          ),
                          _StatBar(
                            label: '  • Weak',
                            count: stats.weak,
                            total: stats.totalCards,
                            barColor: Colors.purple.shade400,
                          ),
                          _StatBar(
                            label: '  • Silence',
                            count: stats.silence,
                            total: stats.totalCards,
                            barColor: Colors.pink.shade700,
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _StatGroupCard(
                        title: 'Element Breakdown',
                        icon: Icons.bubble_chart_outlined,
                        accentColor: colors.secondary,
                        children: [
                          for (final elem in [
                            'neutral',
                            'fire',
                            'water',
                            'earth',
                            'air',
                            'light',
                            'dark',
                          ])
                            if ((stats.elementCounts[elem] ?? 0) > 0)
                              _StatBar(
                                label: titleCase(elem),
                                count: stats.elementCounts[elem] ?? 0,
                                total: stats.totalCards,
                                barColor: _elementColor(elem),
                              ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _StatGroupCard(
                        title: 'Rarity Breakdown',
                        icon: Icons.grade_outlined,
                        accentColor: colors.tertiary,
                        children: [
                          for (final rarity in [
                            'common',
                            'rare',
                            'ultra_rare',
                            'legendary',
                            'mystling_specific',
                          ])
                            if ((stats.rarityCounts[rarity] ?? 0) > 0)
                              _StatBar(
                                label: titleCase(rarity),
                                count: stats.rarityCounts[rarity] ?? 0,
                                total: stats.totalCards,
                                barColor: _rarityColor(rarity),
                              ),
                        ],
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Color _elementColor(String element) {
    switch (element.toLowerCase()) {
      case 'fire':
        return Colors.red.shade600;
      case 'water':
        return Colors.blue.shade600;
      case 'earth':
        return Colors.brown.shade600;
      case 'air':
        return Colors.lightBlue.shade300;
      case 'light':
        return Colors.amber.shade600;
      case 'dark':
        return Colors.deepPurple.shade700;
      default:
        return Colors.grey.shade600;
    }
  }

  Color _rarityColor(String rarity) {
    switch (rarity.toLowerCase()) {
      case 'legendary':
        return Colors.amber.shade700;
      case 'ultra_rare':
        return Colors.purple.shade600;
      case 'rare':
        return Colors.blue.shade600;
      case 'mystling_specific':
        return Colors.teal.shade600;
      default:
        return Colors.grey.shade600;
    }
  }
}

class _StatGroupCard extends StatelessWidget {
  const _StatGroupCard({
    required this.title,
    required this.icon,
    required this.accentColor,
    required this.children,
  });

  final String title;
  final IconData icon;
  final Color accentColor;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: theme.colorScheme.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 20, color: accentColor),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            for (int i = 0; i < children.length; i++) ...[
              if (i > 0) const SizedBox(height: 8),
              children[i],
            ],
          ],
        ),
      ),
    );
  }
}

class _StatBar extends StatelessWidget {
  const _StatBar({
    required this.label,
    required this.count,
    required this.total,
    required this.barColor,
  });

  final String label;
  final int count;
  final int total;
  final Color barColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ratio = total > 0 ? (count / total).clamp(0.0, 1.0) : 0.0;
    final percentage = (ratio * 100).round();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                label,
                style: theme.textTheme.bodyMedium,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              '$count / $total ($percentage%)',
              style: theme.textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: count > 0
                    ? theme.colorScheme.onSurface
                    : theme.colorScheme.outline,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(3),
          child: LinearProgressIndicator(
            value: ratio,
            minHeight: 6,
            color: barColor,
            backgroundColor: theme.colorScheme.surfaceContainerHighest,
          ),
        ),
      ],
    );
  }
}
