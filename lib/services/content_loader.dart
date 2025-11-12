import 'dart:io';
import '../models/article.dart';
import '../models/tutorial.dart';
import '../models/tutorial_series.dart';

/// 內容載入服務
///
/// 負責從 web/content 目錄讀取所有文章和教學內容
/// 在建置時執行，將內容載入到記憶體中
class ContentLoader {
  /// 內容根目錄路徑
  static const String contentRoot = 'web/content';

  /// 文章目錄路徑
  static const String articlesPath = '$contentRoot/articles';

  /// 教學目錄路徑
  static const String tutorialsPath = '$contentRoot/tutorials';

  /// 載入所有技術分享文章
  static Future<List<Article>> loadArticles() async {
    final articlesDir = Directory(articlesPath);

    if (!await articlesDir.exists()) {
      print('Warning: Articles directory not found at $articlesPath');
      return [];
    }

    final articles = <Article>[];

    // 遞迴列出所有 .md 檔案（包含子目錄）
    await for (final entity in articlesDir.list(recursive: true)) {
      if (entity is File && entity.path.endsWith('.md')) {
        try {
          final content = await entity.readAsString();
          final filename = entity.uri.pathSegments.last;
          // 提取目錄名稱（用於圖片路徑）
          final pathSegments = entity.uri.pathSegments;
          final directoryName = pathSegments.length >= 2
              ? pathSegments[pathSegments.length - 2]
              : null;

          final article = Article.fromMarkdown(content, filename, directoryName: directoryName);
          articles.add(article);

          print('Loaded article: ${article.title}');
        } catch (e) {
          print('Error loading article from ${entity.path}: $e');
        }
      }
    }

    // 按更新時間排序（最新的在前）
    articles.sort((a, b) {
      final aDate = a.updatedAt ?? a.createdAt ?? DateTime(2000);
      final bDate = b.updatedAt ?? b.createdAt ?? DateTime(2000);
      return bDate.compareTo(aDate);
    });

    print('Total articles loaded: ${articles.length}');
    return articles;
  }

  /// 載入所有教學系列
  static Future<List<TutorialSeries>> loadTutorialSeries() async {
    final tutorialsDir = Directory(tutorialsPath);

    if (!await tutorialsDir.exists()) {
      print('Warning: Tutorials directory not found at $tutorialsPath');
      return [];
    }

    final seriesList = <TutorialSeries>[];

    // 列出所有系列目錄
    await for (final entity in tutorialsDir.list()) {
      if (entity is Directory) {
        try {
          final series = await _loadSeries(entity);
          if (series != null) {
            seriesList.add(series);
            print('Loaded series: ${series.name} (${series.totalDays} days)');
          }
        } catch (e) {
          print('Error loading series from ${entity.path}: $e');
        }
      }
    }

    print('Total series loaded: ${seriesList.length}');
    return seriesList;
  }

  /// 將目錄名稱映射到預定義的英文 ID
  static String _mapSeriesNameToId(String seriesName) {
    // 定義目錄名稱與英文 ID 的映射
    const seriesMapping = {
      '30 天學會 Flutter 測試': 'flutter-testing',
      '30 天學會 Flutter 設計': 'flutter-design',
    };

    // 如果有匹配的映射，使用預定義的 ID
    if (seriesMapping.containsKey(seriesName)) {
      return seriesMapping[seriesName]!;
    }

    // 否則使用預設的生成邏輯（作為後備方案）
    return seriesName
        .toLowerCase()
        .replaceAll(RegExp(r'\s+'), '-')
        .replaceAll(RegExp(r'[^a-z0-9\-]'), '');
  }

  /// 載入單個教學系列
  static Future<TutorialSeries?> _loadSeries(Directory seriesDir) async {
    final seriesName = seriesDir.uri.pathSegments[seriesDir.uri.pathSegments.length - 2];

    // 根據目錄名稱映射到預定義的英文 ID
    final seriesId = _mapSeriesNameToId(seriesName);

    final tutorials = <Tutorial>[];

    // 遞迴列出所有 Day X.md 檔案（包含子目錄）
    await for (final entity in seriesDir.list(recursive: true)) {
      if (entity is File && entity.path.endsWith('.md')) {
        final filename = entity.uri.pathSegments.last;

        // 只處理 Day 開頭的檔案
        if (RegExp(r'Day\s*\d+', caseSensitive: false).hasMatch(filename)) {
          try {
            final content = await entity.readAsString();
            // 提取目錄名稱（用於圖片路徑）
            final pathSegments = entity.uri.pathSegments;
            final directoryName = pathSegments.length >= 2
                ? pathSegments[pathSegments.length - 2]
                : null;
            final tutorial = Tutorial.fromMarkdown(content, seriesId, filename, directoryName: directoryName);
            tutorials.add(tutorial);
          } catch (e) {
            print('Error loading tutorial from ${entity.path}: $e');
          }
        }
      }
    }

    if (tutorials.isEmpty) {
      return null;
    }

    // 按 Day 編號排序
    tutorials.sort((a, b) => a.day.compareTo(b.day));

    // 生成系列描述（可以從第一篇教學或系列名稱生成）
    final description = _generateSeriesDescription(seriesName, tutorials);

    // 判斷難度（根據系列名稱或內容）
    final difficulty = _determineDifficulty(seriesName);

    // 生成標籤
    final tags = _extractTags(seriesName);

    return TutorialSeries(
      id: seriesId,
      name: seriesName,
      description: description,
      tutorials: tutorials,
      tags: tags,
      difficulty: difficulty,
    );
  }

  /// 生成系列描述
  static String _generateSeriesDescription(String seriesName, List<Tutorial> tutorials) {
    // 可以從系列名稱或第一篇教學生成描述
    if (seriesName.contains('設計')) {
      return '深入學習 Flutter 設計相關知識，包含 Widget、狀態管理、架構模式等主題';
    } else if (seriesName.contains('測試')) {
      return '完整的 Flutter 測試實戰教學，涵蓋單元測試、Widget 測試和整合測試';
    }

    return '${tutorials.length} 天完整教學課程';
  }

  /// 判斷系列難度
  static String _determineDifficulty(String seriesName) {
    final nameLower = seriesName.toLowerCase();

    if (nameLower.contains('入門') || nameLower.contains('基礎')) {
      return SeriesDifficulty.beginner;
    } else if (nameLower.contains('進階') || nameLower.contains('高級')) {
      return SeriesDifficulty.advanced;
    }

    return SeriesDifficulty.intermediate;
  }

  /// 從系列名稱提取標籤
  static List<String> _extractTags(String seriesName) {
    final tags = <String>['Flutter'];

    if (seriesName.contains('設計')) {
      tags.addAll(['設計', 'Widget', '架構']);
    } else if (seriesName.contains('測試')) {
      tags.addAll(['測試', 'Testing', 'TDD']);
    }

    return tags;
  }

  /// 載入所有內容（文章 + 系列）
  static Future<ContentData> loadAll() async {
    final articles = await loadArticles();
    final series = await loadTutorialSeries();

    return ContentData(
      articles: articles,
      series: series,
    );
  }
}

/// 內容資料容器
class ContentData {
  final List<Article> articles;
  final List<TutorialSeries> series;

  ContentData({
    required this.articles,
    required this.series,
  });

  /// 取得所有教學（扁平化）
  List<Tutorial> get allTutorials {
    return series.expand((s) => s.tutorials).toList();
  }

  /// 按 ID 查詢文章
  Article? getArticleById(String id) {
    try {
      return articles.firstWhere((a) => a.id == id);
    } catch (e) {
      return null;
    }
  }

  /// 按 ID 查詢系列
  TutorialSeries? getSeriesById(String id) {
    try {
      return series.firstWhere((s) => s.id == id);
    } catch (e) {
      return null;
    }
  }

  /// 按領域篩選文章
  List<Article> getArticlesByDomain(String domain) {
    return articles.where((a) => a.domain == domain).toList();
  }

  /// 取得最新文章
  List<Article> getLatestArticles({int limit = 5}) {
    return articles.take(limit).toList();
  }

  /// 取得最新教學（各系列最新的一篇）
  List<Tutorial> getLatestTutorials({int limit = 5}) {
    final latestTutorials = <Tutorial>[];

    for (final series in this.series) {
      if (series.tutorials.isNotEmpty) {
        latestTutorials.add(series.tutorials.last);
      }
    }

    return latestTutorials.take(limit).toList();
  }

  @override
  String toString() => 'ContentData(articles: ${articles.length}, series: ${series.length})';
}
