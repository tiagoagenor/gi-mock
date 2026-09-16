// Entrypoint de produção: `node server.js`
// Sobe o Next.js já compilado (rode `npm run build` antes).
// Porta via env PORT (padrão 80) e host via HOSTNAME (padrão 0.0.0.0).
const { createServer } = require("http");
const next = require("next");

const port = parseInt(process.env.PORT || "80", 10);
const hostname = process.env.HOSTNAME || "0.0.0.0";

const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => {
      handle(req, res);
    }).listen(port, hostname, () => {
      console.log(`GI-Mock pronto em http://${hostname}:${port}`);
    });
  })
  .catch((err) => {
    console.error("Falha ao iniciar o servidor:", err);
    process.exit(1);
  });
