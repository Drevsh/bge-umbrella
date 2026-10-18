import 'package:flutter/material.dart';

import 'models.dart';
import 'storage.dart';

class SettingsView extends StatefulWidget {
  const SettingsView({
    required this.catalog,
    required this.store,
    required this.settings,
    required this.onSettingsChanged,
    super.key,
  });

  final Catalog catalog;
  final LocalStore store;
  final AppSettings settings;
  final ValueChanged<AppSettings> onSettingsChanged;

  @override
  State<SettingsView> createState() => _SettingsViewState();
}

class _SettingsViewState extends State<SettingsView> {
  late ThemeMode _themeMode;

  @override
  void initState() {
    super.initState();
    _themeMode = widget.settings.themeMode;
  }

  void _updateThemeMode(ThemeMode mode) {
    setState(() => _themeMode = mode);
    final updated = AppSettings(themeMode: mode);
    widget.onSettingsChanged(updated);
    widget.store.writeSettings(updated);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Appearance',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: colors.primary,
            ),
          ),
          const SizedBox(height: 8),
          Card(
            clipBehavior: Clip.antiAlias,
            child: RadioGroup<ThemeMode>(
              groupValue: _themeMode,
              onChanged: (mode) {
                if (mode != null) _updateThemeMode(mode);
              },
              child: const Column(
                children: [
                  RadioListTile<ThemeMode>(
                    title: Text('System default'),
                    subtitle: Text('Follow your device settings'),
                    secondary: Icon(Icons.brightness_auto),
                    value: ThemeMode.system,
                  ),
                  Divider(height: 1),
                  RadioListTile<ThemeMode>(
                    title: Text('Light'),
                    subtitle: Text('Always use light theme'),
                    secondary: Icon(Icons.light_mode_outlined),
                    value: ThemeMode.light,
                  ),
                  Divider(height: 1),
                  RadioListTile<ThemeMode>(
                    title: Text('Dark'),
                    subtitle: Text('Always use dark theme'),
                    secondary: Icon(Icons.dark_mode_outlined),
                    value: ThemeMode.dark,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Catalog & Storage',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: colors.primary,
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.menu_book_outlined, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'Catalog version: ${widget.catalog.schemaVersion}',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Spacer(),
                      Badge(
                        label: Text(widget.catalog.status),
                        backgroundColor: widget.catalog.status == 'complete'
                            ? colors.primary
                            : colors.tertiary,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${widget.catalog.cards.length} cards • ${widget.catalog.mystlings.length} Mystlings cataloged',
                    style: theme.textTheme.bodySmall,
                  ),
                  const Divider(height: 20),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.folder_outlined, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Save Location',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              widget.store.file.path,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: colors.outline,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
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
