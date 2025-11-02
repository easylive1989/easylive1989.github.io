import 'tutorial.dart';

/// 教學系列模型
class TutorialSeries {
  /// 系列唯一識別碼
  final String id;

  /// 系列名稱
  final String name;

  /// 系列描述
  final String description;

  /// 系列封面圖片
  final String? coverImage;

  /// 系列中的所有教學（按 Day 排序）
  final List<Tutorial> tutorials;

  /// 系列總天數
  int get totalDays => tutorials.length;

  /// 系列總閱讀時間（分鐘）
  int get totalReadTime => tutorials.fold(0, (sum, t) => sum + t.estimatedReadTime);

  /// 系列標籤
  final List<String> tags;

  /// 難度等級 (beginner, intermediate, advanced)
  final String difficulty;

  TutorialSeries({
    required this.id,
    required this.name,
    required this.description,
    this.coverImage,
    required this.tutorials,
    this.tags = const [],
    this.difficulty = 'intermediate',
  }) {
    // 設定教學之間的前後連結
    _linkTutorials();
  }

  /// 設定教學之間的前後連結
  void _linkTutorials() {
    for (var i = 0; i < tutorials.length; i++) {
      if (i > 0) {
        tutorials[i].previousId = tutorials[i - 1].id;
      }
      if (i < tutorials.length - 1) {
        tutorials[i].nextId = tutorials[i + 1].id;
      }
    }
  }

  /// 根據 Day 編號取得教學
  Tutorial? getTutorialByDay(int day) {
    try {
      return tutorials.firstWhere((t) => t.day == day);
    } catch (e) {
      return null;
    }
  }

  /// 根據 ID 取得教學
  Tutorial? getTutorialById(String id) {
    try {
      return tutorials.firstWhere((t) => t.id == id);
    } catch (e) {
      return null;
    }
  }

  /// 取得系列進度百分比（基於已完成的章節數）
  double getProgress(Set<String> completedTutorialIds) {
    if (tutorials.isEmpty) return 0.0;

    final completed = tutorials.where((t) => completedTutorialIds.contains(t.id)).length;
    return (completed / tutorials.length) * 100;
  }

  /// 轉換為 JSON
  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'description': description,
        'coverImage': coverImage,
        'tutorials': tutorials.map((t) => t.toJson()).toList(),
        'totalDays': totalDays,
        'totalReadTime': totalReadTime,
        'tags': tags,
        'difficulty': difficulty,
      };

  @override
  String toString() => 'TutorialSeries(id: $id, name: $name, totalDays: $totalDays)';
}

/// 預定義的系列 ID 常數
class SeriesIds {
  static const String flutterDesign = 'flutter-design';
  static const String flutterTesting = 'flutter-testing';
}

/// 系列難度等級
class SeriesDifficulty {
  static const String beginner = 'beginner';
  static const String intermediate = 'intermediate';
  static const String advanced = 'advanced';

  static String getLabel(String difficulty) {
    switch (difficulty) {
      case beginner:
        return '初級';
      case intermediate:
        return '中級';
      case advanced:
        return '高級';
      default:
        return '未知';
    }
  }
}
