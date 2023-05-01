import { config } from "dotenv";
import { cleanEnv, str } from "envalid";

config();

export default cleanEnv(process.env, {
  BOT_KEY: str(),
  NODE_ENV: str(),
});
