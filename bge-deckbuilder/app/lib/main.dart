import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'models.dart';
import 'card_grid.dart';
import 'deck_stats.dart';
import 'keyword_filter.dart';
import 'loadout_avatar.dart';
import 'rules.dart';
import 'settings_view.dart';
import 'slot_simulator.dart';
import 'storage.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final catalog = Catalog.fromJson(
    jsonDecode(await rootBundle.loadString('data/catalog.json'))
        as Map<String, dynamic>,
  );
  final store = await LocalStore.open();
  final settings = await store.readSettings();
  runApp(
    DragonEclipseApp(catalog: catalog, store: store, initialSettings: settings),
  );
}

class DragonEclipseApp extends StatefulWidget {
  const DragonEclipseApp({
    required this.catalog,
    required this.store,
    required this.initialSettings,
    super.key,
  });

  final Catalog catalog;
  final LocalStore store;
  final AppSettings initialSettings;

  @override
  State<DragonEclipseApp> createState() => _DragonEclipseAppState();
}

class _DragonEclipseAppState extends State<DragonEclipseApp> {
  late AppSettings _settings;

  @override
  void initState() {
    super.initState();
    _settings = widget.initialSettings;
  }

  void _onSettingsChanged(AppSettings newSettings) {
    setState(() => _settings = newSettings);
  }

  @override
  Widget build(BuildContext context) {
    const ink = Color(0xff273846);
    const teal = Color(0xff16879a);
    const parchment = Color(0xfffff9ec);
    const gold = Color(0xffd99b32);

    final lightTheme = ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: teal,
        primary: teal,
        secondary: gold,
        tertiary: const Color(0xff4e9d67),
        surface: parchment,
        brightness: Brightness.light,
      ),
      scaffoldBackgroundColor: const Color(0xfff5f0e2),
      appBarTheme: const AppBarTheme(
        backgroundColor: teal,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 20,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.2,
        ),
      ),
      cardTheme: CardThemeData(
        color: parchment,
        elevation: 1,
        shadowColor: ink.withValues(alpha: 0.12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xffe8d7ae)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 13,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xffdfcfaa)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xffdfcfaa)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: teal, width: 2),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: const Color(0xfffffdf7),
        selectedColor: const Color(0xffd9f0e9),
        side: const BorderSide(color: Color(0xffdfcfaa)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        labelStyle: const TextStyle(color: ink),
        secondaryLabelStyle: const TextStyle(
          color: teal,
          fontWeight: FontWeight.w700,
        ),
      ),
      textTheme: ThemeData.light().textTheme.apply(
        bodyColor: ink,
        displayColor: ink,
      ),
      useMaterial3: true,
    );

    final darkTheme = ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: teal,
        primary: const Color(0xff45b0c4),
        secondary: const Color(0xfff0b85a),
        tertiary: const Color(0xff6cc287),
        surface: const Color(0xff1e2933),
        brightness: Brightness.dark,
      ),
      scaffoldBackgroundColor: const Color(0xff12181f),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xff162029),
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 20,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.2,
        ),
      ),
      cardTheme: CardThemeData(
        color: const Color(0xff1e2933),
        elevation: 1,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xff2d3d4b)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xff1e2933),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 13,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xff2d3d4b)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xff2d3d4b)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xff45b0c4), width: 2),
        ),
      ),
      useMaterial3: true,
    );

    return MaterialApp(
      title: 'Dragon Eclipse',
      theme: lightTheme,
      darkTheme: darkTheme,
      themeMode: _settings.themeMode,
      home: Home(
        widget.catalog,
        widget.store,
        settings: _settings,
        onSettingsChanged: _onSettingsChanged,
      ),
    );
  }
}

void cardDetail(
  BuildContext context,
  GameCard card, {
  ValueChanged<String>? onKeywordTap,
}) => showDialog<void>(
  context: context,
  builder: (context) => AlertDialog(
    title: Text(card.name),
    content: SizedBox(
      width: 420,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (card.imagePath != null) Image.asset(card.imagePath!),
            Text(
              '${card.id} • ${titleCase(card.element ?? 'neutral')} • ${titleCase(card.rarity)}',
            ),
            Text(
              'Source: ${titleCase(card.source)} • Base-game copies: ${card.copiesInBaseGame}',
            ),
            if (card.keywords.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text('Keywords:', style: Theme.of(context).textTheme.labelLarge),
              const SizedBox(height: 4),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  for (final kw in card.keywords)
                    ActionChip(
                      label: Text(kw),
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      onPressed: onKeywordTap == null
                          ? null
                          : () {
                              Navigator.pop(context);
                              onKeywordTap(kw);
                            },
                    ),
                ],
              ),
            ],
            for (final effect in card.effects)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text('${titleCase(effect.type)}: ${effect.text}'),
              ),
          ],
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Close'),
      ),
    ],
  ),
);

Widget elementFilterLabel(String value) {
  if (value == 'all') {
    return const Text('All Elements');
  }
  if (value == 'neutral') {
    return const Text('Neutral');
  }
  return Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Image.asset(
        'assets/element_icons/$value.png',
        width: 20,
        height: 20,
        fit: BoxFit.contain,
      ),
      const SizedBox(width: 8),
      Text(titleCase(value)),
    ],
  );
}

void mystlingDetail(
  BuildContext context,
  Mystling item, {
  LoadoutMode? mode,
}) => showDialog<void>(
  context: context,
  builder: (context) => AlertDialog(
    title: Text(item.name),
    content: SizedBox(
      width: 420,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Main: ${titleCase(item.mainElement)}${item.subtypeLimits.isEmpty ? '' : ' • Subtypes: ${item.subtypeDescription}'}',
            ),
            if ((mode != null && mode != LoadoutMode.campaign ||
                    item.statCardImagePath == null) &&
                item.pvpStatCard != null) ...[
              Text(
                'PvP stats • ${item.pvpStatCard!['cardId']}',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Image.asset(item.pvpStatCard!['imagePath'] as String),
              Text(
                (item.pvpStatCard!['stats'] as Map<String, dynamic>).entries
                    .map((e) => '${titleCase(e.key)} ${e.value}')
                    .join(' • '),
              ),
              if ((item.pvpStatCard!['resourceCaps'] as Map<String, dynamic>)
                  .isNotEmpty)
                Text(
                  'Resource caps: ${(item.pvpStatCard!['resourceCaps'] as Map<String, dynamic>).entries.map((e) => '${titleCase(e.key)} ${e.value}').join(' • ')}',
                ),
            ],
            if (item.statCardImagePath != null) ...[
              Text('PvE stats', style: Theme.of(context).textTheme.titleMedium),
              Image.asset(item.statCardImagePath!),
            ],
            if (item.stats != null)
              Text(
                item.stats!.entries
                    .map((e) => '${titleCase(e.key)} ${e.value}')
                    .join(' • '),
              ),
            if (item.resourceCaps != null && item.resourceCaps!.isNotEmpty)
              Text(
                'Resource caps: ${item.resourceCaps!.entries.map((e) => '${titleCase(e.key)} ${e.value}').join(' • ')}',
              ),
            if ((mode == LoadoutMode.campaign || mode == null) &&
                item.statCardImagePath != null &&
                item.pvpStatCard != null) ...[
              Text(
                'PvP stats • ${item.pvpStatCard!['cardId']}',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Image.asset(item.pvpStatCard!['imagePath'] as String),
              Text(
                (item.pvpStatCard!['stats'] as Map<String, dynamic>).entries
                    .map((e) => '${titleCase(e.key)} ${e.value}')
                    .join(' • '),
              ),
            ],
            if (item.specialAbility != null) ...[
              Text('Special ability ${item.specialAbility!['cardId']}'),
              Image.asset(item.specialAbility!['imagePath'] as String),
              for (final action in item.specialAbility!['bonusActions'] as List)
                Text(
                  '${action['name']} (${action['powerCost']} Power): ${action['effect']}',
                ),
            ],
          ],
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Close'),
      ),
    ],
  ),
);

void bonusDetail(
  BuildContext context,
  Catalog catalog, {
  Mystling? mystling,
}) => showDialog<void>(
  context: context,
  builder: (context) {
    final elemental = (catalog.bonusActions['elemental'] as List).where((a) {
      if (mystling == null) return true;
      return a['element'] == mystling.mainElement;
    }).toList();
    final specialActions =
        mystling?.specialAbility?['bonusActions'] as List? ?? const [];
    final specialCardId = mystling?.specialAbility?['cardId'] as String?;
    final specialImage = mystling?.specialAbility?['imagePath'] as String?;

    return AlertDialog(
      title: Text(
        mystling == null
            ? 'Bonus actions'
            : '${mystling.name} bonus actions & abilities',
      ),
      content: SizedBox(
        width: 420,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Once per turn per action. These do not count toward a deck.',
              ),
              const SizedBox(height: 12),
              Text(
                'Shared bonus actions',
                style: Theme.of(context).textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              for (final action in catalog.bonusActions['shared'] as List)
                ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    '${action['name']} • ${action['powerCost']} Power',
                  ),
                  subtitle: Text('${action['effect']}'),
                ),
              const Divider(),
              Text(
                mystling == null
                    ? 'Elemental bonus actions'
                    : '${titleCase(mystling.mainElement)} bonus action',
                style: Theme.of(context).textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              for (final action in elemental)
                ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    '${action['name']}${mystling == null ? ' (${titleCase(action['element'])})' : ''} • ${action['powerCost']} Power',
                  ),
                  subtitle: Text('${action['effect']}'),
                  trailing: action['imagePath'] == null
                      ? null
                      : IconButton(
                          icon: const Icon(Icons.image_outlined, size: 20),
                          tooltip: 'Reference card',
                          onPressed: () => showDialog<void>(
                            context: context,
                            builder: (context) => AlertDialog(
                              content: Image.asset(
                                action['imagePath'] as String,
                              ),
                            ),
                          ),
                        ),
                ),
              if (mystling != null) ...[
                const Divider(),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        specialCardId == null
                            ? 'Special ability'
                            : 'Special ability ($specialCardId)',
                        style: Theme.of(context).textTheme.titleSmall
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                    ),
                    if (specialImage != null)
                      IconButton(
                        icon: const Icon(Icons.image_outlined, size: 20),
                        tooltip: 'Ability card',
                        onPressed: () => showDialog<void>(
                          context: context,
                          builder: (context) =>
                              AlertDialog(content: Image.asset(specialImage)),
                        ),
                      ),
                  ],
                ),
                if (specialActions.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 4),
                    child: Text(
                      'No scanned ability card available yet.',
                      style: TextStyle(fontStyle: FontStyle.italic),
                    ),
                  )
                else
                  for (final action in specialActions)
                    ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      title: Text(
                        '${action['name']} • ${action['powerCost']} Power',
                      ),
                      subtitle: Text('${action['effect']}'),
                    ),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Close'),
        ),
      ],
    );
  },
);

class _RenameDialog extends StatefulWidget {
  const _RenameDialog({required this.initial});
  final String initial;

  @override
  State<_RenameDialog> createState() => _RenameDialogState();
}

class _RenameDialogState extends State<_RenameDialog> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initial);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final text = _controller.text.trim();
    if (text.isNotEmpty) {
      Navigator.pop(context, text);
    }
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Name'),
    content: TextField(
      controller: _controller,
      autofocus: true,
      maxLength: 80,
      onSubmitted: (_) => _submit(),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: _submit,
        child: const Text('Save'),
      ),
    ],
  );
}

Future<void> rename(
  BuildContext context,
  String initial,
  ValueChanged<String> save,
) async {
  final value = await showDialog<String>(
    context: context,
    builder: (context) => _RenameDialog(initial: initial),
  );
  if (value != null && value.isNotEmpty) save(value);
}

class Home extends StatefulWidget {
  const Home(
    this.catalog,
    this.store, {
    this.settings = const AppSettings(),
    this.onSettingsChanged,
    this.initialItems,
    super.key,
  });
  final Catalog catalog;
  final LocalStore store;
  final AppSettings settings;
  final ValueChanged<AppSettings>? onSettingsChanged;
  final List<Loadout>? initialItems;
  @override
  State<Home> createState() => _HomeState();
}

class _HomeState extends State<Home> {
  List<Loadout> items = [];
  String? error;
  Future<void> pending = Future.value();
  @override
  void initState() {
    super.initState();
    if (widget.initialItems != null) {
      items = List.of(widget.initialItems!);
    } else {
      widget.store
          .read()
          .then((data) {
            if (mounted) setState(() => items = data);
          })
          .catchError((Object e) {
            if (mounted) setState(() => error = e.toString());
          });
    }
  }

  void save() {
    setState(() {});
    pending = pending
        .then((_) => widget.store.write(items, widget.catalog.schemaVersion))
        .catchError((Object e) {
          if (mounted) setState(() => error = 'Save failed: $e');
        });
  }

  void open(Loadout item) => Navigator.push(
    context,
    MaterialPageRoute<void>(builder: (_) => Editor(widget.catalog, item, save)),
  ).then((_) => setState(() {}));
  Future<void> create() async {
    final mode = await showModalBottomSheet<LoadoutMode>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final mode in LoadoutMode.values)
              ListTile(
                title: Text(mode.label),
                subtitle: Text('${mode.deckCount} deck(s)'),
                onTap: () => Navigator.pop(context, mode),
              ),
          ],
        ),
      ),
    );
    if (mode == null) return;
    final item = Loadout.create(mode);
    items.add(item);
    save();
    open(item);
  }

  Future<void> remove(Loadout item) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete loadout?'),
        content: Text(item.name),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok == true) {
      items.remove(item);
      save();
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Dragon Eclipse'),
      actions: [
        IconButton(
          tooltip: 'Catalog',
          icon: const Icon(Icons.menu_book),
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute<void>(
              builder: (_) => CatalogView(widget.catalog),
            ),
          ),
        ),
        IconButton(
          tooltip: 'Transfer',
          icon: const Icon(Icons.import_export),
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute<void>(
              builder: (_) =>
                  Transfer(widget.catalog, widget.store, items, save),
            ),
          ),
        ),
        IconButton(
          tooltip: 'Settings',
          icon: const Icon(Icons.settings_outlined),
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute<void>(
              builder: (_) => SettingsView(
                catalog: widget.catalog,
                store: widget.store,
                settings: widget.settings,
                onSettingsChanged: widget.onSettingsChanged ?? (_) {},
              ),
            ),
          ),
        ),
      ],
    ),
    floatingActionButton: FloatingActionButton.extended(
      onPressed: create,
      label: const Text('New loadout'),
      icon: const Icon(Icons.add),
    ),
    body: ListView(
      padding: EdgeInsets.fromLTRB(
        16,
        16,
        16,
        80 + MediaQuery.paddingOf(context).bottom,
      ),
      children: [
        if (widget.catalog.status == 'partial')
          const Card(
            child: Padding(
              padding: EdgeInsets.all(12),
              child: Text(
                'Catalog is partial. Missing cards and Mystling details may affect deck choices and warnings.',
              ),
            ),
          ),
        if (error != null)
          Text(
            error!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        if (items.isEmpty)
          const Padding(
            padding: EdgeInsets.all(48),
            child: Text('Create a campaign pair or PvP lineup to begin.'),
          ),
        for (final item in items)
          Builder(
            builder: (context) {
              final warnings = validateLoadout(widget.catalog, item);
              final theme = Theme.of(context);
              final colors = theme.colorScheme;
              return Card(
                child: ListTile(
                  leading: LoadoutMystlingAvatar(
                    catalog: widget.catalog,
                    loadout: item,
                  ),
                  title: Text(item.name),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '${item.mode.label} • ${item.decks.map((deck) => '${deck.cardCount}/16').join(' / ')} cards',
                        style: theme.textTheme.bodyMedium?.copyWith(
                              color: colors.onSurfaceVariant,
                            ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        item.decks.map((deck) {
                          final mystling =
                              widget.catalog.mystlingsById[deck.mystlingId];
                          return mystling?.name ?? 'No Mystling';
                        }).join(' • '),
                        style: theme.textTheme.bodySmall?.copyWith(
                              color: colors.onSurfaceVariant,
                            ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                  onTap: () => open(item),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (warnings.isNotEmpty)
                        Tooltip(
                          message:
                              '${warnings.length} warning${warnings.length == 1 ? '' : 's'}',
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 7,
                              vertical: 3,
                            ),
                            margin: const EdgeInsets.only(right: 4),
                            decoration: BoxDecoration(
                              color: colors.errorContainer,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.warning_amber_rounded,
                                  size: 15,
                                  color: colors.onErrorContainer,
                                ),
                                const SizedBox(width: 3),
                                Text(
                                  '${warnings.length}',
                                  style: TextStyle(
                                    color: colors.onErrorContainer,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      IconButton(
                        tooltip: 'Delete',
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () => remove(item),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
      ],
    ),
  );
}

class Editor extends StatefulWidget {
  const Editor(this.catalog, this.item, this.onChanged, {super.key});
  final Catalog catalog;
  final Loadout item;
  final VoidCallback onChanged;
  @override
  State<Editor> createState() => _EditorState();
}

class _EditorState extends State<Editor> {
  int selected = 0;
  String query = '', element = 'all', rarity = 'all';
  bool selectedOnly = false;
  bool otherMystlings = false, experimental = false;
  KeywordFilterState keywordFilter = const KeywordFilterState();
  void change(VoidCallback action) {
    setState(action);
    widget.onChanged();
  }

  @override
  Widget build(BuildContext context) {
    final deck = widget.item.decks[selected];
    final mystling = widget.catalog.mystlingsById[deck.mystlingId];
    final warnings = validateLoadout(
      widget.catalog,
      widget.item,
    ).where((w) => w.deckIndex == null || w.deckIndex == selected).toList();
    final cards =
        widget.catalog.cards
            .where(
              (card) =>
                  (!selectedOnly || deck.cards.containsKey(card.id)) &&
                  (selectedOnly ||
                      isCardAvailableForDeck(
                        card,
                        mystling,
                        otherMystlings: otherMystlings,
                        experimental: experimental,
                      )) &&
                  (element == 'all' ||
                      (card.element ?? 'neutral') == element) &&
                  (rarity == 'all' || card.rarity == rarity) &&
                  keywordFilter.matchesCard(card) &&
                  cardMatchesSearch(card, query),
            )
            .toList()
          ..sort((a, b) => compareCardsForDeck(a, b, mystlingId: mystling?.id));
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.item.name),
        actions: [
          IconButton(
            tooltip: 'Rename deck',
            icon: const Icon(Icons.edit),
            onPressed: () => rename(
              context,
              widget.item.name,
              (value) => change(() {
                widget.item.name = value;
                for (final d in widget.item.decks) {
                  d.name = value;
                }
              }),
            ),
          ),
          IconButton(
            tooltip: 'Bonus actions',
            icon: const Icon(Icons.bolt),
            onPressed: () =>
                bonusDetail(context, widget.catalog, mystling: mystling),
          ),
        ],
      ),
      body: Column(
        children: [
          if (widget.item.decks.length > 1)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (var i = 0; i < widget.item.decks.length; i++)
                    Builder(
                      builder: (context) {
                        final d = widget.item.decks[i];
                        final m = widget.catalog.mystlingsById[d.mystlingId];
                        final label = m?.name ?? 'Deck ${i + 1}';
                        return Padding(
                          padding: const EdgeInsets.all(4),
                          child: ChoiceChip(
                            label: Text(
                              '$label ${d.cardCount}/16',
                            ),
                            selected: i == selected,
                            onSelected: (_) => setState(() => selected = i),
                          ),
                        );
                      },
                    ),
                ],
              ),
            ),
          Expanded(
            child: LayoutBuilder(
              builder: (context, constraints) => CustomScrollView(
                slivers: [
                  SliverPadding(
                    padding: const EdgeInsets.all(12),
                    sliver: SliverList.list(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                key: ValueKey(deck.id),
                                isExpanded: true,
                                initialValue: deck.mystlingId,
                                decoration: const InputDecoration(
                                  labelText: 'Mystling',
                                  border: OutlineInputBorder(),
                                ),
                                items: [
                                  for (final item in widget.catalog.mystlings)
                                    DropdownMenuItem(
                                      value: item.id,
                                      child: Row(
                                        children: [
                                          Image.asset(
                                            'assets/element_icons/${item.mainElement.toLowerCase()}.png',
                                            width: 22,
                                            height: 22,
                                            fit: BoxFit.contain,
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              item.name,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                ],
                                onChanged: (value) =>
                                    change(() => deck.mystlingId = value),
                              ),
                            ),
                            if (mystling != null)
                              IconButton(
                                tooltip: '${mystling.name} details',
                                icon: const Icon(Icons.info_outline),
                                onPressed: () => mystlingDetail(
                                  context,
                                  mystling,
                                  mode: widget.item.mode,
                                ),
                              ),
                          ],
                        ),
                        if (mystling != null &&
                            mystling.subtypeLimits.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              'Subtypes: ${mystling.subtypeDescription}',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ),
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            children: [
                              Expanded(
                                child: Wrap(
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  spacing: 4,
                                  runSpacing: 4,
                                  children: [
                                    Text(
                                      '${deck.cardCount}/16 cards',
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium,
                                    ),
                                    if (warnings.isNotEmpty) ...[
                                      Text(
                                        '•',
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleMedium,
                                      ),
                                      PopupMenuButton<void>(
                                        tooltip: 'View rule warnings',
                                        constraints: const BoxConstraints(
                                          minWidth: 260,
                                          maxWidth: 360,
                                        ),
                                        itemBuilder: (context) => [
                                          for (final warning in warnings)
                                            PopupMenuItem<void>(
                                              enabled: false,
                                              child: Row(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.start,
                                                children: [
                                                  Icon(
                                                    Icons.warning_amber_rounded,
                                                    color: Theme.of(context)
                                                        .colorScheme
                                                        .error,
                                                    size: 18,
                                                  ),
                                                  const SizedBox(width: 8),
                                                  Expanded(
                                                    child: Text(
                                                      warning.message,
                                                      style: TextStyle(
                                                        color: Theme.of(context)
                                                            .colorScheme
                                                            .onSurface,
                                                        fontSize: 13,
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                        ],
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(
                                              '${warnings.length} ${warnings.length == 1 ? 'warning' : 'warnings'}',
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .titleMedium
                                                  ?.copyWith(
                                                    color: Theme.of(context)
                                                        .colorScheme
                                                        .error,
                                                    decoration: TextDecoration
                                                        .underline,
                                                    decorationStyle:
                                                        TextDecorationStyle
                                                            .dotted,
                                                  ),
                                            ),
                                            const SizedBox(width: 4),
                                            Icon(
                                              Icons.warning_amber_rounded,
                                              size: 18,
                                              color: Theme.of(context)
                                                  .colorScheme
                                                  .error,
                                            ),
                                          ],
                                        ),
                                      ),
                                    ] else ...[
                                      Text(
                                        '• 0 warnings',
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleMedium
                                            ?.copyWith(
                                              color: Theme.of(context)
                                                  .colorScheme
                                                  .outline,
                                            ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              IconButton(
                                visualDensity: VisualDensity.compact,
                                tooltip: 'Action slot simulator',
                                icon: const Icon(Icons.view_carousel_outlined),
                                onPressed: () => showSlotSimulator(
                                  context,
                                  widget.catalog,
                                  deck,
                                  onCardDetail: (ctx, card) =>
                                      cardDetail(ctx, card),
                                ),
                              ),
                              IconButton(
                                visualDensity: VisualDensity.compact,
                                tooltip: 'Deck statistics',
                                icon: const Icon(Icons.bar_chart_outlined),
                                onPressed: () => showDeckStatsSheet(
                                  context,
                                  widget.catalog,
                                  deck,
                                ),
                              ),
                              IconButton(
                                visualDensity: VisualDensity.compact,
                                tooltip: 'Remove all cards',
                                icon: const Icon(Icons.delete_sweep_outlined),
                                onPressed: deck.cardCount == 0
                                    ? null
                                    : () async {
                                        final confirm = await showDialog<bool>(
                                          context: context,
                                          builder: (context) => AlertDialog(
                                            title: const Text(
                                              'Remove all cards?',
                                            ),
                                            content: const Text(
                                              'Are you sure you want to remove all cards from this deck?',
                                            ),
                                            actions: [
                                              TextButton(
                                                onPressed: () =>
                                                    Navigator.of(context)
                                                        .pop(false),
                                                child: const Text('Cancel'),
                                              ),
                                              FilledButton(
                                                onPressed: () =>
                                                    Navigator.of(context)
                                                        .pop(true),
                                                child: const Text('Remove all'),
                                              ),
                                            ],
                                          ),
                                        );
                                        if (confirm == true) {
                                          change(() => deck.cards.clear());
                                        }
                                      },
                              ),
                            ],
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: LinearProgressIndicator(
                              minHeight: 7,
                              value: (deck.cardCount / 16).clamp(0.0, 1.0),
                              backgroundColor: const Color(0xffe7dcc3),
                            ),
                          ),
                        ),
                        if (mystling == null && !experimental)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 8),
                            child: Text(
                              'Choose a Mystling to see its eligible cards.',
                            ),
                          ),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                decoration: const InputDecoration(
                                  prefixIcon: Icon(Icons.search),
                                  labelText: 'Search cards',
                                ),
                                onChanged: (value) =>
                                    setState(() => query = value),
                              ),
                            ),
                            const SizedBox(width: 8),
                            OutlinedButton.icon(
                              icon: const Icon(Icons.filter_list),
                              label: Text(
                                keywordFilter.isEmpty
                                    ? 'Keywords'
                                    : 'Keywords (${keywordFilter.selected.length})',
                              ),
                              onPressed: () async {
                                final updated = await showKeywordFilterSheet(
                                  context,
                                  keywordFilter,
                                );
                                if (updated != null) {
                                  setState(() => keywordFilter = updated);
                                }
                              },
                            ),
                          ],
                        ),
                        ActiveKeywordChipsBar(
                          state: keywordFilter,
                          onRemove: (kw) => setState(
                            () => keywordFilter = keywordFilter.copyWith(
                              selected: Set<String>.from(keywordFilter.selected)
                                ..remove(kw),
                            ),
                          ),
                          onClearAll: () => setState(
                            () => keywordFilter = keywordFilter.copyWith(
                              selected: {},
                            ),
                          ),
                        ),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: [
                              DropdownButton<String>(
                                value: element,
                                items: [
                                  for (final value in [
                                    'all',
                                    'neutral',
                                    'air',
                                    'dark',
                                    'earth',
                                    'fire',
                                    'light',
                                    'water',
                                  ])
                                    DropdownMenuItem(
                                      value: value,
                                      child: elementFilterLabel(value),
                                    ),
                                ],
                                onChanged: (value) =>
                                    setState(() => element = value!),
                              ),
                              const SizedBox(width: 12),
                              DropdownButton<String>(
                                value: rarity,
                                items: [
                                  for (final value in [
                                    'all',
                                    'common',
                                    'rare',
                                    'ultra_rare',
                                    'legendary',
                                    'mystling_specific',
                                  ])
                                    DropdownMenuItem(
                                      value: value,
                                      child: Text(
                                        value == 'all'
                                            ? 'All Rarities'
                                            : titleCase(value),
                                      ),
                                    ),
                                ],
                                onChanged: (value) =>
                                    setState(() => rarity = value!),
                              ),
                            ],
                          ),
                        ),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: [
                              FilterChip(
                                showCheckmark: false,
                                label: const Text('Selected'),
                                selected: selectedOnly,
                                onSelected: (value) =>
                                    setState(() => selectedOnly = value),
                              ),
                              const SizedBox(width: 8),
                              FilterChip(
                                showCheckmark: false,
                                label: const Text('Other Mystlings'),
                                selected: otherMystlings,
                                onSelected: (value) =>
                                    setState(() => otherMystlings = value),
                              ),
                              const SizedBox(width: 8),
                              FilterChip(
                                showCheckmark: false,
                                label: const Text('Experimental Mode'),
                                selected: experimental,
                                onSelected: (value) =>
                                    setState(() => experimental = value),
                              ),
                            ],
                          ),
                        ),
                        if (experimental)
                          const Text(
                            'All cards are available; rule warnings still apply.',
                          ),
                        if (cards.isEmpty)
                          const Padding(
                            padding: EdgeInsets.all(24),
                            child: Center(
                              child: Text('No cards match these filters.'),
                            ),
                          ),
                      ],
                    ),
                  ),
                  SliverPadding(
                    padding: EdgeInsets.fromLTRB(
                      12,
                      0,
                      12,
                      32 + MediaQuery.paddingOf(context).bottom,
                    ),
                    sliver: SliverGrid.builder(
                      gridDelegate: cardGridDelegate(
                        constraints.maxWidth,
                        hasControls: true,
                      ),
                      itemCount: cards.length,
                      itemBuilder: (context, index) {
                        final card = cards[index];
                        final reason = cannotAddCard(
                          widget.catalog,
                          widget.item,
                          deck,
                          card,
                          otherMystlings: otherMystlings,
                          experimental: experimental,
                        );
                        return CardGridTile(
                          key: ValueKey(card.id),
                          card: card,
                          quantity: deck.cards[card.id] ?? 0,
                          note: card.mystlingId == null
                              ? null
                              : widget
                                        .catalog
                                        .mystlingsById[card.mystlingId]
                                        ?.name ??
                                    card.mystlingId,
                          addDisabledReason: reason,
                          onOpen: () => cardDetail(
                            context,
                            card,
                            onKeywordTap: (kw) => setState(
                              () => keywordFilter = keywordFilter.copyWith(
                                selected: {...keywordFilter.selected, kw},
                              ),
                            ),
                          ),
                          onRemove: (deck.cards[card.id] ?? 0) == 0
                              ? null
                              : () =>
                                    change(() => deck.changeCard(card.id, -1)),
                          onAdd: () =>
                              change(() => deck.changeCard(card.id, 1)),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class CatalogView extends StatefulWidget {
  const CatalogView(this.catalog, {super.key});
  final Catalog catalog;
  @override
  State<CatalogView> createState() => _CatalogViewState();
}

class _CatalogViewState extends State<CatalogView> {
  String query = '',
      element = 'all',
      rarity = 'all',
      source = 'all',
      mystling = 'all';
  KeywordFilterState keywordFilter = const KeywordFilterState();
  @override
  Widget build(BuildContext context) {
    final cards =
        widget.catalog.cards
            .where(
              (card) =>
                  (element == 'all' ||
                      (card.element ?? 'neutral') == element) &&
                  (rarity == 'all' || card.rarity == rarity) &&
                  (source == 'all' || card.source == source) &&
                  (mystling == 'all' || card.mystlingId == mystling) &&
                  keywordFilter.matchesCard(card) &&
                  cardMatchesSearch(card, query),
            )
            .toList()
          ..sort((a, b) => a.name.compareTo(b.name));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Card catalog'),
        actions: [
          IconButton(
            tooltip: 'Mystlings',
            icon: const Icon(Icons.pets),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute<void>(
                builder: (_) => Scaffold(
                  appBar: AppBar(title: const Text('Mystlings')),
                  body: ListView(
                    children: [
                      for (final item in widget.catalog.mystlings)
                        ListTile(
                          leading: Image.asset(
                            'assets/element_icons/${item.mainElement.toLowerCase()}.png',
                            width: 28,
                            height: 28,
                            fit: BoxFit.contain,
                          ),
                          title: Text(item.name),
                          onTap: () => mystlingDetail(context, item),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          IconButton(
            tooltip: 'Bonus actions',
            icon: const Icon(Icons.bolt),
            onPressed: () => bonusDetail(
              context,
              widget.catalog,
              mystling: mystling == 'all'
                  ? null
                  : widget.catalog.mystlingsById[mystling],
            ),
          ),
        ],
      ),
      body: LayoutBuilder(
        builder: (context, constraints) => CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.all(12),
              sliver: SliverList.list(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          decoration: const InputDecoration(
                            prefixIcon: Icon(Icons.search),
                            labelText: 'Search name, ID or effect',
                          ),
                          onChanged: (value) => setState(() => query = value),
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        icon: const Icon(Icons.filter_list),
                        label: Text(
                          keywordFilter.isEmpty
                              ? 'Keywords'
                              : 'Keywords (${keywordFilter.selected.length})',
                        ),
                        onPressed: () async {
                          final updated = await showKeywordFilterSheet(
                            context,
                            keywordFilter,
                          );
                          if (updated != null) {
                            setState(() => keywordFilter = updated);
                          }
                        },
                      ),
                    ],
                  ),
                  ActiveKeywordChipsBar(
                    state: keywordFilter,
                    onRemove: (kw) => setState(
                      () => keywordFilter = keywordFilter.copyWith(
                        selected: Set<String>.from(keywordFilter.selected)
                          ..remove(kw),
                      ),
                    ),
                    onClearAll: () => setState(
                      () =>
                          keywordFilter = keywordFilter.copyWith(selected: {}),
                    ),
                  ),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        DropdownButton<String>(
                          value: element,
                          items: [
                            for (final value in [
                              'all',
                              'neutral',
                              'air',
                              'dark',
                              'earth',
                              'fire',
                              'light',
                              'water',
                            ])
                              DropdownMenuItem(
                                value: value,
                                child: elementFilterLabel(value),
                              ),
                          ],
                          onChanged: (value) =>
                              setState(() => element = value!),
                        ),
                        const SizedBox(width: 12),
                        DropdownButton<String>(
                          value: rarity,
                          items: [
                            for (final value in [
                              'all',
                              'common',
                              'rare',
                              'ultra_rare',
                              'legendary',
                              'mystling_specific',
                            ])
                              DropdownMenuItem(
                                value: value,
                                child: Text(
                                  value == 'all'
                                      ? 'All Rarities'
                                      : titleCase(value),
                                ),
                              ),
                          ],
                          onChanged: (value) => setState(() => rarity = value!),
                        ),
                        const SizedBox(width: 12),
                        DropdownButton<String>(
                          value: source,
                          items: [
                            for (final value in [
                              'all',
                              'starting',
                              'advancement_a',
                              'advancement_b',
                              'booster',
                              'mystling',
                            ])
                              DropdownMenuItem(
                                value: value,
                                child: Text(titleCase(value)),
                              ),
                          ],
                          onChanged: (value) => setState(() => source = value!),
                        ),
                        const SizedBox(width: 12),
                        DropdownButton<String>(
                          value: mystling,
                          items: [
                            const DropdownMenuItem(
                              value: 'all',
                              child: Text('All Mystlings'),
                            ),
                            for (final item in widget.catalog.mystlings)
                              DropdownMenuItem(
                                value: item.id,
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Image.asset(
                                      'assets/element_icons/${item.mainElement.toLowerCase()}.png',
                                      width: 20,
                                      height: 20,
                                      fit: BoxFit.contain,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(item.name),
                                  ],
                                ),
                              ),
                          ],
                          onChanged: (value) =>
                              setState(() => mystling = value!),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (cards.isEmpty)
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: Text('No cards match these filters.')),
                ),
              ),
            SliverPadding(
              padding: EdgeInsets.fromLTRB(
                12,
                0,
                12,
                32 + MediaQuery.paddingOf(context).bottom,
              ),
              sliver: SliverGrid.builder(
                gridDelegate: cardGridDelegate(
                  constraints.maxWidth,
                  hasControls: false,
                ),
                itemCount: cards.length,
                itemBuilder: (context, index) {
                  final card = cards[index];
                  return CardGridTile(
                    key: ValueKey(card.id),
                    card: card,
                    onOpen: () => cardDetail(
                      context,
                      card,
                      onKeywordTap: (kw) => setState(
                        () => keywordFilter = keywordFilter.copyWith(
                          selected: {...keywordFilter.selected, kw},
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class Transfer extends StatefulWidget {
  const Transfer(
    this.catalog,
    this.store,
    this.items,
    this.onChanged, {
    super.key,
  });
  final Catalog catalog;
  final LocalStore store;
  final List<Loadout> items;
  final VoidCallback onChanged;
  @override
  State<Transfer> createState() => _TransferState();
}

class _TransferState extends State<Transfer> {
  final controller = TextEditingController();
  ImportPreview? preview;
  String? message;
  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  void inspect() {
    try {
      setState(() {
        preview = previewImport(controller.text, widget.catalog);
        message = null;
      });
    } catch (e) {
      setState(() {
        preview = null;
        message = 'Import error: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Import / export')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Export all saved loadouts as JSON. The file is written to the app documents folder; clipboard copy is available for sharing.',
        ),
        Wrap(
          spacing: 8,
          children: [
            FilledButton.icon(
              onPressed: () async {
                await Clipboard.setData(
                  ClipboardData(
                    text: exportJson(
                      widget.items,
                      widget.catalog.schemaVersion,
                    ),
                  ),
                );
                if (mounted) {
                  setState(
                    () => message = 'Copied ${widget.items.length} loadouts.',
                  );
                }
              },
              icon: const Icon(Icons.copy),
              label: const Text('Copy export'),
            ),
            OutlinedButton.icon(
              onPressed: () async {
                try {
                  final file = await widget.store.exportFile(
                    widget.items,
                    widget.catalog.schemaVersion,
                  );
                  if (mounted) {
                    setState(() => message = 'Exported to ${file.path}');
                  }
                } catch (e) {
                  if (mounted) setState(() => message = 'Export failed: $e');
                }
              },
              icon: const Icon(Icons.save_alt),
              label: const Text('Save JSON file'),
            ),
          ],
        ),
        const Divider(height: 32),
        const Text('Paste exported JSON to preview before merging.'),
        TextField(
          controller: controller,
          maxLines: 7,
          decoration: const InputDecoration(
            labelText: 'Import JSON',
            border: OutlineInputBorder(),
          ),
        ),
        Wrap(
          spacing: 8,
          children: [
            TextButton.icon(
              onPressed: () async {
                final data = await Clipboard.getData('text/plain');
                controller.text = data?.text ?? '';
                inspect();
              },
              icon: const Icon(Icons.paste),
              label: const Text('Paste clipboard'),
            ),
            FilledButton(
              onPressed: inspect,
              child: const Text('Preview import'),
            ),
          ],
        ),
        if (message != null) Text(message!),
        if (preview != null) ...[
          Text(
            '${preview!.loadouts.length} loadouts • catalog version ${preview!.catalogVersion}',
          ),
          if (preview!.unknownCards.isNotEmpty)
            Text(
              'Unknown card IDs: ${preview!.unknownCards.join(', ')}',
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          for (final item in preview!.loadouts)
            ListTile(
              title: Text(item.name),
              subtitle: Text('${item.mode.label} • ${item.decks.length} decks'),
            ),
          FilledButton(
            onPressed: () {
              final count = mergeImport(widget.items, preview!);
              widget.onChanged();
              setState(() {
                message = 'Imported $count loadouts.';
                preview = null;
              });
            },
            child: const Text('Import and merge'),
          ),
        ],
      ],
    ),
  );
}
