# Loja Online Skin Care — API

API REST em Node.js, Express, TypeScript e PostgreSQL, organizada em model/controller/routes. A aplicação usa o banco PostgreSQL já criado com o esquema da loja enviado.

## Requisitos

- Node.js 20 ou superior
- PostgreSQL com as tabelas `produtos`, `categorias`, `marcas` e `avaliacoes` criadas

## Configuração

1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env` e ajuste as credenciais do PostgreSQL (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD`).
3. Inicie em desenvolvimento com `npm run dev`.
4. Para compilar e executar a versão de produção, use `npm run build` e depois `npm start`.

Por padrão, a API inicia em `http://localhost:3000`. A porta pode ser alterada pela variável `PORT`.

## Endpoints

| Método | Endpoint | Descrição |
| --- | --- | --- |
| `GET` | `/` | Informações básicas da API |
| `GET` | `/health` | Estado da API e conexão com o banco |
| `GET` | `/api/products` | Lista produtos ativos, com filtros e paginação |
| `GET` | `/api/products/:id` | Detalhes de um produto ativo |
| `GET` | `/api/categories` | Lista categorias |
| `GET` | `/api/brands` | Lista marcas |

### Filtros de produtos

`GET /api/products` aceita os parâmetros opcionais `search`, `category` (slug), `brand`, `skinType`, `available`, `minPrice`, `maxPrice`, `page` e `limit`.

Exemplo: `/api/products?category=hidratantes&skinType=seca&available=true&page=1&limit=12`

A resposta da lista contém `data` e `pagination` (`page`, `limit`, `total` e `totalPages`). Preços são retornados como números, usando o preço promocional quando disponível.

## Observações

- As consultas usam parâmetros PostgreSQL para evitar interpolar entrada do usuário no SQL.
- Senhas de clientes devem ser armazenadas somente como hash; credenciais e segredos ficam no `.env`, que não deve ser versionado.
- A API atual cobre a leitura do catálogo. Fluxos de autenticação, carrinho, pedidos e pagamentos devem ser implementados com autenticação e validações próprias antes de expor operações de escrita.
