import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bookNotesHref } from '../src/lib/book-notes.mjs';

const where = { base: '/', thinkBase: 'https://think.example' };

test('a finished book whose notes are an article opens its page on the blog', () => {
  assert.equal(bookNotesHref({ id: 'b1', read: true, noted: true }, where), '/reading/b1/');
});

test('a finished book whose notes are a whiteboard opens the public whiteboard on Think Space', () => {
  assert.equal(bookNotesHref({ id: 'b1', read: true, noted: false, notesSpaceId: 'sp_1' }, where), 'https://think.example/s/sp_1');
});

test('the whiteboard link escapes the id and does not double the slash', () => {
  assert.equal(bookNotesHref({ id: 'b1', read: true, noted: false, notesSpaceId: 'a/b' }, { base: '/', thinkBase: 'https://think.example/' }),
    'https://think.example/s/a%2Fb');
});

test('a book not finished yet, or without notes, has no notes link', () => {
  assert.equal(bookNotesHref({ id: 'b1', read: false, noted: true }, where), '');
  assert.equal(bookNotesHref({ id: 'b1', read: false, noted: false, notesSpaceId: 'sp_1' }, where), '');
  assert.equal(bookNotesHref({ id: 'b1', read: true, noted: false }, where), '');
  assert.equal(bookNotesHref({ id: 'b1', read: true, noted: false, notesSpaceId: 'sp_1' }, { base: '/', thinkBase: '' }), '');
});
