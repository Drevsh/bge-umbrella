import 'package:flutter/material.dart';

import 'models.dart';

Color _elementColor(String? element) => switch (element) {
  'light' => const Color(0xffdba928),
  'dark' => const Color(0xff8556b8),
  'fire' => const Color(0xffdc3f36),
  'water' => const Color(0xff368cc5),
  'earth' => const Color(0xff5e9b54),
  'air' => const Color(0xff41a6a0),
  _ => const Color(0xffb49762),
};

SliverGridDelegateWithFixedCrossAxisCount cardGridDelegate(
  double width, {
  bool hasControls = false,
}) {
  const padding = 24.0;
  const spacing = 12.0;
  final columns = width < 600 ? 2 : (width / 210).floor().clamp(2, 6);
  final tileWidth = (width - padding - spacing * (columns - 1)) / columns;
  return SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: columns,
    crossAxisSpacing: spacing,
    mainAxisSpacing: spacing,
    mainAxisExtent: tileWidth / 0.72 + (hasControls ? 38 : 0),
  );
}

class CardGridTile extends StatelessWidget {
  const CardGridTile({
    required this.card,
    required this.onOpen,
    this.quantity,
    this.onAdd,
    this.onRemove,
    this.addDisabledReason,
    this.note,
    super.key,
  });

  final GameCard card;
  final VoidCallback onOpen;
  final int? quantity;
  final VoidCallback? onAdd;
  final VoidCallback? onRemove;
  final String? addDisabledReason;
  final String? note;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final accent = _elementColor(card.element);
    return Card(
      clipBehavior: Clip.antiAlias,
      margin: EdgeInsets.zero,
      elevation: quantity != null && quantity! > 0 ? 3 : 1,
      shadowColor: accent.withValues(alpha: 0.2),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
          color: quantity != null && quantity! > 0
              ? accent
              : accent.withValues(alpha: 0.42),
          width: quantity != null && quantity! > 0 ? 2 : 1,
        ),
      ),
      child: Column(
        children: [
          Expanded(
            child: InkWell(
              onTap: onOpen,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Padding(
                    padding: const EdgeInsets.all(5),
                    child: card.imagePath == null
                        ? ColoredBox(
                            color: accent.withValues(alpha: 0.12),
                            child: Center(
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Text(
                                  card.name,
                                  textAlign: TextAlign.center,
                                  style: Theme.of(context).textTheme.titleMedium
                                      ?.copyWith(
                                        color: colors.onSurface,
                                        fontWeight: FontWeight.w700,
                                      ),
                                ),
                              ),
                            ),
                          )
                        : Image.asset(
                            card.imagePath!,
                            fit: BoxFit.contain,
                            errorBuilder: (_, _, _) => Center(
                              child: Text(
                                card.name,
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ),
                  ),
                ],
              ),
            ),
          ),
          if (quantity != null)
            SizedBox(
              height: 34,
              child: Row(
                children: [
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                      minWidth: 32,
                      minHeight: 32,
                    ),
                    iconSize: 18,
                    tooltip: 'Remove ${card.name}',
                    icon: const Icon(Icons.remove_circle_outline),
                    onPressed: onRemove,
                  ),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '$quantity',
                          style: Theme.of(context).textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        if (note != null)
                          Text(
                            note!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 9),
                          ),
                      ],
                    ),
                  ),
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                      minWidth: 32,
                      minHeight: 32,
                    ),
                    iconSize: 18,
                    tooltip: addDisabledReason ?? 'Add ${card.name}',
                    icon: const Icon(Icons.add_circle_outline),
                    onPressed: addDisabledReason == null ? onAdd : null,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
