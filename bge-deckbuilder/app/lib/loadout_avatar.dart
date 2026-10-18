import 'package:flutter/material.dart';

import 'models.dart';

/// Clipper for the top-left triangle of a square (0,0) -> (W,0) -> (0,H).
class DiagonalTopLeftClipper extends CustomClipper<Path> {
  const DiagonalTopLeftClipper();

  @override
  Path getClip(Size size) {
    return Path()
      ..moveTo(0, 0)
      ..lineTo(size.width, 0)
      ..lineTo(0, size.height)
      ..close();
  }

  @override
  bool shouldReclip(DiagonalTopLeftClipper oldClipper) => false;
}

/// Clipper for the bottom-right triangle of a square (W,0) -> (W,H) -> (0,H).
class DiagonalBottomRightClipper extends CustomClipper<Path> {
  const DiagonalBottomRightClipper();

  @override
  Path getClip(Size size) {
    return Path()
      ..moveTo(size.width, 0)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
  }

  @override
  bool shouldReclip(DiagonalBottomRightClipper oldClipper) => false;
}

/// Painter that draws a crisp diagonal divider line from (0, H) to (W, 0).
class DiagonalDividerPainter extends CustomPainter {
  const DiagonalDividerPainter(this.color, {this.strokeWidth = 1.5});

  final Color color;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;
    canvas.drawLine(Offset(0, size.height), Offset(size.width, 0), paint);
  }

  @override
  bool shouldRepaint(DiagonalDividerPainter oldDelegate) =>
      oldDelegate.color != color || oldDelegate.strokeWidth != strokeWidth;
}

/// Displays a composite avatar icon for a deck loadout:
/// - Single mystling (Quick Battle): full square icon.
/// - 2 mystlings (Campaign): square split diagonally into two triangles.
/// - 3 mystlings (PvP Challenge): square split into 3 vertical slices,
///   focused on the center strip of each mystling icon.
class LoadoutMystlingAvatar extends StatelessWidget {
  const LoadoutMystlingAvatar({
    required this.catalog,
    required this.loadout,
    this.size = 52.0,
    this.borderRadius = 8.0,
    super.key,
  });

  final Catalog catalog;
  final Loadout loadout;
  final double size;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final dividerColor = colors.outlineVariant.withAlpha(200);

    final mystlings = [
      for (final deck in loadout.decks)
        if (deck.mystlingId != null)
          catalog.mystlingsById[deck.mystlingId]
        else
          null,
    ];

    Widget content;

    if (loadout.mode == LoadoutMode.campaign || mystlings.length == 2) {
      // 2 Mystlings: Diagonal split
      final m1 = mystlings.isNotEmpty ? mystlings[0] : null;
      final m2 = mystlings.length > 1 ? mystlings[1] : null;
      content = Stack(
        fit: StackFit.expand,
        children: [
          ClipPath(
            clipper: const DiagonalTopLeftClipper(),
            child: _buildFullSquare(m1, size, colors),
          ),
          ClipPath(
            clipper: const DiagonalBottomRightClipper(),
            child: _buildFullSquare(m2, size, colors),
          ),
          CustomPaint(
            size: Size(size, size),
            painter: DiagonalDividerPainter(dividerColor),
          ),
        ],
      );
    } else if (loadout.mode == LoadoutMode.challenge || mystlings.length >= 3) {
      // 3 Mystlings: 3 vertical slices (middle third of each icon)
      final m1 = mystlings.isNotEmpty ? mystlings[0] : null;
      final m2 = mystlings.length > 1 ? mystlings[1] : null;
      final m3 = mystlings.length > 2 ? mystlings[2] : null;
      content = Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(child: _buildCenterSlice(m1, size, colors)),
          Container(width: 1, color: dividerColor),
          Expanded(child: _buildCenterSlice(m2, size, colors)),
          Container(width: 1, color: dividerColor),
          Expanded(child: _buildCenterSlice(m3, size, colors)),
        ],
      );
    } else {
      // 1 Mystling: Single icon
      final m = mystlings.isNotEmpty ? mystlings[0] : null;
      content = _buildFullSquare(m, size, colors);
    }

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: colors.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(color: dividerColor),
      ),
      clipBehavior: Clip.antiAlias,
      child: content,
    );
  }

  Widget _buildFullSquare(Mystling? mystling, double size, ColorScheme colors) {
    if (mystling == null) {
      return _buildPlaceholder(colors);
    }
    return Image.asset(
      'images/mystlings/branding/${mystling.id}_icon.jpg',
      width: size,
      height: size,
      fit: BoxFit.cover,
      errorBuilder: (_, _, _) => _buildPlaceholder(colors),
    );
  }

  /// Takes the horizontal center third of the mystling icon so the face is focused.
  Widget _buildCenterSlice(Mystling? mystling, double height, ColorScheme colors) {
    if (mystling == null) {
      return _buildPlaceholder(colors);
    }
    return ClipRect(
      child: OverflowBox(
        minWidth: height,
        maxWidth: height,
        minHeight: height,
        maxHeight: height,
        alignment: Alignment.center,
        child: Image.asset(
          'images/mystlings/branding/${mystling.id}_icon.jpg',
          width: height,
          height: height,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => _buildPlaceholder(colors),
        ),
      ),
    );
  }

  Widget _buildPlaceholder(ColorScheme colors) {
    return ColoredBox(
      color: colors.surfaceContainerHighest,
      child: Center(
        child: Icon(
          Icons.pets,
          size: size * 0.45,
          color: colors.onSurfaceVariant.withAlpha(120),
        ),
      ),
    );
  }
}
