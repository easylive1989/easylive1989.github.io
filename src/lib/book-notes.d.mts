export function bookNotesHref(
  book: { id: string; read: boolean; noted: boolean; notesSpaceId?: string },
  where: { base: string; thinkBase: string },
): string;
