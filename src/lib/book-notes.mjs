/**
 * Where a book's reading notes (讀書筆記) are, for the bookshelf: only a finished book shows them.
 * Notes kept in an article get a page of their own on the blog (reading/[id].astro);
 * notes kept on a whiteboard can't be drawn as a static page, so they open the public whiteboard on Think Space.
 * Think Space only hands out notesSpaceId when that whiteboard is public.
 */
export function bookNotesHref({ id, read, noted, notesSpaceId }, { base, thinkBase }) {
  if (!read) return '';
  if (noted) return `${base}reading/${id}/`;
  if (notesSpaceId && thinkBase) return `${thinkBase.replace(/\/$/, '')}/s/${encodeURIComponent(notesSpaceId)}`;
  return '';
}
