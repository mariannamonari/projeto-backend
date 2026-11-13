import PDFDocument from "pdfkit";
import { createWriteStream } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function attachPdf(document, filename) {
  const output = createWriteStream(path.join(root, filename));
  const finished = new Promise((resolve, reject) => {
    output.on("finish", resolve);
    output.on("error", reject);
    document.on("error", reject);
  });
  document.pipe(output);
  return finished;
}

async function writeDocumentation() {
  const doc = new PDFDocument({ size: "A4", margin: 52, info: { Title: "Documentacao - Sistema de Assistencia Tecnica", Author: "Sistema de Assistencia Tecnica" } });
  const finished = attachPdf(doc, "documentacao.pdf");
  doc.fillColor("#172536").font("Helvetica-Bold").fontSize(23).text("Sistema de Assistencia Tecnica", { lineGap: 4 });
  doc.fillColor("#63748a").font("Helvetica").fontSize(11).text("Documentacao de software | Projeto academico", { characterSpacing: 0.3 });
  doc.moveDown(1.5);

  const heading = (text) => {
    doc.moveDown(0.65).fillColor("#245bb5").font("Helvetica-Bold").fontSize(14).text(text);
    doc.moveTo(doc.page.margins.left, doc.y + 5).lineTo(doc.page.width - doc.page.margins.right, doc.y + 5).strokeColor("#dbe4ef").stroke();
    doc.moveDown(0.65);
  };
  const paragraph = (text) => doc.fillColor("#334155").font("Helvetica").fontSize(10).text(text, { lineGap: 3, paragraphGap: 5 });
  const requirement = (id, name, description) => {
    doc.fillColor("#172536").font("Helvetica-Bold").fontSize(10).text(`${id} - ${name}`, { continued: true });
    doc.fillColor("#334155").font("Helvetica").fontSize(10).text(`: ${description}`, { lineGap: 2, paragraphGap: 5 });
  };

  heading("1. Objetivo");
  paragraph("Aplicacao web para uma equipe de assistencia tecnica cadastrar clientes, registrar equipamentos, consultar a agenda de manutencao e remarcar atendimentos. O acesso aos modulos de gestao e restrito a usuarios autenticados.");

  heading("2. Requisitos funcionais");
  requirement("RF01", "Autenticar usuario", "Validar e-mail e senha de uma conta ativa; rejeitar credenciais incorretas sem liberar os modulos protegidos.");
  requirement("RF02", "Controlar sessao", "Criar sessao apos o login, expira-la apos o periodo configurado e permitir logout imediato.");
  requirement("RF03", "Gerenciar clientes", "Listar e pesquisar por nome, e-mail ou telefone, cadastrar, editar e excluir apenas quando nao houver equipamento vinculado.");
  requirement("RF04", "Proteger dados pessoais", "Armazenar senha em hash scrypt e CPF cifrado com AES-256-GCM; usar HMAC para unicidade sem guardar CPF em claro.");
  requirement("RF05", "Cadastrar equipamentos", "Cadastrar tipo, marca, modelo e numero de serie associados obrigatoriamente a um cliente existente.");
  requirement("RF06", "Consultar agenda", "Listar agendamentos em ordem cronologica, mostrando cliente e equipamento relacionados.");
  requirement("RF07", "Remarcar atendimento", "Alterar e persistir a data e hora de um agendamento existente.");
  requirement("RF08", "Identificar usuario e navegar", "Exibir o nome autenticado, permitir sair e navegar pelos modulos de clientes, equipamentos e agendamentos.");

  heading("3. Requisitos de infraestrutura");
  paragraph("SGBD: PostgreSQL 18.1 no servidor configurado no ambiente de desenvolvimento (confirmado com SELECT version()).");
  paragraph("Linguagem: TypeScript 5.9.3, compilado para JavaScript. Runtime de implementacao: Node.js 24.11.0.");
  paragraph("Framework HTTP: Express 5.3.0. Driver PostgreSQL: pg 8.23.1.");

  heading("4. Banco de dados e relacionamentos");
  paragraph("O DER desta entrega esta em der.pdf. O script init.sql cria usuarios, sessoes, clientes, equipamentos e agendamentos com chaves primarias, chaves estrangeiras, restricoes e indices.");
  paragraph("Um cliente pode ter varios equipamentos; cada equipamento pertence a um cliente. Um equipamento pode ter varios agendamentos; cada agendamento pertence a um equipamento. Um usuario pode ter varias sessoes. Clientes com equipamentos e equipamentos com agendamentos nao podem ser excluidos, protegendo a integridade referencial.");

  heading("5. Acesso de demonstracao");
  paragraph("Login: ana@assistencia.local | Senha inicial: Assist@123. O script tambem cria bruno@assistencia.local e carla@assistencia.local com a mesma senha inicial. Troque ou remova as contas antes de disponibilizar o sistema publicamente.");
  paragraph("Clientes e CPFs inseridos pelo script sao dados ficticios. A chave de exemplo de criptografia serve somente para demonstracao local.");

  heading("6. Executar");
  paragraph("Crie o banco vazio assistencia_tecnica. Configure as variaveis no arquivo local .env, incluindo credenciais PostgreSQL e CPF_ENCRYPTION_KEY secreta. No PowerShell, defina $env:CONFIRM_RESET=YES e execute npm run db:init uma unica vez (ou rode init.sql no pgAdmin); o script apaga e recria as tabelas deste sistema. Rode npm install, npm run build e npm start. Abra http://localhost:3000.");
  paragraph("A sessao Bearer expira apos oito horas por padrao e pode ser configurada por SESSION_TTL_HOURS. GET /api/health verifica o banco.");

  heading("7. Endpoints principais");
  paragraph("POST /api/auth/login - login; GET /api/auth/me - usuario atual; POST /api/auth/logout - revogar sessao.");
  paragraph("GET/POST /api/clients, PUT/DELETE /api/clients/:id - consultar, cadastrar, editar e excluir clientes. GET/POST /api/equipment - consultar e cadastrar equipamentos. GET /api/appointments - consultar agenda. PATCH /api/appointments/:id/date - remarcar atendimento.");

  heading("8. Seguranca e observacoes");
  paragraph("Senhas usam scrypt. Tokens aleatorios de sessao sao persistidos somente como SHA-256. CPF e cifrado com AES-256-GCM e HMAC-SHA-256 e usado para detectar duplicidade. Guarde a chave de criptografia fora do repositorio: perde-la impede recuperar CPFs cifrados. A aplicacao foi preparada para demonstracao local; exposicao publica requer HTTPS, gestao segura de segredos, backups e revisao de seguranca.");
  paragraph("A interface serve arquivos estaticos pela mesma origem da API. O token Bearer e guardado no armazenamento local do navegador para a demonstracao academica.");

  doc.end();
  await finished;
}

function entity(doc, x, y, width, title, rows) {
  const headerHeight = 32;
  const rowHeight = 22;
  const height = headerHeight + rows.length * rowHeight + 12;
  doc.save().roundedRect(x, y, width, height, 8).fillAndStroke("#ffffff", "#bfccda");
  doc.save().roundedRect(x, y, width, headerHeight, 8).fillAndStroke("#e9f1ff", "#bfccda");
  doc.rect(x, y + headerHeight - 8, width, 8).fill("#e9f1ff");
  doc.fillColor("#17304e").font("Helvetica-Bold").fontSize(13).text(title, x + 12, y + 10, { width: width - 24, lineBreak: false });
  rows.forEach((row, index) => {
    const isKey = row.startsWith("PK") || row.startsWith("FK") || row.startsWith("UQ");
    doc.fillColor(isKey ? "#245bb5" : "#334155").font(isKey ? "Helvetica-Bold" : "Helvetica").fontSize(9.2)
      .text(row, x + 12, y + headerHeight + 7 + index * rowHeight, { width: width - 24, lineBreak: false, ellipsis: true });
  });
  doc.restore();
  return height;
}

async function writeDiagram() {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 30, info: { Title: "DER - Sistema de Assistencia Tecnica", Author: "Sistema de Assistencia Tecnica" } });
  const finished = attachPdf(doc, "der.pdf");
  const x = { users: 32, sessions: 570, clients: 32, equipment: 306, appointments: 580 };
  const w = { users: 235, sessions: 238, clients: 246, equipment: 258, appointments: 230 };
  const link = (x1, y1, x2, y2, oneX, oneY, manyX, manyY) => {
    doc.save().strokeColor("#55708e").lineWidth(1.7).moveTo(x1, y1).lineTo(x2, y2).stroke();
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const size = 6;
    doc.moveTo(x2, y2).lineTo(x2 - size * Math.cos(angle - 0.48), y2 - size * Math.sin(angle - 0.48))
      .moveTo(x2, y2).lineTo(x2 - size * Math.cos(angle + 0.48), y2 - size * Math.sin(angle + 0.48)).stroke();
    doc.fillColor("#38536e").font("Helvetica-Bold").fontSize(9).text("1", oneX, oneY).text("N", manyX, manyY);
    doc.restore();
  };

  doc.fillColor("#172536").font("Helvetica-Bold").fontSize(19).text("Sistema de Assistencia Tecnica - DER", 32, 27);
  doc.fillColor("#66788c").font("Helvetica").fontSize(9).text("Modelo relacional | PK: chave primaria | FK: chave estrangeira | UQ: unico", 32, 53);
  // Draw relationships behind the entities.
  link(x.users + w.users, 151, x.sessions, 151, 520, 139, 553, 139);
  link(x.clients + w.clients, 407, x.equipment, 407, 282, 394, 294, 394);
  link(x.equipment + w.equipment, 407, x.appointments, 407, 568, 394, 573, 394);

  entity(doc, x.users, 92, w.users, "USUARIOS", ["PK  id", "nome", "email (UQ)", "senha_hash", "ativo, criado_em"]);
  entity(doc, x.sessions, 92, w.sessions, "SESSOES", ["PK  token_hash", "FK  usuario_id -> usuarios.id", "expira_em", "criada_em"]);
  entity(doc, x.clients, 320, w.clients, "CLIENTES", ["PK  id", "nome, email (UQ)", "UQ  cpf_hash (HMAC)", "cpf_criptografado (AES-GCM)", "telefone, criado_em"]);
  entity(doc, x.equipment, 320, w.equipment, "EQUIPAMENTOS", ["PK  id", "FK  cliente_id -> clientes.id", "tipo, marca, modelo", "numero_serie (UQ)", "descricao, criado_em"]);
  entity(doc, x.appointments, 320, w.appointments, "AGENDAMENTOS", ["PK  id", "FK  equipamento_id -> equipamentos.id", "data_agendamento", "descricao, status", "criado_em"]);

  doc.fillColor("#64748b").font("Helvetica").fontSize(8.5)
    .text("Relacionamentos: usuario 1:N sessoes | cliente 1:N equipamentos | equipamento 1:N agendamentos", 32, 540);
  doc.end();
  await finished;
}

await writeDocumentation();
await writeDiagram();
console.log("PDFs gerados: documentacao.pdf e der.pdf");
