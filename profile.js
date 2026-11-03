"use strict";
// Perfil da pessoa: nome e foto. A foto vem, nesta ordem, da que ela enviou, do Gravatar do e-mail ou das iniciais.
const gravatarCache = {};
const myProfile = () => state.profile || {};
const myEmail = () => (typeof Account !== "undefined" && Account.email ? String(Account.email) : "");
const isCloud = () => typeof Account !== "undefined" && Account.mode === "cloud";
function myName() {
  return String(myProfile().name || (typeof Account !== "undefined" && Account.displayName) || "").trim();
}
function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "EU";
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
}
async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function photoURL() {
  const p = myProfile();
  if (p.photo) return p.photo;
  if (p.gravatar === false) return "";
  return gravatarCache[myEmail().trim().toLowerCase()] || "";
}
// Gravatar com d=404: se a pessoa não tiver foto lá, a imagem falha e ficam as iniciais.
async function loadGravatar() {
  const email = myEmail().trim().toLowerCase();
  if (!email || email in gravatarCache || myProfile().gravatar === false || !globalThis.crypto?.subtle || typeof Image === "undefined")
    return;
  gravatarCache[email] = "";
  try {
    const url = `https://gravatar.com/avatar/${await sha256(email)}?s=240&d=404`;
    await new Promise((ok, bad) => {
      const img = new Image();
      img.referrerPolicy = "no-referrer";
      img.onload = ok;
      img.onerror = bad;
      img.src = url;
    });
    gravatarCache[email] = url;
    paintAvatars();
  } catch (_) {}
}
function avatarInner() {
  const url = photoURL();
  return url ? `<img src="${esc(url)}" alt="" referrerpolicy="no-referrer">` : esc(initials(myName() || (isCloud() ? myEmail() : "")));
}
function paintAvatars() {
  if (typeof document.querySelectorAll !== "function") return;
  const inner = avatarInner(),
    name = myName() || (isCloud() ? "Minha conta" : "Sem conta");
  document.querySelectorAll("[data-me-avatar]").forEach?.((el) => {
    el.innerHTML = inner;
    el.classList?.toggle("has-photo", inner.startsWith("<img"));
  });
  document.querySelectorAll("[data-me-name]").forEach?.((el) => (el.textContent = name));
  loadGravatar();
}
function profilePanel() {
  const p = myProfile(),
    cloud = isCloud(),
    source = p.photo ? "Foto enviada por você." : p.gravatar !== false && photoURL() ? "Foto do seu e-mail, pelo Gravatar." : "Sem foto: aparecem as suas iniciais.";
  return `<article class="panel profile-card">${panelHead("Seu perfil", "Como você aparece no Vértice. O nome é usado na saudação do Início.")}<div class="profile-edit"><span class="avatar xl" data-me-avatar>${avatarInner()}</span><div class="profile-fields"><label class="field"><span class="field-label">Seu nome</span><span class="inline-form"><input id="profile-name" type="text" maxlength="60" autocomplete="nickname" value="${esc(myName())}" placeholder="Como quer ser chamado"><button type="button" class="btn primary" data-action="profile-name">Salvar</button></span></label><p class="hint">${source}</p><div class="row-actions"><label class="btn">${icon("upload")}Trocar foto<input type="file" accept="image/*" id="profile-photo-file" hidden></label>${p.photo ? btn("profile-photo-remove", "Remover foto", { cls: "ghost" }) : ""}${cloud ? btn("profile-gravatar", p.gravatar === false ? "Usar a foto do meu e-mail" : "Não usar a foto do e-mail", { cls: "ghost" }) : ""}</div>${cloud ? '<p class="hint">A foto do e-mail vem do <a href="https://gravatar.com" target="_blank" rel="noopener noreferrer">Gravatar</a>, se você tiver cadastro lá com este e-mail.</p>' : ""}</div></div></article>`;
}
function saveProfile(patch, message) {
  const next = { ...myProfile(), ...patch };
  for (const k of Object.keys(next)) if (next[k] === undefined || next[k] === "") delete next[k];
  const candidate = { ...state, profile: next };
  if (!F.valid(candidate)) {
    toast("Não foi possível salvar o perfil. Tente uma foto menor ou um nome mais curto.");
    return;
  }
  state.profile = next;
  commit(message);
  paintAvatars();
}
function handleProfileAction(a) {
  if (a === "profile-name") {
    const name = String($("#profile-name").value || "").trim().slice(0, 60);
    saveProfile({ name }, name ? "Nome salvo." : "Nome removido. Vale o da conta.");
  } else if (a === "profile-photo-remove") saveProfile({ photo: "" }, "Foto removida.");
  else if (a === "profile-gravatar") saveProfile({ gravatar: myProfile().gravatar === false ? undefined : false }, "Preferência de foto salva.");
  else return false;
  return true;
}
document.addEventListener("change", async (e) => {
  if (e.target.id !== "profile-photo-file") return;
  try {
    const photo = await shrinkImage(e.target.files[0], 256, 40000);
    saveProfile({ photo }, "Foto atualizada.");
  } catch (err) {
    toast(err.message);
  } finally {
    e.target.value = "";
  }
});
