const { Bot } = require("grammy");

// Create a bot object
const bot = new Bot("5940096493:AAE_4flL-ab9YEH4MBQ9vrUyw-iJnTJw3xY"); // <-- place your bot token in this string

// Register listeners to handle messages
bot.on("message:text", (ctx) => ctx.reply("Echo: " + ctx.message.text));

// Start the bot (using long polling)
bot.start();
