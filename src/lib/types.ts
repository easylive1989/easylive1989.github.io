/** A post on the blog: an article in one of Think Space's 部落格 folders. */
export interface Article {
  id: string;
  title: string;
  category: string;
  createdTime: string;
  lastEditedTime: string;
  summary: string;
  /** the picture the article opens with, as its markdown names it (`/api/files/…/display` or a web address); the list shows it as the article's cover */
  cover?: string;
}

/** One of the 碎碎念 (部落格/碎碎念): a title and whatever is written in it. */
export interface Note {
  id: string;
  title: string;
  createdTime: string;
  lastEditedTime: string;
}
