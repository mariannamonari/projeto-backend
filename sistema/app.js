const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
const TOKEN_KEY = "assistencia.session.token";
const NAV = [
  ["dashboard", "⌂", "Visão geral"],
  ["clients", "♙", "Clientes"],
  ["equipment", "▣", "Equipamentos"],
  ["appointments", "◷", "Agendamentos"],
];
let token = localStorage.getItem(TOKEN_KEY);
let currentUser = null;
let activePage = "dashboard";
let searchTerm = "";
let allClients = [];
let allEquipment = [];
let allAppointments = [];
let toastTimer;

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const dateTime = (value) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const dateInputValue = (value) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function notify(message, error = false) {
  toast.textContent = message;
  toast.classList.toggle("error", error);
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

async function api(url, options = {}) {
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
  const response = await fetch(`/api${url}`, { ...options, headers });
  if (response.status === 401 && token) {
    localStorage.removeItem(TOKEN_KEY);
    token = null;
    currentUser = null;
    renderLogin();
  }
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || `Falha na requisição (${response.status}).`);
  }
  return response.status === 204 ? null : response.json();
}

function renderLogin(message = "") {
  app.innerHTML = `
    <section class="login-screen">
      <div class="login-brand">
        <div class="brand-mark"><span class="brand-icon">✳</span><span class="brand-name">Oficina<span style="color:#7ed7b8">.</span></span></div>
        <div class="brand-copy"><div class="eyebrow">Gestão técnica, sem complicação</div><h1>Cuidado em cada detalhe.</h1><p>Organize clientes, equipamentos e serviços em um só lugar. Mais clareza para sua equipe e confiança para quem precisa.</p></div>
        <div class="brand-foot">Assistência técnica · Painel de gestão</div>
      </div>
      <div class="login-panel"><form class="login-card" id="login-form">
        <div class="eyebrow" style="color:#617286">ÁREA RESTRITA</div><h2>Bem-vindo de volta</h2><p>Acesse sua conta para continuar.</p>
        <div class="field"><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="username" placeholder="voce@empresa.com" required></div>
        <div class="field"><label for="password">Senha</label><input id="password" name="password" type="password" autocomplete="current-password" placeholder="Sua senha" required></div>
        ${message ? `<p style="color:#b44338;font-size:12px">${escapeHtml(message)}</p>` : ""}
        <button class="btn btn-primary btn-block" type="submit">Entrar no sistema <span>→</span></button>
        <div class="hint">Acesso demonstrativo: <strong>ana@assistencia.local</strong><br>Senha: <strong>Assist@123</strong></div>
      </form></div>
    </section>`;
  document.querySelector("#login-form").addEventListener("submit", login);
}

async function login(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button[type=submit]");
  button.disabled = true;
  button.textContent = "Verificando...";
  try {
    const form = new FormData(event.currentTarget);
    const result = await api("/auth/login", { method: "POST", body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
    token = result.token;
    currentUser = result.user;
    localStorage.setItem(TOKEN_KEY, token);
    activePage = "dashboard";
    await renderApp();
  } catch (error) {
    renderLogin(error.message);
  }
}

function renderShell() {
  app.innerHTML = `<div class="layout">
    <aside class="sidebar">
      <div class="brand-mark"><span class="brand-icon">✳</span><span class="brand-name">Oficina<span style="color:#7ed7b8">.</span></span></div>
      <div class="side-label">MENU PRINCIPAL</div>
      <nav>${NAV.map(([id, icon, label]) => `<button class="nav-btn ${activePage === id ? "active" : ""}" data-page="${id}"><span class="nav-icon">${icon}</span><span class="nav-text">${label}</span></button>`).join("")}</nav>
      <div class="sidebar-bottom"><div class="user-mini"><div class="avatar">${escapeHtml((currentUser?.name || "U").slice(0, 1).toUpperCase())}</div><div class="user-details"><div class="user-name">${escapeHtml(currentUser?.name)}</div><div class="user-role">Equipe técnica</div></div></div><button class="nav-btn" data-action="logout"><span class="nav-icon">↪</span><span class="nav-text">Sair da conta</span></button></div>
    </aside>
    <section class="main-area"><header class="topbar"><div class="crumb">Assistência técnica <span style="padding:0 7px">/</span><strong>${NAV.find(([id]) => id === activePage)?.[2] || "Visão geral"}</strong></div><div class="top-actions"><span class="user-name" style="color:#586579">${escapeHtml(currentUser?.name)}</span><button class="btn btn-secondary btn-small" data-action="logout">Sair</button></div></header><main class="content" id="page-content"><div class="loading">Carregando dados...</div></main></section>
  </div><div id="modal-root"></div>`;
  app.querySelectorAll("[data-page]").forEach((button) => button.addEventListener("click", () => { activePage = button.dataset.page; renderApp(); }));
  app.querySelectorAll("[data-action=logout]").forEach((button) => button.addEventListener("click", logout));
}

async function renderApp() {
  renderShell();
  try {
    if (activePage === "dashboard") await renderDashboard();
    if (activePage === "clients") await renderClients();
    if (activePage === "equipment") await renderEquipment();
    if (activePage === "appointments") await renderAppointments();
  } catch (error) {
    if (token) notify(error.message, true);
  }
}

async function logout() {
  try { await api("/auth/logout", { method: "POST" }); } catch { /* Local credentials are always cleared. */ }
  localStorage.removeItem(TOKEN_KEY);
  token = null;
  currentUser = null;
  renderLogin();
}

function pageHead(title, description, button = "") {
  return `<div class="page-head"><div><h1>${title}</h1><p>${description}</p></div>${button}</div>`;
}

async function renderDashboard() {
  const [clients, equipment, appointments] = await Promise.all([api("/clients"), api("/equipment"), api("/appointments")]);
  allClients = clients.data;
  allEquipment = equipment.data;
  allAppointments = appointments.data;
  document.querySelector("#page-content").innerHTML = `${pageHead(`Olá, ${escapeHtml(currentUser?.name?.split(" ")[0])} 👋`, "Aqui está o resumo da sua assistência técnica.")}
    <div class="stats">
      <article class="stat-card"><div class="stat-label">Clientes cadastrados</div><div class="stat-value">${allClients.length}</div><div class="stat-note">Pessoas atendidas pela equipe</div></article>
      <article class="stat-card"><div class="stat-label">Equipamentos</div><div class="stat-value">${allEquipment.length}</div><div class="stat-note">Com vínculo de cliente</div></article>
      <article class="stat-card"><div class="stat-label">Agendamentos</div><div class="stat-value">${allAppointments.length}</div><div class="stat-note">Serviços na agenda</div></article>
    </div>
    <section class="panel"><h2>Próximos agendamentos</h2>${appointmentTable(allAppointments.slice(0, 5), false)}<div style="margin-top:16px"><button class="btn btn-secondary btn-small" data-go="appointments">Ver agenda completa →</button></div></section>
    <section class="panel"><h2>Acesso rápido</h2><div class="toolbar"><button class="btn btn-secondary" data-go="clients">♙ &nbsp;Gerenciar clientes</button><button class="btn btn-secondary" data-go="equipment">▣ &nbsp;Ver equipamentos</button><button class="btn btn-secondary" data-go="appointments">◷ &nbsp;Abrir agendamentos</button></div></section>`;
  document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => { activePage = button.dataset.go; renderApp(); }));
}

function clientTable(clients) {
  if (!clients.length) return `<div class="empty">Nenhum cliente encontrado. Tente outra busca ou cadastre um cliente.</div>`;
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Cliente</th><th>Contato</th><th>Cadastro</th><th>Ações</th></tr></thead><tbody>${clients.map((client) => `<tr><td class="primary-cell">${escapeHtml(client.name)}<div class="sub-cell">#${client.id}</div></td><td>${escapeHtml(client.email)}<div class="sub-cell">${escapeHtml(client.phone)}</div></td><td>${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(client.createdAt))}</td><td><div class="actions"><button class="btn btn-secondary btn-small" data-edit-client="${client.id}">Editar</button><button class="btn btn-danger btn-small" data-delete-client="${client.id}">Excluir</button></div></td></tr>`).join("")}</tbody></table></div>`;
}

async function renderClients() {
  const result = await api(`/clients${searchTerm ? `?q=${encodeURIComponent(searchTerm)}` : ""}`);
  allClients = result.data;
  document.querySelector("#page-content").innerHTML = `${pageHead("Clientes", "Cadastre e mantenha os dados dos clientes organizados.", `<button class="btn btn-primary" data-add-client>＋ Novo cliente</button>`)}
    <section class="panel"><div class="toolbar"><div class="search-box"><input id="client-search" type="search" value="${escapeHtml(searchTerm)}" placeholder="⌕  Buscar por nome, e-mail ou telefone..."></div><button class="btn btn-secondary" id="search-button">Buscar</button></div>${clientTable(allClients)}</section>`;
  document.querySelector("#client-search").addEventListener("keydown", (event) => { if (event.key === "Enter") { searchTerm = event.target.value.trim(); renderClients(); } });
  document.querySelector("#search-button").addEventListener("click", () => { searchTerm = document.querySelector("#client-search").value.trim(); renderClients(); });
  document.querySelector("[data-add-client]").addEventListener("click", () => clientModal());
  document.querySelectorAll("[data-edit-client]").forEach((button) => button.addEventListener("click", () => clientModal(allClients.find((item) => item.id === Number(button.dataset.editClient)))));
  document.querySelectorAll("[data-delete-client]").forEach((button) => button.addEventListener("click", () => deleteClient(Number(button.dataset.deleteClient))));
}

function clientModal(client) {
  const editing = Boolean(client);
  showModal(`${editing ? "Editar cliente" : "Novo cliente"}`, `<form id="client-form"><div class="form-grid">
    <div class="field span-two"><label for="client-name">Nome completo</label><input id="client-name" name="name" value="${escapeHtml(client?.name)}" required></div>
    <div class="field"><label for="client-email">E-mail</label><input id="client-email" name="email" type="email" value="${escapeHtml(client?.email)}" required></div>
    <div class="field"><label for="client-phone">Telefone</label><input id="client-phone" name="phone" value="${escapeHtml(client?.phone)}" required></div>
    <div class="field span-two"><label for="client-cpf">CPF ${editing ? "(opcional para manter o atual)" : ""}</label><input id="client-cpf" name="cpf" inputmode="numeric" placeholder="000.000.000-00" ${editing ? "" : "required"}><span class="sub-cell">O CPF é criptografado antes de ser salvo e nunca é exibido.</span></div>
  </div><div class="modal-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancelar</button><button class="btn btn-primary" type="submit">${editing ? "Salvar alterações" : "Cadastrar cliente"}</button></div></form>`);
  document.querySelector("#client-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (!values.cpf) delete values.cpf;
    try {
      await api(editing ? `/clients/${client.id}` : "/clients", { method: editing ? "PUT" : "POST", body: JSON.stringify(values) });
      closeModal(); notify(editing ? "Cliente atualizado com sucesso." : "Cliente cadastrado com sucesso."); renderClients();
    } catch (error) { notify(error.message, true); }
  });
}

async function deleteClient(id) {
  const client = allClients.find((item) => item.id === id);
  if (!confirm(`Excluir o cliente ${client?.name || "selecionado"}? Clientes com equipamentos vinculados não podem ser excluídos.`)) return;
  try { await api(`/clients/${id}`, { method: "DELETE" }); notify("Cliente excluído."); renderClients(); }
  catch (error) { notify(error.message, true); }
}

async function renderEquipment() {
  const [equipmentResult, clientsResult] = await Promise.all([api("/equipment"), api("/clients")]);
  allEquipment = equipmentResult.data;
  allClients = clientsResult.data;
  const rows = allEquipment.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Equipamento</th><th>Cliente</th><th>Número de série</th><th>Descrição</th></tr></thead><tbody>${allEquipment.map((item) => `<tr><td class="primary-cell">${escapeHtml(item.brand)} ${escapeHtml(item.model)}<div class="sub-cell">${escapeHtml(item.type)}</div></td><td>${escapeHtml(item.clientName)}</td><td><span class="badge">${escapeHtml(item.serialNumber)}</span></td><td>${escapeHtml(item.description || "—")}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">Nenhum equipamento cadastrado.</div>`;
  document.querySelector("#page-content").innerHTML = `${pageHead("Equipamentos", "Cada equipamento fica associado ao cliente responsável.", `<button class="btn btn-primary" data-add-equipment>＋ Novo equipamento</button>`)}<section class="panel"><h2>Equipamentos cadastrados <span class="badge">${allEquipment.length}</span></h2>${rows}</section>`;
  document.querySelector("[data-add-equipment]").addEventListener("click", () => equipmentModal());
}

function equipmentModal() {
  if (!allClients.length) { notify("Cadastre um cliente antes de adicionar equipamento.", true); return; }
  showModal("Cadastrar equipamento", `<form id="equipment-form"><div class="form-grid">
    <div class="field span-two"><label for="equipment-client">Cliente responsável</label><select id="equipment-client" name="clientId" required><option value="">Selecione um cliente</option>${allClients.map((client) => `<option value="${client.id}">${escapeHtml(client.name)} — ${escapeHtml(client.email)}</option>`).join("")}</select></div>
    <div class="field"><label for="equipment-type">Tipo</label><input id="equipment-type" name="type" placeholder="Notebook, celular..." required></div>
    <div class="field"><label for="equipment-brand">Marca</label><input id="equipment-brand" name="brand" required></div>
    <div class="field"><label for="equipment-model">Modelo</label><input id="equipment-model" name="model" required></div>
    <div class="field"><label for="equipment-serial">Número de série</label><input id="equipment-serial" name="serialNumber" required></div>
    <div class="field span-two"><label for="equipment-description">Descrição do problema</label><textarea id="equipment-description" name="description"></textarea></div>
  </div><div class="modal-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancelar</button><button class="btn btn-primary" type="submit">Salvar equipamento</button></div></form>`);
  document.querySelector("#equipment-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    values.clientId = Number(values.clientId);
    try { await api("/equipment", { method: "POST", body: JSON.stringify(values) }); closeModal(); notify("Equipamento cadastrado."); renderEquipment(); }
    catch (error) { notify(error.message, true); }
  });
}

function appointmentTable(items, canEdit = true) {
  if (!items.length) return `<div class="empty">Nenhum agendamento encontrado.</div>`;
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Data e horário</th><th>Cliente</th><th>Equipamento</th><th>Serviço / status</th>${canEdit ? "<th>Ações</th>" : ""}</tr></thead><tbody>${items.map((item) => `<tr><td class="primary-cell">${dateTime(item.scheduledAt)}</td><td>${escapeHtml(item.clientName)}<div class="sub-cell">${escapeHtml(item.clientPhone)}</div></td><td>${escapeHtml(item.equipmentBrand)} ${escapeHtml(item.equipmentModel)}<div class="sub-cell">${escapeHtml(item.equipmentType)}</div></td><td>${escapeHtml(item.description)}<div class="sub-cell"><span class="badge ${item.status === "concluido" ? "badge-green" : ""}">${escapeHtml(item.status.replace("_", " "))}</span></div></td>${canEdit ? `<td><button class="btn btn-secondary btn-small" data-edit-date="${item.id}">Alterar data</button></td>` : ""}</tr>`).join("")}</tbody></table></div>`;
}

async function renderAppointments() {
  const result = await api("/appointments");
  allAppointments = result.data;
  document.querySelector("#page-content").innerHTML = `${pageHead("Agendamentos", "Agenda ordenada por data, com dados do cliente e equipamento.")}<section class="panel"><div class="toolbar"><span class="badge badge-green">${allAppointments.length} serviços agendados</span></div>${appointmentTable(allAppointments)}</section>`;
  document.querySelectorAll("[data-edit-date]").forEach((button) => button.addEventListener("click", () => appointmentDateModal(allAppointments.find((item) => item.id === Number(button.dataset.editDate)))));
}

function appointmentDateModal(item) {
  if (!item) return;
  showModal("Alterar data do agendamento", `<form id="date-form"><div class="field"><label>Cliente e equipamento</label><div class="hint" style="margin:0">${escapeHtml(item.clientName)} · ${escapeHtml(item.equipmentBrand)} ${escapeHtml(item.equipmentModel)}</div></div><div class="field"><label for="scheduled-at">Nova data e horário</label><input id="scheduled-at" name="scheduledAt" type="datetime-local" value="${dateInputValue(item.scheduledAt)}" required></div><div class="modal-actions"><button type="button" class="btn btn-secondary" data-close-modal>Cancelar</button><button class="btn btn-primary" type="submit">Salvar data</button></div></form>`);
  document.querySelector("#date-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const scheduledAt = new FormData(event.currentTarget).get("scheduledAt");
    try { await api(`/appointments/${item.id}/date`, { method: "PATCH", body: JSON.stringify({ scheduledAt: new Date(scheduledAt).toISOString() }) }); closeModal(); notify("Data do agendamento atualizada."); renderAppointments(); }
    catch (error) { notify(error.message, true); }
  });
}

function showModal(title, content) {
  const root = document.querySelector("#modal-root");
  root.innerHTML = `<div class="modal-backdrop" data-backdrop><section class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><div class="modal-head"><h2>${escapeHtml(title)}</h2><button class="icon-button" type="button" data-close-modal aria-label="Fechar">×</button></div>${content}</section></div>`;
  root.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModal));
  root.querySelector("[data-backdrop]").addEventListener("click", (event) => { if (event.target === event.currentTarget) closeModal(); });
}
function closeModal() { const root = document.querySelector("#modal-root"); if (root) root.innerHTML = ""; }

async function start() {
  if (!token) { renderLogin(); return; }
  try {
    const result = await api("/auth/me");
    currentUser = result.user;
    await renderApp();
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    token = null;
    renderLogin("Sua sessão expirou. Entre novamente.");
  }
}

start();
