// The escape game: a layer laid over the room for as long as a chapter is being played, and taken off again after. A chapter belongs
// to one world (the Chinese study's is studyEscapeInk.js): it shuts the player in that room, builds what its puzzles are played with
// into the room, and answers the clicks. What every chapter shares is here: the card in the corner of the screen (the chapter's name,
// a clock, what is carried, a way to give up, and a box for whatever is being looked at or written on), the progress kept in
// localStorage, the start, the giving up and the end. There is no hint: the room's own words, and the story's, are all the guidance
// there is. A chapter begins with something in the room (the note on the table): the card is first only that thing, read, with the
// choice of going on; the clock and the rest of the card wait until the player has.
const CHAPTERS = { ink:{ title:'字與墨', load:() => import('./studyEscapeInk.js') } };
const KEY = 'study-escape';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
const save = (name, s) => { try { const all = load(); all[name] = s; localStorage.setItem(KEY, JSON.stringify(all)); } catch {} };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const mmss = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const spell = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return (s >= 60 ? Math.floor(s / 60) + ' 分 ' : '') + (s % 60) + ' 秒'; };

// Starts the chapter of the world the room is in, if it has one, and hands back what study.js drives: click, tick, busy, escape, abandon.
export async function start(stage) {
  const name = stage.world(), ch = CHAPTERS[name]; if (!ch) return null;
  let S = load()[name] || {}; if (S.d) S = {}; // a chapter played to its end starts over; one left half way goes on
  const resumed = !!S.t0;

  /* the card */
  let card = document.getElementById('esc');
  if (!card) { card = document.createElement('div'); card.id = 'esc'; card.className = 'hud rpg'; document.body.appendChild(card); }
  card.innerHTML = '<div class="bar"><span class="ttl">' + esc(ch.title) + '</span><span class="clk">00:00</span><span class="sep"></span><span class="inv"></span><span class="sep"></span><button class="opt" data-esc="quit">放棄</button></div><div class="box" hidden></div>';
  card.classList.add('pre');
  const clk = card.querySelector('.clk'), inv = card.querySelector('.inv'), box = card.querySelector('.box'), quitBtn = card.querySelector('[data-esc="quit"]');
  const tickClock = () => { clk.textContent = mmss((S.t1 || Date.now()) - (S.t0 || Date.now())); }; let clockT = null;
  requestAnimationFrame(() => card.classList.add('on'));

  const ui = {
    state:S, save:() => save(name, S), resumed,
    // what the room says: a line at the top of the screen, held longer than the room's own, for a player has to read and look at once
    toast:(t, ms = 4000) => stage.toast(t, ms),
    // what is carried, as the options of a menu: each may be looked at
    inv:items => { inv.innerHTML = items.map(([id, label]) => '<button class="opt" data-esc="item" data-id="' + esc(id) + '">' + esc(label) + '</button>').join(''); },
    box:html => { box.innerHTML = html; box.hidden = false; },
    closeBox:() => { box.hidden = true; box.innerHTML = ''; },
    boxOpen:() => !box.hidden,
    // the player has looked up from the note: the chapter is on, the clock runs, and the page knows (its toast moves out from under the dock)
    go:() => { if (!S.t0) S.t0 = Date.now(); save(name, S); card.classList.remove('pre'); document.body.classList.add('escape'); tickClock(); clockT = setInterval(tickClock, 1000); },
    quit:t => { quitBtn.textContent = t; }, // what giving up is called: 放棄, or 回書齋 once the chapter is won
    // the chapter is over: the clock stops, the time is kept, and the card says so until the player goes back into the room
    end:() => { S.t1 = Date.now(); S.d = 1; save(name, S); tickClock(); return spell(S.t1 - S.t0); },
    // the layer comes off: the card goes, and the room is the room again
    finish:() => { clearInterval(clockT); document.body.classList.remove('escape'); card.classList.remove('on'); setTimeout(() => { if (!card.classList.contains('on')) card.remove(); }, 400); stage.over(); },
  };
  const chapter = (await ch.load()).default(stage, ui);
  card.onclick = e => { const b = e.target.closest('[data-esc]'); if (!b) return; const act = b.dataset.esc;
    if (act === 'item') chapter.use(b.dataset.id); else if (act === 'close') { if (!chapter.on && !chapter.ending) chapter.cancel(); else ui.closeBox(); } else if (act === 'quit') game.abandon(); else chapter.act(act, b); }; // closing the letter before anything is chosen puts it down

  const game = {
    click:root => chapter.click(root && root.userData.pick.type === 'game' ? root : null, !!root),
    tick:dt => chapter.tick(dt),
    get busy() { return chapter.busy; },
    // once the chapter is won, every way out leads back into the room: Escape, the card's button, a click anywhere in the room.
    // Before it has begun (the note read, nothing chosen), any of them puts the note down
    escape:() => { if (chapter.ending) chapter.back(); else if (!chapter.on) chapter.cancel(); else if (!box.hidden) ui.closeBox(); },
    abandon:() => { if (chapter.ending) { chapter.back(); return; } if (!chapter.on) { chapter.cancel(); return; } ui.closeBox(); chapter.teardown(); save(name, S); stage.goHome(); stage.toast('先放著，進度留著下次再來'); ui.finish(); },
  };
  chapter.begin();
  return game;
}
