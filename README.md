# Roleta SCNET

Aplicativo web (funciona no navegador de iOS e Android, sem instalação) para
eventos e feiras: o visitante lê um QR code, preenche um cadastro (nome, CPF,
telefone, cidade), gira uma roleta configurável e recebe um resultado. Tudo é
controlado por um painel administrador.

## Estrutura

```
backend/   API (Node.js + Express + SQLite via node:sqlite)
frontend/  App do participante + painel admin (React + Vite)
```

## Como rodar localmente

### 1. Backend

```bash
cd backend
npm install
npm run seed   # cria o admin padrão e uma campanha de exemplo
npm run dev    # http://localhost:4000
```

Requer Node.js 22.5 ou mais recente (usa o módulo nativo `node:sqlite`,
sem nenhuma dependência que precise compilar código nativo — funciona
direto no Windows sem Visual Studio Build Tools).

Admin criado pelo seed: `admin@scnet.com.br` / `scnet2026`
(pode ser alterado via variáveis de ambiente `ADMIN_EMAIL` / `ADMIN_PASSWORD`
antes de rodar `npm run seed`).

### 2. Frontend

Em outro terminal (o backend precisa continuar rodando):

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
```

- Participante: `http://localhost:5173/c/feira-2026`
- Admin: `http://localhost:5173/admin` (login: `admin@scnet.com.br` / `scnet2026`)
- Consultor: `http://localhost:5173/consultor` (login: `consultor@scnet.com.br` / `consultor2026`)

Em produção, use o `Dockerfile` na raiz do projeto — veja a seção **Deploy**
abaixo.

## Deploy (EasyPanel ou qualquer host com Docker)

O `Dockerfile` na raiz compila o frontend e sobe um único container: o
backend serve a API (`/api`), os vídeos enviados (`/uploads`) e o próprio
app React (tudo mais) na mesma porta — não precisa de subdomínio separado
para o admin, ele já é uma rota (`/admin`) dentro do mesmo app.

No EasyPanel:

1. Crie um app do tipo **App** apontando para este repositório Git, com
   **Build method: Dockerfile** (o `Dockerfile` já está na raiz).
2. Configure o domínio (ex: `roleta.scnet.com.br`) apontando para a porta
   `4000` do container.
3. **Adicione um volume persistente montado em `/app/data`** — é onde ficam
   o banco SQLite e os vídeos enviados. Sem isso, cada novo deploy apaga tudo.
4. Configure as variáveis de ambiente antes do primeiro deploy (senão o app
   sobe com as senhas de exemplo do repositório, o que não é seguro):
   - `JWT_SECRET` — qualquer string longa e aleatória
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — login do administrador principal
   - `CONSULTOR_EMAIL` / `CONSULTOR_PASSWORD` — login do consultor de exemplo
     (opcional; crie os consultores de verdade depois pela aba Usuários)
5. Publique. Na primeira subida, o container roda o `seed` automaticamente
   (ele é seguro rodar de novo a cada deploy — só cria o que ainda não existe).

Depois disso, tanto `roleta.scnet.com.br` (participante) quanto
`roleta.scnet.com.br/admin` e `roleta.scnet.com.br/consultor` já funcionam.

## O que já está implementado

- **Cadastro do participante**: nome, CPF, telefone e cidade — cada campo
  pode ser tornado obrigatório/opcional pelo admin (CPF é sempre validado).
- **Validação de CPF**: dígito verificador matemático real, mais bloqueio de
  CPF já usado **naquela campanha específica** (o mesmo CPF pode participar
  novamente em uma campanha nova/ano seguinte).
- **Motor de sorteio no backend** (nunca no navegador): decide o resultado,
  debita o estoque do prêmio de forma transacional e só então informa o
  frontend, que anima a roleta até o resultado já definido.
- **Regra de cidade "invisível" ao usuário**: cidades atendidas ficam em uma
  lista configurável. Se a cidade do participante não estiver na lista (ou
  estiver marcada como não atendida), ele participa normalmente, a roleta
  gira normalmente, mas o sorteio só considera as opções "sem prêmio" — sem
  nenhuma mensagem de bloqueio ao usuário. Internamente o registro fica salvo
  com a cidade e a flag de elegibilidade, para relatórios e futura geração de
  leads comerciais.
- **Roleta 100% configurável**: quantidade de opções, textos, cores, peso de
  probabilidade por opção, estoque/quantidade de prêmios por opção, prêmio
  restrito a cidades específicas ou "todas", vídeo de vitória por prêmio
  (upload direto de arquivo pelo painel, ou colar uma URL), mensagem de
  retirada.
- **Painel admin**: campanhas (uma por evento/feira, cada uma com sua própria
  URL/QR code e base de participantes isolada), textos e cores, roleta e
  prêmios (com upload de vídeo para prêmios e para opções "sem prêmio"),
  cidades atendidas, participantes (busca, filtro por cidade e por resultado,
  ordenação, exportação CSV, marcar prêmio como retirado, limpar base da
  campanha), painel com métricas, QR code para impressão e cadastro de
  usuários (administradores e consultores).
- **Consentimento (LGPD)**: checkbox obrigatório no formulário, com texto
  configurável, antes de o participante poder girar a roleta.
- **Área do consultor** (`/consultor`): login próprio, separado do admin.
  Consultores só enxergam a lista de participantes (para marcar prêmios como
  entregues) e o QR Code de cada campanha — não têm acesso a criar/editar
  campanhas, prêmios, cidades, exportar CSV ou limpar a base. Administradores
  criam contas de consultor na aba **Usuários** do painel admin.

## Upload de vídeo do prêmio

Na aba **Roleta & Prêmios**, ao criar/editar uma opção do tipo "Prêmio", há
um campo de arquivo para enviar o vídeo (MP4, WebM, OGG ou MOV, até 50MB). O
arquivo fica salvo em `backend/uploads/` e é servido pelo próprio backend em
`/uploads/<arquivo>` — não precisa de link externo nem de conta em serviço de
vídeo. Também dá pra colar uma URL manualmente se preferir hospedar em outro
lugar.

## Próximos passos sugeridos (não incluídos nesta primeira versão)

- Trocar SQLite por PostgreSQL para produção com múltiplos eventos simultâneos
  em maior escala (o schema em `backend/src/db.js` foi desenhado para migrar
  fácil).
- Política de retenção/exclusão de dados por campanha.
