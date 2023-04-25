import { Bot, InlineKeyboard } from "grammy";
import { isAddress } from "web3-utils";
import axios from "axios";

interface Session {
  address?: string;
  token?: string;
  network?: string;
  amount?: string;
  menuStep?: any;
  menuData?: any;
}

const sessions = new Map<number, Session>();
let nextSessionId = 1;

function getSession(ctx: any): Session {
  const userId = ctx.from.id;
  let session = sessions.get(userId);

  if (!session) {
    session = {};
    sessions.set(userId, session);
  }

  return session;
}

const bot = new Bot("5940096493:AAE_4flL-ab9YEH4MBQ9vrUyw-iJnTJw3xY");

const networkMenuMarkup = new InlineKeyboard()
  .text("Ethereum Mainnet 💵", "homestead")
  .text("Ethereum Goerli", "goerli")
  .row()
  .text("Polygon", "matic")
  .text("Optimism", "optimism")
  .row()
  .text("Arbitrum", "arbitrum")
  .row();

const tokenMenuMarkup = new InlineKeyboard()
  .text("ETH", "ETH")
  .text("WETH", "WETH")
  .row()
  .text("USDC", "USDC")
  .text("DAI", "DAI")
  .row()
  .text("USDT", "USDT")
  .text("WBTC", "WBTC")
  .row();

const reviewMarkup = new InlineKeyboard()
  .text("Request", "request")
  .text("Cancel", "cancel");

bot.command("start", async (ctx) => {
  const session = getSession(ctx);
  session.menuStep = 0;

  await ctx.reply(
    "Welcome to my cryptocurrency payment request bot!\n" +
      "This is an application to create cryptocurrency payment requests."
  );
  await ctx.reply("Please enter your Ethereum address:");

  session.address = undefined;
  session.token = undefined;
  session.network = undefined;
  session.amount = undefined;
});

bot.on("message:text", async (ctx) => {
  const session = getSession(ctx);
  const input = ctx.message.text.trim();

  if (session.menuStep === 0) {
    if (!isAddress(input)) {
      await ctx.reply(
        "Invalid address. Please enter a valid Ethereum address."
      );
      return;
    }

    session.address = input;

    await ctx.reply("Select which network you want to use.", {
      parse_mode: "HTML",
      reply_markup: networkMenuMarkup,
    });

    session.menuStep = 1;
    session.menuData = { networkMenuMarkup, tokenMenuMarkup };
  } else if (session.menuStep === 3) {
    if (!Number.isFinite(+input) || +input <= 0) {
      await ctx.reply("Invalid amount. Please try again.");
      return;
    }

    session.amount = input;

    const reviewText = `Network: ${session.network}\nToken: ${session.token}\nAmount: ${session.amount}`;

    await ctx.reply(`Payment request preview:\n${reviewText}`, {
      parse_mode: "HTML",
      reply_markup: reviewMarkup,
    });

    session.menuStep = 4;
  }
});

// bot.on("callback_query", async (ctx) => {
//   const session = getSession(ctx);

//   if (session.menuStep === 1) {
//     const network = ctx.callbackQuery?.data;

//     if (!network) {
//       await ctx.answerCallbackQuery({
//         text: "Invalid selection. Please try again.",
//         show_alert: true,
//       });
//       return;
//     }

//     session.network = network;

//     const { tokenMenuMarkup } = session.menuData;

//     await ctx.editMessageText("Select which token you want to request:", {
//       parse_mode: "HTML",
//       reply_markup: tokenMenuMarkup,
//     });

//     session.menuStep = 2;
//   } else if (session.menuStep === 2) {
//     const token = ctx.callbackQuery?.data;

//     if (!token) {
//       await ctx.answerCallbackQuery({
//         text: "Invalid selection. Please try again.",
//         show_alert: true,
//       });
//       return;
//     }

//     session.token = token;

//     const reviewText = `Network: ${session.network}\nToken: ${session.token}`;

//     await ctx.reply(
//       `You have selected:\n${reviewText}\n\nEnter the amount to request:`
//     );

//     session.menuStep = 3;
//   }
// });

bot.on("callback_query", async (ctx) => {
  const session = getSession(ctx);

  if (session.menuStep === 1) {
    const network = ctx.callbackQuery?.data;

    if (!network) {
      await ctx.answerCallbackQuery({
        text: "Invalid selection. Please try again.",
        show_alert: true,
      });
      return;
    }

    session.network = network;

    const { tokenMenuMarkup } = session.menuData;

    const reviewText = `Address: ${session.address}\nNetwork: ${session.network}`;

    await ctx.editMessageText(
      `Select which token you want to request on ${session.network}.\n${reviewText}`,
      {
        parse_mode: "HTML",
        reply_markup: tokenMenuMarkup,
      }
    );

    session.menuStep = 2;
  } else if (session.menuStep === 2) {
    const token = ctx.callbackQuery?.data;

    if (!token) {
      await ctx.answerCallbackQuery({
        text: "Invalid selection. Please try again.",
        show_alert: true,
      });
      return;
    }

    session.token = token;

    const reviewText = `Address: ${session.address}\nNetwork: ${session.network}\nToken: ${session.token}`;

    await ctx.editMessageText(
      `Payment request preview:\n${reviewText}\nEnter the requested ${session.token} amount.`,
      {
        parse_mode: "HTML",
      }
    );

    session.menuStep = 3;
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
        console.log(response);
        await ctx.reply(`Payment request generated: ${response.data.result}`);
      } catch (err) {
        console.error("Error generating payment request:", err);
        await ctx.reply(
          "Error generating payment request. Please try again later."
        );
      }
    } else if (action === "cancel") {
      await ctx.answerCallbackQuery("Canceled");
      await ctx.deleteMessage();
      await ctx.reply("Payment request canceled! Create a new one /start");
      //await ctx.api.command('start');
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
