import { Bot, InlineKeyboard } from "grammy";
import { isAddress } from "web3-utils";
import axios from "axios";
// import dotenv from "dotenv";
// dotenv.config({ path: `C:\Projects\WoopPayBot\.env` });
// import { resolve } from "path";
// import { config } from "dotenv";
// const envFilePath = resolve(__dirname, "..", ".env");
// const result = config({ path: envFilePath });

// if (result.error) {
//   throw result.error;
// }

// console.log(process.env);

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

//const bot = new Bot(`${process.env.BOT_KEY}`);
const bot = new Bot("5940096493:AAE_4flL-ab9YEH4MBQ9vrUyw-iJnTJw3xY");

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
    "Create cryptocurrency payment requests in just a few clicks.\n\n" +
      "Join <a href='https://t.me/woop_pay'>our channel</a> and <a href='https://twitter.com/woop_pay'>our Twitter</a> to receive updates and learn more about our product.\n",
    { parse_mode: "HTML", disable_web_page_preview: true }
  );
  await ctx.reply("Enter your wallet address to start receiving payments", {
    parse_mode: "HTML",
  });
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
      "No address detected. Enter your wallet address to start receiving payments"
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
    `Woop Pay Bot is a Telegram bot used to create cryptocurrency payment requests. It supports several EVM networks (Ethereum, Polygon, Arbitrum, and Optimism) as well as native and some of the most known ERC20 tokens. The bot is connected to our web application <a href='https://wooppay.xyz'>Woop Pay</a>. After entering the payment inputs, It will output a payment link with the required fields. By clicking the link, users will be redirected to the Woop Pay website where they can transfer the required amount.\nIf you require support, you can contact us via <a href='https://twitter.com/alerex_eth'>Twitter DM</a>`,
    {
      reply_markup: settingMarkup,
      parse_mode: "HTML",
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
      await ctx.reply("Invalid address. Please enter a valid wallet address.");
      return;
    }

    session.address = input;

    await ctx.reply(
      "Your wallet address is saved. You can now create a payment request using the command /create"
    );
  } else if (session.menuStep === 3) {
    const action = ctx.callbackQuery?.data;
    if (!Number.isFinite(+input) || +input <= 0) {
      await ctx.reply("Invalid amount. Please try again.");
      return;
    }
    session.amount = input;

    const reviewText = `<b>Your wallet address:</b> ${
      session.address
    }\n<b>Requested network:</b> ${
      session.network == "homestead" ? "Ethereum" : session.network
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
        "You can reach out to our team by using on the of the below options:\n-> <a href='https://twitter.com/alerex_eth'>Twitter DM</a>\n-> Mail to alessandro@wooppay.xyz"
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
      session.network == "polygon"
        ? PolygonTokenMenuMarkup
        : EthereumtokenMenuMarkup;

    const reviewText = `<b>Your wallet address:</b> ${
      session.address
    }\n<b>Requested network:</b> ${
      session.network == "homestead" ? "Ethereum" : session.network
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
        session.network == "homestead" ? "Ethereum" : session.network
      }\n<b>Requested token:</b> ${session.token}`;

      await ctx.editMessageText(
        `${reviewText}\n\nEnter the requested ${
          session.token == "back" ? "" : session.token
        } amount in the message chat (Example: 0.03).\n`,
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
        session.network == "polygon"
          ? PolygonTokenMenuMarkup
          : EthereumtokenMenuMarkup;
      const reviewText = `<b>Your wallet address:</b> ${
        session.address
      }\n<b>Requested network:</b> ${
        session.network == "homestead" ? "Ethereum" : session.network
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

bot.start();
