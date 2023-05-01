import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import { isAddress } from "web3-utils";
import axios from "axios";
import env from "./env";
import express from "express";

interface Session {
  address?: string;
  token?: string;
  network?: string;
  amount?: string;
  menuStep?: any;
  menuData?: any;
}

const sessions = new Map<number, Session>();

function getSession(ctx: any): Session {
  const userId = ctx.from.id;
  let session = sessions.get(userId);

  if (!session) {
    session = {};
    sessions.set(userId, session);
  }

  return session;
}

const bot = new Bot(env.BOT_KEY);

const networkMenuMarkup = new InlineKeyboard()
  .text("Ethereum", "homestead")
  .text("Goerli", "goerli")
  .row()
  .text("Polygon", "matic")
  .text("Optimism", "optimism")
  .row()
  .text("Arbitrum One", "arbitrum")
  .row();

const EthereumtokenMenuMarkup = new InlineKeyboard()
  .text("ETH", "ETH")
  .text("WETH", "WETH")
  .row()
  .text("USDC", "USDC")
  .text("DAI", "DAI")
  .row()
  .text("USDT", "USDT")
  .text("WBTC", "WBTC")
  .row()
  .text("< Back", "back");

const PolygonTokenMenuMarkup = new InlineKeyboard()
  .text("MATIC", "MATIC")
  .text("WETH", "WETH")
  .row()
  .text("USDC", "USDC")
  .text("DAI", "DAI")
  .row()
  .text("USDT", "USDT")
  .text("WBTC", "WBTC")
  .row()
  .text("< Back", "back");

const inputMenuMarkup = new InlineKeyboard().text("< Back", "back");

const reviewMarkup = new InlineKeyboard()
  .text("Generate Payment Link ✅", "request")
  .row()
  .text("Cancel Request ⚠️", "cancel");

const settingMarkup = new InlineKeyboard()
  .text("Change address ⚙️", "change_address")
  .row()
  .text("Contact us 📣", "contact");

const progressBar = ["💪 ■□□□□", "💪 ■■□□□", "💪 ■■■□□", "💪 ■■■■□"];

bot.command("start", async (ctx) => {
  const session = getSession(ctx);
  session.menuStep = 0;
  session.address = undefined;
  session.token = undefined;
  session.network = undefined;
  session.amount = undefined;

  await ctx.reply(
    "Create cryptocurrency payment requests in just a few clicks!\n<a href='https://twitter.com/woop_pay'>Follow us on Twitter ></a>\n\n" +
      "Join <a href='https://t.me/woop_pay'>our channel</a> to receive updates and learn more about our product.",
    { parse_mode: "HTML", disable_web_page_preview: true }
  );
  await ctx.reply(
    "<b>How to get started?</b>\n\nEnter your Ethereum wallet address in the chat to start receiving payments.\n\n<i>⚠️ If you are not familiar with Ethereum wallet address, check this guide: <a href='https://ethereum.org/en/wallets/'>What's an Ethereum wallet?</a></i>",
    {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }
  );
});

bot.command("settings", async (ctx) => {
  const session = getSession(ctx);

  await ctx.reply(
    `Your address: ${session.address ? session.address : "Not defined"}`,
    {
      reply_markup: settingMarkup,
    }
  );
  session.menuStep = 0;
});

bot.command("create", async (ctx) => {
  const session = getSession(ctx);
  session.menuStep = 0;
  const progressBarText = progressBar[0];

  if (!session.address) {
    await ctx.reply(
      "No address detected. Enter your Ethereum wallet address to start receiving payments"
    );
  } else {
    await ctx.reply(
      `${progressBarText}\n\n<b>Your wallet address:\n</b>${session.address}\n` +
        "\n" +
        "Select the network to receive a payment",
      {
        parse_mode: "HTML",
        reply_markup: networkMenuMarkup,
      }
    );
    session.menuData = {
      networkMenuMarkup,
      EthereumtokenMenuMarkup,
      PolygonTokenMenuMarkup,
    };
    session.menuStep = 1;
  }
});

bot.command("help", async (ctx) => {
  const session = getSession(ctx);

  await ctx.reply(
    `<b>Woop Pay Bot</b> is used to create cryptocurrency payment requests. It supports several EVM networks (Ethereum, Polygon, Arbitrum, and Optimism) as well as native and some of the most known ERC20 tokens.\n\nThis bot is connected to our web application <a href='https://wooppay.xyz'>Woop Pay</a>. After entering the payment inputs, It will output a payment link with the required fields. By clicking the link, users will be redirected to the Woop Pay website where they can transfer the required amount.\n\nIf you need support, you can contact us via <a href='https://t.me/woop_pay'>our chat</a>`,
    {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }
  );
  session.menuStep = 0;
});

bot.on("message:text", async (ctx) => {
  const session = getSession(ctx);
  const input = ctx.message.text.trim();
  const progressBarText = progressBar[3];

  if (session.menuStep === 0) {
    if (!isAddress(input)) {
      await ctx.reply(
        "The address you entered is not valid. Please make sure you entered a correct Ethereum wallet address. An Ethereum wallet address starts with '0x' and consists of 42 characters."
      );
      return;
    }

    session.address = input;

    await ctx.reply(
      "Your wallet address is saved. You can now create a payment request using the command /create"
    );
  } else if (session.menuStep === 3) {
    const inputWithDot = input.replace(",", ".");
    if (!Number.isFinite(+inputWithDot) || +inputWithDot <= 0) {
      await ctx.reply("Invalid amount. Please try again.");
      return;
    }
    session.amount = inputWithDot;

    const reviewText = `<b>Your wallet address:</b> ${
      session.address
    }\n<b>Requested network:</b> ${
      session.network == "homestead"
        ? "Ethereum"
        : session.network == "matic"
        ? "Polygon"
        : session.network == "goerli"
        ? "Ethereum Goerli"
        : session.network == "optimism"
        ? "Optimism"
        : "Arbitrum One"
    }\n<b>Requested token:</b> ${session.token}\n<b>Requested amount:</b> ${
      session.amount
    }`;

    await ctx.reply(`${progressBarText}\n\n${reviewText}`, {
      parse_mode: "HTML",
      reply_markup: reviewMarkup,
    });

    session.menuStep = 4;
  }
});

bot.on("callback_query", async (ctx) => {
  const session = getSession(ctx);
  const progressIndex = session.menuStep;
  const progressBarText = progressBar[progressIndex];

  if (session.menuStep === 0) {
    const action = ctx.callbackQuery?.data;
    if (action === "change_address") {
      await ctx.editMessageText("Enter your new wallet address");
    } else if (action === "contact") {
      await ctx.editMessageText(
        "You can reach out to our team by joining <a href='https://t.me/woop_pay'>our chat</a>",
        {
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }
      );
    }
  } else if (session.menuStep === 1) {
    const network = ctx.callbackQuery?.data;

    if (!network) {
      await ctx.answerCallbackQuery({
        text: "Invalid selection. Please try again.",
        show_alert: true,
      });
      return;
    }

    session.network = network;

    //const { tokenMenuMarkup } = session.menuData;
    const token_menu =
      session.network == "matic"
        ? PolygonTokenMenuMarkup
        : EthereumtokenMenuMarkup;

    const reviewText = `<b>Your wallet address:</b> ${
      session.address
    }\n<b>Requested network:</b> ${
      session.network == "homestead"
        ? "Ethereum"
        : session.network == "matic"
        ? "Polygon"
        : session.network == "goerli"
        ? "Ethereum Goerli"
        : session.network == "optimism"
        ? "Optimism"
        : "Arbitrum One"
    }`;

    await ctx.editMessageText(
      `${progressBarText}\n\n${reviewText}\n\n Select the token to receive a payment`,
      {
        parse_mode: "HTML",
        reply_markup: token_menu,
      }
    );

    session.menuStep = 2;
  } else if (session.menuStep === 2) {
    const token = ctx.callbackQuery?.data;

    if (token === "back") {
      await ctx.editMessageText(
        `${progressBarText}\n\n<b>Your wallet address:\n</b>${session.address}\n` +
          "\n" +
          "Select the network to receive a payment",
        {
          parse_mode: "HTML",
          reply_markup: networkMenuMarkup,
        }
      );
      session.menuStep = 1;
    } else {
      if (!token) {
        await ctx.answerCallbackQuery({
          text: "Invalid selection. Please try again.",
          show_alert: true,
        });
        return;
      }

      session.token = token;

      const reviewText = `${progressBarText}\n\n<b>Your wallet address:</b> ${
        session.address
      }\n<b>Requested network:</b> ${
        session.network == "homestead"
          ? "Ethereum"
          : session.network == "matic"
          ? "Polygon"
          : session.network == "goerli"
          ? "Ethereum Goerli"
          : session.network == "optimism"
          ? "Optimism"
          : "Arbitrum One"
      }\n<b>Requested token:</b> ${session.token}`;

      await ctx.editMessageText(
        `${reviewText}\n\nEnter the requested ${
          session.token == "back" ? "" : session.token
        } amount in the message chat.\n`,
        {
          parse_mode: "HTML",
          reply_markup: inputMenuMarkup,
        }
      );

      session.menuStep = 3;
    }
  } else if (session.menuStep === 3) {
    const action = ctx.callbackQuery?.data;
    if (action == "back") {
      const token_menu =
        session.network == "matic"
          ? PolygonTokenMenuMarkup
          : EthereumtokenMenuMarkup;
      const reviewText = `<b>Your wallet address:</b> ${
        session.address
      }\n<b>Requested network:</b> ${
        session.network == "homestead"
          ? "Ethereum"
          : session.network == "matic"
          ? "Polygon"
          : session.network == "goerli"
          ? "Ethereum Goerli"
          : session.network == "optimism"
          ? "Optimism"
          : "Arbitrum One"
      }`;

      await ctx.editMessageText(
        `${progressBarText}\n\n${reviewText}\n\n Select the token to receive a payment`,
        {
          parse_mode: "HTML",
          reply_markup: token_menu,
        }
      );

      session.menuStep = 2;
    }
  } else if (session.menuStep === 4) {
    const action = ctx.callbackQuery?.data;

    if (action === "request") {
      const { network, token, amount, address } = session;

      if (!amount) {
        await ctx.reply("Invalid amount. Please try again.");
        return;
      }

      const data = {
        fromAddress: address,
        tokenName: token?.toUpperCase(),
        networkName: network,
        amount: +amount,
      };

      try {
        const response = await axios.post(
          "https://www.wooppay.xyz/api/create-woop",
          data
        );
        await ctx.editMessageText(
          `🎉🎉🎉\n\n<b>Payment request generated:</b> ${response.data.result}`,
          {
            parse_mode: "HTML",
          }
        );
      } catch (err) {
        console.error("Error generating payment request:", err);
        await ctx.reply(
          "Error generating payment request. Please try again later."
        );
      }
    } else if (action === "cancel") {
      await ctx.answerCallbackQuery("Canceled");
      await ctx.deleteMessage();
      await ctx.reply(
        "Payment request canceled! Create a new one using /start"
      );
    } else {
      await ctx.answerCallbackQuery({
        text: "Invalid selection. Please try again.",
        show_alert: true,
      });
    }
  }
});

bot.catch((err) => console.error(err));

if (env.NODE_ENV === "production") {
  // Use Webhooks for the production server
  const app = express();
  app.use(express.json());
  app.use(webhookCallback(bot, "express"));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Bot listening on port ${PORT}`);
  });
} else {
  // Use Long Polling for development
  bot.start();
}
