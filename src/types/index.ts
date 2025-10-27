export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  tag: string;
  createdAt: string;
  folderName: string;
}

export interface TutorialSeries {
  name: string;
  articles: Article[];
}

export interface ArticlesData {
  articles: Article[];
  tags: string[];
  sideProjects: SideProject[];
  tutorialSeries: TutorialSeries[];
}

export interface SideProject {
  name: string;
  description: string;
  tags: string[];
  websiteUrl?: string;
  sourceUrl?: string;
}
