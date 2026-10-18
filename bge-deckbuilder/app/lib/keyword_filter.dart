import 'package:flutter/material.dart';

import 'models.dart';

const Map<String, List<String>> keywordTaxonomy = {
  'Combat Actions': [
    'Attack',
    'Move',
    'Blink',
    'Pierce',
    'Trigger',
    'Interrupt',
    'Drain',
    'Resolve',
  ],
  'Status & Conditions': [
    'Slow',
    'Weak',
    'Burn',
    'Silence',
    'Cleanse',
    'Heal',
    'Defense',
  ],
  'Economy & Flow': [
    'Power Ramp',
    'Draw',
    'Discard',
    'Search',
    'Remove from Play',
    'Slot Synergies',
  ],
  'Effect Frames': [
    'Active',
    'Passive',
    'Upgrade',
  ],
  'Elemental Advantages': [
    'Against Air',
    'Against Dark',
    'Against Earth',
    'Against Fire',
    'Against Light',
    'Against Water',
  ],
  'Strategy & Archetypes': [
    'Mobility',
    'Burst Damage',
    'Tank & Sustain',
    'Crowd Control',
    'Card Advantage',
  ],
};

class KeywordFilterState {
  const KeywordFilterState({
    this.selected = const {},
    this.matchAll = true,
  });

  final Set<String> selected;
  final bool matchAll;

  bool get isEmpty => selected.isEmpty;
  bool get isNotEmpty => selected.isNotEmpty;

  KeywordFilterState copyWith({
    Set<String>? selected,
    bool? matchAll,
  }) => KeywordFilterState(
    selected: selected ?? this.selected,
    matchAll: matchAll ?? this.matchAll,
  );

  bool matchesCard(GameCard card) {
    if (selected.isEmpty) return true;
    if (matchAll) {
      return selected.every((kw) => card.keywords.contains(kw));
    }
    return selected.any((kw) => card.keywords.contains(kw));
  }
}

bool cardMatchesSearch(GameCard card, String query) {
  final trimmed = query.trim().toLowerCase();
  if (trimmed.isEmpty) return true;
  final searchableText = '${card.name} ${card.id} ${card.keywords.join(' ')} ${card.effects.map((e) => e.text).join(' ')}'
      .toLowerCase();
  return searchableText.contains(trimmed);
}

Future<KeywordFilterState?> showKeywordFilterSheet(
  BuildContext context,
  KeywordFilterState current,
) => showModalBottomSheet<KeywordFilterState>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  builder: (context) => _KeywordFilterSheetDialog(current: current),
);

class _KeywordFilterSheetDialog extends StatefulWidget {
  const _KeywordFilterSheetDialog({required this.current});
  final KeywordFilterState current;

  @override
  State<_KeywordFilterSheetDialog> createState() =>
      _KeywordFilterSheetDialogState();
}

class _KeywordFilterSheetDialogState extends State<_KeywordFilterSheetDialog> {
  late Set<String> selected;
  late bool matchAll;

  @override
  void initState() {
    super.initState();
    selected = Set<String>.from(widget.current.selected);
    matchAll = widget.current.matchAll;
  }

  void toggleKeyword(String kw) {
    setState(() {
      if (selected.contains(kw)) {
        selected.remove(kw);
      } else {
        selected.add(kw);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) => Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                Text(
                  'Filter by Keywords',
                  style: textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                if (selected.isNotEmpty)
                  TextButton(
                    onPressed: () => setState(() => selected.clear()),
                    child: const Text('Clear all'),
                  ),
                IconButton(
                  icon: const Icon(Icons.close),
                  tooltip: 'Close',
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              children: [
                const Text('Match: ', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('ALL (AND)'),
                  selected: matchAll,
                  onSelected: (val) => setState(() => matchAll = true),
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('ANY (OR)'),
                  selected: !matchAll,
                  onSelected: (val) => setState(() => matchAll = false),
                ),
              ],
            ),
          ),
          const Divider(),
          Expanded(
            child: ListView(
              controller: scrollController,
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              children: [
                for (final entry in keywordTaxonomy.entries) ...[
                  Padding(
                    padding: const EdgeInsets.only(top: 12, bottom: 6),
                    child: Text(
                      entry.key,
                      style: textTheme.titleSmall?.copyWith(
                        color: colors.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  Wrap(
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      for (final kw in entry.value)
                        FilterChip(
                          label: Text(kw),
                          selected: selected.contains(kw),
                          onSelected: (_) => toggleKeyword(kw),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.pop(
                    context,
                    KeywordFilterState(
                      selected: selected,
                      matchAll: matchAll,
                    ),
                  ),
                  child: Text(
                    selected.isEmpty
                        ? 'Apply'
                        : 'Apply (${selected.length} selected)',
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class ActiveKeywordChipsBar extends StatelessWidget {
  const ActiveKeywordChipsBar({
    required this.state,
    required this.onRemove,
    required this.onClearAll,
    super.key,
  });

  final KeywordFilterState state;
  final ValueChanged<String> onRemove;
  final VoidCallback onClearAll;

  @override
  Widget build(BuildContext context) {
    if (state.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Wrap(
        spacing: 6,
        runSpacing: 4,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          Text(
            state.matchAll ? 'Keywords (AND):' : 'Keywords (OR):',
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
          ),
          for (final kw in state.selected)
            InputChip(
              label: Text(kw, style: const TextStyle(fontSize: 12)),
              onDeleted: () => onRemove(kw),
              deleteIcon: const Icon(Icons.close, size: 14),
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              padding: const EdgeInsets.symmetric(horizontal: 4),
            ),
          ActionChip(
            label: const Text('Clear', style: TextStyle(fontSize: 11)),
            onPressed: onClearAll,
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            padding: const EdgeInsets.symmetric(horizontal: 2),
          ),
        ],
      ),
    );
  }
}
