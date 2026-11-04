"use strict";
// Proteção contra "clickjacking": o Vértice não pode ser aberto dentro de outro site (num iframe escondido,
// por exemplo, para enganar a pessoa a clicar em algo). O GitHub Pages não deixa enviar o cabeçalho
// X-Frame-Options, então a proteção é feita aqui, antes de qualquer outra coisa carregar.
(function () {
  if (window.top === window.self) return;
  document.documentElement.style.display = "none";
  try {
    window.top.location.replace(window.self.location.href);
  } catch (_) {}
})();
