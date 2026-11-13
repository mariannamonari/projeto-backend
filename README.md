# Oficina — Sistema de Assistência Técnica

Aplicação web com login e sessão expirada, módulos de clientes, equipamentos e agendamentos, API Express/TypeScript e banco PostgreSQL.

## Requisitos para executar

- Node.js 20 ou superior
- PostgreSQL 16 ou superior recomendado (o servidor deste ambiente foi confirmado como PostgreSQL 18.1)

## Preparar o banco e o ambiente

1. Crie um banco vazio chamado `assistencia_tecnica` no PostgreSQL.
2. Copie `.env.example` para `.env` e informe os dados do seu PostgreSQL. Defina uma chave privada de 64 caracteres hexadecimais em `CPF_ENCRYPTION_KEY`; o valor do exemplo serve somente para demonstração e nunca deve ser usado em produção.
3. Execute `npm run db:init` **uma única vez** no banco vazio, confirmando a operação destrutiva no PowerShell com `$env:CONFIRM_RESET="YES"` e, em seguida, `npm run db:init`. O script apaga e recria as tabelas deste sistema. O `init.sql` também pode ser rodado pelo pgAdmin.
4. Instale as dependências e compile com `npm install` e `npm run build`.
5. Inicie com `npm run dev` ou `npm start` e abra `http://localhost:3000`.

O painel é servido pelo próprio backend na pasta `sistema`. `GET /api/health` verifica a conexão com PostgreSQL. A variável `SESSION_TTL_HOURS` configura a duração da sessão; o padrão é oito horas.

## Usuário de demonstração

`ana@assistencia.local` — senha `Assist@123`. O script contém mais duas contas demonstrativas com a mesma senha inicial. Troque ou remova essas contas antes de expor a aplicação.

## Módulos da aplicação

- **Clientes:** busca por nome/e-mail/telefone, cadastro, edição e exclusão protegida por relacionamentos.
- **Equipamentos:** cadastro sempre vinculado a um cliente existente.
- **Agendamentos:** lista cronológica com os dados do cliente/equipamento e atualização de data e hora.
- **Autenticação:** sessão Bearer persistida por hash no banco, expiração configurável e logout.

## Documentação e entregas

- [documentacao.md](documentacao.md): requisitos funcionais, infraestrutura, instruções e rotas.
- [der.svg](der.svg): diagrama entidade-relacionamento em formato vetorial.
- `documentacao.pdf` e `der.pdf`: entregáveis prontos, gerados com `npm run export:docs`.
- [init.sql](init.sql): criação das tabelas e pelo menos três registros em cada tabela.

A documentação registra PostgreSQL 18.1, versão consultada no servidor configurado neste ambiente. Se a entrega usar outro servidor, confirme a versão com `SELECT version();`.

## Segurança e limitações

Senhas usam scrypt. O CPF é cifrado com AES-256-GCM; um HMAC-SHA-256 permite verificar unicidade sem armazenar o CPF em texto puro. A chave de criptografia não deve ser compartilhada nem versionada; trocar/perder a chave torna os CPFs já gravados indecifráveis. O token fica no armazenamento local do navegador para facilitar a demonstração acadêmica; uma implantação pública requer HTTPS, gestão de segredos, política de backup e revisão de segurança.
