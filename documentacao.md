# Documentação — Sistema de Assistência Técnica

## Objetivo

Aplicação web para uma equipe de assistência técnica cadastrar clientes, registrar equipamentos, consultar a agenda de manutenção e remarcar atendimentos. O acesso às áreas de gestão é restrito a usuários autenticados.

## Requisitos funcionais

| ID | Requisito | Descrição |
| --- | --- | --- |
| RF01 | Autenticar usuário | Validar e-mail e senha de uma conta ativa; rejeitar credenciais incorretas sem liberar os módulos protegidos. |
| RF02 | Controlar sessão | Criar sessão após o login, expirá-la após o período configurado e permitir logout imediato. |
| RF03 | Gerenciar clientes | Listar e pesquisar clientes por nome, e-mail ou telefone, cadastrar novos clientes, editar dados e excluir apenas quando não houver equipamento vinculado. |
| RF04 | Proteger dados pessoais | Armazenar senha em hash scrypt e CPF cifrado com AES-256-GCM; usar HMAC para unicidade sem armazenar CPF em claro. |
| RF05 | Cadastrar equipamentos | Cadastrar equipamento com tipo, marca, modelo, número de série e cliente existente obrigatório. |
| RF06 | Consultar agenda | Listar agendamentos em ordem cronológica, mostrando cliente e equipamento relacionados. |
| RF07 | Remarcar atendimento | Alterar e persistir a data e hora de um agendamento existente. |
| RF08 | Identificar usuário e navegar | Exibir o nome autenticado, oferecer saída do sistema e navegação entre clientes, equipamentos e agendamentos. |

## Requisitos de infraestrutura

| Item | Tecnologia / versão |
| --- | --- |
| SGBD | PostgreSQL 18.1 (servidor configurado no ambiente de desenvolvimento; versão consultada com `SELECT version();`). |
| Linguagem | TypeScript 5.9.3 (compilado para JavaScript/Node.js). |
| Runtime | Node.js 24.11.0 no ambiente de implementação; conferir no computador de apresentação com `node --version`. |
| Framework HTTP | Express 5.3.0. |

> Se o sistema for apresentado em outro computador/servidor, confira se ele usa a mesma versão com `SELECT version();`.

## Modelo de dados

O DER está no arquivo [der.svg](der.svg). As chaves estrangeiras e regras de exclusão estão definidas em [init.sql](init.sql): clientes não podem ser excluídos se tiverem equipamentos; equipamentos não podem ser removidos se tiverem agendamentos; sessões são removidas junto com seu usuário.

## Acesso de demonstração

O script de inicialização cria três usuários de demonstração com a mesma senha inicial `Assist@123`:

- `ana@assistencia.local`
- `bruno@assistencia.local`
- `carla@assistencia.local`

Troque/remova essas contas antes de disponibilizar o sistema publicamente. Os clientes do script usam CPFs fictícios, cifrados de demonstração.

## Executar o sistema

1. Crie um banco PostgreSQL vazio chamado `assistencia_tecnica`.
2. Ajuste o `.env` local conforme o [.env.example](.env.example), incluindo credenciais próprias e uma chave secreta para CPF. Não publique o `.env`.
3. Execute `npm run db:init` uma única vez nesse banco vazio; no PowerShell, confirme com `$env:CONFIRM_RESET="YES"` e rode `npm run db:init`. Alternativamente, rode `init.sql` no pgAdmin. O script apaga e recria as tabelas listadas; não rode em um banco com dados que deseja manter.
4. Execute `npm install`, `npm run build` e `npm start`; durante o desenvolvimento, use `npm run dev`.
5. Abra `http://localhost:3000`.

## API

Rotas públicas: `POST /api/auth/login` e `GET /api/health`. As outras rotas requerem `Authorization: Bearer <token>`.

| Método | Rota | Ação |
| --- | --- | --- |
| POST | `/api/auth/login` | Login; retorna token com expiração e usuário. |
| GET | `/api/auth/me` | Consulta o usuário da sessão atual. |
| POST | `/api/auth/logout` | Revoga a sessão atual. |
| GET | `/api/clients?q=termo` | Lista e pesquisa clientes. |
| POST | `/api/clients` | Cadastra cliente. |
| PUT | `/api/clients/:id` | Edita cliente; CPF pode ficar inalterado omitindo-o. |
| DELETE | `/api/clients/:id` | Exclui cliente sem equipamentos relacionados. |
| GET | `/api/equipment` | Lista equipamentos e clientes associados. |
| POST | `/api/equipment` | Cadastra equipamento vinculado a cliente existente. |
| GET | `/api/appointments` | Lista agenda cronologicamente com os dados relacionados. |
| PATCH | `/api/appointments/:id/date` | Atualiza data e hora do agendamento. |

## Proteção e limitações

Senhas são verificadas com scrypt; tokens de sessão aleatórios são armazenados apenas como SHA-256 e expiram por padrão após oito horas (`SESSION_TTL_HOURS`). CPFs são cifrados com AES-256-GCM e a busca de duplicidade usa HMAC-SHA-256. A chave `CPF_ENCRYPTION_KEY` é necessária para criar clientes e deve ser guardada fora do repositório, com backup seguro: perder ou trocar essa chave impede descriptografar os CPFs já gravados. O painel usa token Bearer no armazenamento local do navegador e foi preparado para execução local/demonstração; publicação real requer HTTPS, gestão de segredos e revisão de segurança.
