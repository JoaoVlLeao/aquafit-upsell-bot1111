import express from "express";
import bodyParser from "body-parser";
import qrcode from "qrcode-terminal";
import pkg from "whatsapp-web.js";
import chalk from "chalk";

const { Client, LocalAuth, MessageMedia } = pkg;

const app = express();
app.use(bodyParser.json());

// ----------------------
// INICIALIZA WHATSAPP
// ----------------------
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: "./session", // mantém sessão persistente no projeto
  }),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process",
      "--renderer-process-limit=1",
    ],
  },
});

client.on("qr", (qr) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
  console.log(chalk.cyan("\n📱 Escaneie o QR code no navegador:"));
  console.log(qrUrl);
});

client.on("ready", () => {
  console.log(chalk.green("✅ WhatsApp conectado e pronto!"));
});

client.initialize();

// ----------------------
// FILA DE MENSAGENS (anti-banimento)
// ----------------------
const messageQueue = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing || messageQueue.length === 0) return;

  isProcessing = true;
  const { phone, message, media } = messageQueue.shift();

  try {
    const formatted = phone.replace(/\D/g, "");
    const numberId = await client.getNumberId(formatted);
    if (!numberId) {
      console.log(chalk.red(`⚠️ O número ${phone} não tem WhatsApp.`));
      isProcessing = false;
      return;
    }

    const chat = await client.getChatById(numberId._serialized);
    await chat.sendMessage(media, { caption: message });
    console.log(chalk.green(`✅ Mensagem enviada para ${phone}`));
  } catch (err) {
    console.error(chalk.red("❌ Erro ao enviar mensagem:"), err);
  }

  // aguarda 5 minutos (300.000 ms) antes de enviar a próxima
  setTimeout(() => {
    isProcessing = false;
    processQueue();
  }, 5 * 60 * 1000);
}

// ----------------------
// ENDPOINT /shopify (Webhook)
// ----------------------
app.post("/shopify", async (req, res) => {
  try {
    const data = req.body;

    console.log(chalk.yellow("\n🔔 NOVO WEBHOOK RECEBIDO ---------------------"));
    console.log(`🧾 Pedido: ${data.name}`);
    console.log(`💰 Status financeiro: ${data.financial_status}`);
    console.log(`👤 Cliente: ${data.customer?.first_name || "não informado"}`);

    const phone =
      data.billing_address?.phone ||
      data.shipping_address?.phone ||
      data.customer?.phone ||
      data.phone ||
      null;

    console.log(`📞 Telefone: ${phone || "não informado"}`);
    console.log("------------------------------------------------");

    if (data.financial_status !== "paid") {
      console.log(chalk.gray(`⚠️ Pedido ${data.name} ignorado (status: ${data.financial_status})`));
      return res.status(200).send("Ignorado - não pago");
    }

    if (!phone) {
      console.log(chalk.red(`❌ Pedido ${data.name} sem telefone — não foi possível enviar mensagem.`));
      return res.status(200).send("Sem telefone");
    }

    const imageUrl =
      "https://udged.s3.sa-east-1.amazonaws.com/72117/ea89b4b8-12d7-4b80-8ded-0a43018915d4.png";
    const media = await MessageMedia.fromUrl(imageUrl);

    const message = `Oi *${data.customer?.first_name || "cliente"}*! 💖

Recebemos a confirmação do seu pedido *${data.name}*! 🛍️✨  
Agradecemos por confiar na *AquaFit Brasil* 💚

💥 E tem uma surpresa pra você:  
Durante as próximas horas, você ganha *30% OFF* em todo o site! 😍  
Use o cupom exclusivo: *FLZ30*

🔗www.aquafitbrasil.com

🩱 Vale para qualquer biquíni, maiô ou saída de praia!  
Mas corra — a promoção é por tempo limitado. 💨

Com carinho,  
*Equipe AquaFit Brasil* 💚💖`;

    messageQueue.push({ phone, message, media });
    console.log(chalk.magenta(`🕒 Pedido ${data.name} adicionado à fila (${messageQueue.length} pendente(s))`));

    processQueue();
    res.status(200).send("Mensagem adicionada à fila");
  } catch (err) {
    console.error(chalk.red("❌ Erro ao processar webhook:"), err);
    res.status(500).send("Erro interno");
  }
});

// ----------------------
// RESPOSTA AUTOMÁTICA (com filtro inteligente)
// ----------------------
client.on("message", async (msg) => {
  try {
    if (msg.fromMe) return;

    if (
      !msg.body ||
      msg.body === "undefined" ||
      msg.body.trim().length === 0 ||
      typeof msg.body !== "string"
    )
      return;

    if (msg.type !== "chat" || msg._data?.id?.fromMe || msg._data?.isNewMsg === false) return;

    const contato = msg._data?.notifyName || msg.from.split("@")[0];
    console.log(chalk.yellow(`💬 Mensagem recebida de ${contato}: ${msg.body}`));

    const resposta = `💚💖 Oi *${contato.split(" ")[0]}*! Tudo bem? 💖💚

Esse número é usado apenas para *mensagens automáticas* 🪄  
Para falar com nossa equipe de atendimento humano, envie uma mensagem para:  
📞 *+55 (19) 98773-6747*

Vamos adorar te atender por lá! 🩷💚  
Com carinho,  
*Equipe AquaFit Brasil* 🌸`;

    await msg.reply(resposta);
    console.log(chalk.green(`🤖 Resposta automática enviada para ${contato}`));
  } catch (err) {
    console.error(chalk.red("❌ Erro ao responder mensagem:"), err);
  }
});

// ----------------------
// SERVIDOR LOCAL
// ----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(chalk.blue(`🌐 Servidor rodando na porta ${PORT}`));
});
