// Local SMTP server for tests: accepts every message and serves them as JSON.
//   SMTP  : localhost:2525   (point EMAIL_PROVIDER=smtp SMTP_HOST=localhost SMTP_PORT=2525 at it)
//   HTTP  : localhost:2580/messages[?to=]   DELETE /messages to clear
import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";
import http from "node:http";

const messages = [];
const smtp = new SMTPServer({
  authOptional: true,
  disabledCommands: ["STARTTLS"],
  onData(stream, _session, cb) {
    simpleParser(stream).then((m) => {
      messages.push({ to: m.to?.text ?? "", from: m.from?.text ?? "", subject: m.subject ?? "", text: m.text ?? "", html: typeof m.html === "string" ? m.html : "", date: Date.now() });
      cb();
    }, cb);
  },
});
smtp.listen(Number(process.env.SMTP_PORT ?? 2525), () => console.log("smtp listening"));

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    if (url.pathname !== "/messages") return res.writeHead(404).end();
    if (req.method === "DELETE") { messages.length = 0; return res.writeHead(204).end(); }
    const to = url.searchParams.get("to");
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(to ? messages.filter((m) => m.to.includes(to)) : messages));
  })
  .listen(Number(process.env.MAIL_HTTP_PORT ?? 2580), () => console.log("mail http listening"));
