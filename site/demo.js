// Acrescenta "Ver HTML" a cada .demo da página: lê o HTML real do exemplo, para
// que o que se vê e o que se copia nunca divirjam.
(function () {
  function dedent(text) {
    var lines = text.replace(/^\n+|\s+$/g, '').split('\n');
    var min = Infinity;
    lines.forEach(function (l) {
      if (!l.trim()) return;
      min = Math.min(min, l.match(/^ */)[0].length);
    });
    if (!isFinite(min)) min = 0;
    return lines.map(function (l) { return l.slice(min); }).join('\n');
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  document.querySelectorAll('.demo').forEach(function (demo) {
    // innerHTML serializa os atributos booleanos como checked="": volta à forma curta.
    var source = dedent(demo.innerHTML).replace(/ (checked|disabled|open|selected|hidden|required|readonly)=""/g, ' $1');
    var details = document.createElement('details');
    details.className = 'accordion snippet';
    details.innerHTML =
      '<summary>Ver HTML</summary>' +
      '<div class="accordion-body">' +
      '<button type="button" class="btn btn-ghost btn-sm snippet-copy">Copiar</button>' +
      '<pre class="code-block"><code>' + escapeHtml(source) + '</code></pre>' +
      '</div>';
    demo.insertAdjacentElement('afterend', details);

    var btn = details.querySelector('.snippet-copy');
    btn.addEventListener('click', function () {
      var done = function () {
        btn.textContent = 'Copiado';
        setTimeout(function () { btn.textContent = 'Copiar'; }, 1500);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(source).then(done, function () {});
    });
  });
})();
