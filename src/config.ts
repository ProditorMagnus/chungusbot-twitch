import dotenv from 'dotenv';

dotenv.config();

// TODO remove unsupported values
export interface ButtBotConfig {
  botUsername: string;
  botPassword: string;
  twitchChannel: string;
  meme: string;
  minimumWordsBeforeButtification: number;
  wordsToPossiblyButt: number;
  negativeThreshold: number;
  chanceToButt: number;
  buttBuffer: number;
  buttAI: 0 | 1;
  breakTheFirstRuleOfButtbotics: boolean;
  apiPort: number;
}

const config: ButtBotConfig = {
  botUsername: process.env.BOT_USERNAME,
  botPassword: process.env.BOT_PASSWORD,
  twitchChannel: process.env.TWITCH_CHANNEL,
  apiPort: Number(process.env.API_PORT) || 3000,
  meme: process.env.BOT_MEME || 'butt',
  minimumWordsBeforeButtification:
    Number(process.env.BOT_MINIMUM_BEFORE_BUTTIFY) || 3,
  wordsToPossiblyButt: Number(process.env.BOT_WORDS_TO_POSSIBLY_BUTT) || 3,
  negativeThreshold: Number(process.env.BOT_NEGATIVE_THRESHOLD) || -10,
  chanceToButt: parseFloat(process.env.BOT_CHANCE || "0") || 0,
  buttBuffer: Number(process.env.BOT_BUTT_BUFFER) || 10,
  buttAI: 0,
  // WARNING
  // IF YOU CHANGE THE FOLLOWING THE POLICE CAN MAYBE TAKE YOU TO JAIL
  breakTheFirstRuleOfButtbotics: false,
};

export default config;
