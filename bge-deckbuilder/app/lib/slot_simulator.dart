import 'dart:math';

import 'package:flutter/material.dart';

import 'models.dart';

/// State and logic for Dragon Eclipse's 4-slot action conveyor belt.
class SlotSimulatorModel extends ChangeNotifier {
  SlotSimulatorModel(this.catalog, this.deck, {Random? random})
      : _random = random ?? Random() {
    reset();
  }

  final Catalog catalog;
  final Deck deck;
  final Random _random;

  static const List<int> slotEnergy = [1, 2, 2, 3];

  List<GameCard?> _slots = [null, null, null, null];
  List<GameCard> _drawPile = [];
  final List<GameCard> _discardPile = [];
  int _energy = 0;

  List<GameCard?> get slots => List.unmodifiable(_slots);
  List<GameCard> get drawPile => List.unmodifiable(_drawPile);
  List<GameCard> get discardPile => List.unmodifiable(_discardPile);
  int get energy => _energy;
  int get totalCards => deck.cardCount;

  void reset() {
    _energy = 0;
    _discardPile.clear();
    _slots = [null, null, null, null];

    // Build the draw pile from cards in deck
    final cards = <GameCard>[];
    for (final entry in deck.cards.entries) {
      final card = catalog.cardsById[entry.key];
      if (card != null && entry.value > 0) {
        for (int i = 0; i < entry.value; i++) {
          cards.add(card);
        }
      }
    }
    cards.shuffle(_random);
    _drawPile = cards;

    // Initial deal: Fill starting from rightmost slot (Slot 4 down to Slot 1)
    _refillSlots();
    notifyListeners();
  }

  void playCard(int slotIndex) {
    if (slotIndex < 0 || slotIndex >= 4) return;
    final card = _slots[slotIndex];
    if (card == null) return;

    // 1. Award energy
    _energy += slotEnergy[slotIndex];

    // 2. Move to discard
    _discardPile.add(card);
    _slots[slotIndex] = null;

    // 3. Shift all remaining cards as far right as possible
    final remaining = [for (final c in _slots) ?c];
    final shifted = List<GameCard?>.filled(4, null);
    for (int i = 0; i < remaining.length; i++) {
      shifted[4 - remaining.length + i] = remaining[i];
    }
    _slots = shifted;

    // 4. Refill from deck: Starting from the rightmost still-free slot down to Slot 1
    _refillSlots();

    notifyListeners();
  }

  void _refillSlots() {
    for (int i = 3; i >= 0; i--) {
      if (_slots[i] == null && _drawPile.isNotEmpty) {
        _slots[i] = _drawPile.removeLast();
      }
    }
  }

  void modifyEnergy(int delta) {
    _energy = max(0, _energy + delta);
    notifyListeners();
  }

  void clearEnergy() {
    _energy = 0;
    notifyListeners();
  }

  void recycleDiscard() {
    if (_discardPile.isEmpty) return;
    _drawPile.addAll(_discardPile);
    _discardPile.clear();
    _drawPile.shuffle(_random);
    _refillSlots();
    notifyListeners();
  }
}

Future<void> showSlotSimulator(
  BuildContext context,
  Catalog catalog,
  Deck deck, {
  void Function(BuildContext, GameCard)? onCardDetail,
}) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (context) => SlotSimulatorView(
        catalog: catalog,
        deck: deck,
        onCardDetail: onCardDetail,
      ),
    );

class SlotSimulatorView extends StatefulWidget {
  const SlotSimulatorView({
    required this.catalog,
    required this.deck,
    this.onCardDetail,
    super.key,
  });

  final Catalog catalog;
  final Deck deck;
  final void Function(BuildContext, GameCard)? onCardDetail;

  @override
  State<SlotSimulatorView> createState() => _SlotSimulatorViewState();
}

class _SlotSimulatorViewState extends State<SlotSimulatorView> {
  late SlotSimulatorModel _model;

  @override
  void initState() {
    super.initState();
    _model = SlotSimulatorModel(widget.catalog, widget.deck);
    _model.addListener(_onStateChanged);
  }

  @override
  void dispose() {
    _model.removeListener(_onStateChanged);
    _model.dispose();
    super.dispose();
  }

  void _onStateChanged() => setState(() {});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    if (_model.totalCards == 0) {
      return Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.view_carousel_outlined, size: 56, color: colors.outline),
            const SizedBox(height: 16),
            Text(
              'No cards in ${widget.deck.name}',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Add cards to your deck to run the Action Slot simulator.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Back to Deck Builder'),
            ),
          ],
        ),
      );
    }

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.88,
      minChildSize: 0.5,
      maxChildSize: 0.96,
      builder: (context, scrollController) => Column(
        children: [
          // Header Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 8, 8),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${widget.deck.name} Slot Simulator',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        '4-Slot Conveyor: Shift Right & Refill',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Reset & Reshuffle',
                  icon: const Icon(Icons.refresh),
                  onPressed: () => _model.reset(),
                ),
                IconButton(
                  tooltip: 'Close',
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Dashboard HUD (Energy, Draw pile, Discard pile)
          Container(
            color: colors.surfaceContainerHighest.withAlpha(120),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                // Energy badge & controls
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade800,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.bolt, size: 18, color: Colors.white),
                      const SizedBox(width: 4),
                      Text(
                        '${_model.energy} Energy',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  tooltip: 'Spend 1 Energy',
                  icon: const Icon(Icons.remove_circle_outline, size: 20),
                  onPressed:
                      _model.energy > 0 ? () => _model.modifyEnergy(-1) : null,
                ),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  tooltip: 'Add 1 Energy',
                  icon: const Icon(Icons.add_circle_outline, size: 20),
                  onPressed: () => _model.modifyEnergy(1),
                ),
                const Spacer(),
                // Deck and Discard counts
                Text(
                  'Deck: ${_model.drawPile.length}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(width: 12),
                TextButton(
                  style: TextButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 0),
                  ),
                  onPressed: _model.discardPile.isNotEmpty
                      ? () => _showDiscardSheet(context)
                      : null,
                  child: Text(
                    'Discard: ${_model.discardPile.length}',
                    style: TextStyle(
                      color: _model.discardPile.isNotEmpty
                          ? colors.primary
                          : colors.outline,
                    ),
                  ),
                ),
                if (_model.drawPile.isEmpty && _model.discardPile.isNotEmpty)
                  TextButton.icon(
                    style: TextButton.styleFrom(
                      visualDensity: VisualDensity.compact,
                    ),
                    icon: const Icon(Icons.replay, size: 16),
                    label: const Text('Recycle'),
                    onPressed: () => _model.recycleDiscard(),
                  ),
              ],
            ),
          ),

          // Main 4-Slot Area
          Expanded(
            child: ListView(
              controller: scrollController,
              padding: EdgeInsets.fromLTRB(
                12,
                12,
                12,
                24 + MediaQuery.paddingOf(context).bottom,
              ),
              children: [
                LayoutBuilder(
                  builder: (context, constraints) {
                    final cardWidth = (constraints.maxWidth - 24) / 4;
                    // If screen is wide enough, show 4 columns side by side
                    if (constraints.maxWidth >= 500) {
                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          for (int i = 0; i < 4; i++)
                            Expanded(
                              child: Padding(
                                padding:
                                    EdgeInsets.only(left: i == 0 ? 0 : 8),
                                child: _buildSlotCard(i, cardWidth),
                              ),
                            ),
                        ],
                      );
                    }

                    // On narrower phone screens, show a 2x2 grid or horizontal scroll
                    return SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          for (int i = 0; i < 4; i++)
                            SizedBox(
                              width: 140,
                              child: Padding(
                                padding:
                                    EdgeInsets.only(left: i == 0 ? 0 : 8),
                                child: _buildSlotCard(i, 140),
                              ),
                            ),
                        ],
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSlotCard(int slotIndex, double width) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final card = _model.slots[slotIndex];
    final energyVal = SlotSimulatorModel.slotEnergy[slotIndex];

    return Card(
      elevation: card != null ? 2 : 0,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(
          color: card != null
              ? colors.primary.withAlpha(120)
              : colors.outlineVariant,
          width: card != null ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Slot Header with Energy Badge
          Container(
            color: colors.surfaceContainerHighest,
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Slot ${slotIndex + 1}',
                  style: theme.textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade800,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '+$energyVal⚡',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Card Area
          if (card != null) ...[
            InkWell(
              onTap: () {
                if (widget.onCardDetail != null) {
                  widget.onCardDetail!(context, card);
                }
              },
              child: AspectRatio(
                aspectRatio: 0.72,
                child: Padding(
                  padding: const EdgeInsets.all(4),
                  child: card.imagePath != null
                      ? Image.asset(
                          card.imagePath!,
                          fit: BoxFit.contain,
                          errorBuilder: (_, _, _) => Center(
                            child: Text(
                              card.name,
                              textAlign: TextAlign.center,
                              style: const TextStyle(fontSize: 11),
                            ),
                          ),
                        )
                      : Center(
                          child: Text(
                            card.name,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 11),
                          ),
                        ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(6, 2, 6, 2),
              child: Text(
                card.name,
                style: theme.textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(6, 0, 6, 6),
              child: FilledButton.tonal(
                style: FilledButton.styleFrom(
                  visualDensity: VisualDensity.compact,
                  padding: EdgeInsets.zero,
                  minimumSize: const Size(0, 32),
                ),
                onPressed: () => _model.playCard(slotIndex),
                child: Text('Play (+$energyVal⚡)',
                    style: const TextStyle(fontSize: 12)),
              ),
            ),
          ] else ...[
            const AspectRatio(
              aspectRatio: 0.72,
              child: Center(
                child: Text(
                  'Empty',
                  style: TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ),
            ),
            const SizedBox(height: 38),
          ],
        ],
      ),
    );
  }

  void _showDiscardSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _model.discardPile.length,
        separatorBuilder: (_, _) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final card = _model.discardPile[index];
          return ListTile(
            leading: const Icon(Icons.delete_outline),
            title: Text(card.name),
            subtitle: Text(card.keywords.join(', ')),
          );
        },
      ),
    );
  }
}
