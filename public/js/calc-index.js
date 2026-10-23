(function () {
  var q = document.getElementById('cc-q'), grid = document.getElementById('cc-grid'), none = document.getElementById('cc-none');
  if (!q || !grid) return;
  var cards = [].slice.call(grid.children), chips = [].slice.call(document.querySelectorAll('.lf-chipbtn')), cat = 'all';
  function apply() {
    var t = q.value.trim().toLowerCase(), shown = 0;
    cards.forEach(function (c) {
      var ok = (cat === 'all' || c.dataset.cat === cat) && (!t || c.dataset.t.indexOf(t) !== -1);
      c.hidden = !ok; if (ok) shown++;
    });
    none.hidden = shown !== 0;
  }
  chips.forEach(function (b) {
    b.addEventListener('click', function () {
      cat = b.dataset.f;
      chips.forEach(function (x) { x.classList.toggle('is-on', x === b); });
      apply();
    });
  });
  q.addEventListener('input', apply);
})();
