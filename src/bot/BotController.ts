import { ChatClient } from 'dank-twitch-irc'
import logger from '../core/logger';

import buttify, { shouldWeButt } from '../core/butt';
import servers from '../core/handlers/Servers';
import wordsDb from '../core/handlers/Words';
import baseConfig from '../config';

class BotController {
  public client = new ChatClient({
    username: baseConfig.botUsername,
    password: baseConfig.botPassword,
  });

  public connect = (): void => {
    this.client.on('ready', () => {
      logger.info('Welcome to ButtBot (Ravana Edition)');
      logger.info(
        "Remember! Isaac Buttimov's First Rule of Buttbotics: Don't let buttbot reply to buttbot."
      );
      logger.info('Connected to irc');
    });

    this.client.on('error', (error) => {
      logger.error(`Something went wrong. Reason: ${error.message}`);
    });

    this.client.connect();
    this.client.join(baseConfig.twitchChannel);
  };

  public prepare = (): void => {
    this.loadListeners();
  };

  private loadListeners = (): void => {
    this.client.on('PRIVMSG', (msg) => {
      logger.debug([msg.displayName, msg.channelName, msg.messageText]);

      this.processCommands(msg.displayName, msg.channelName, msg.messageText);
      this.handleButtChance(msg.displayName, msg.channelName, msg.messageText);
    });
  };

  public async processCommands(nick: string, channel: string, text: string): Promise<void> {
    if (nick === "Farbjodr" && text.startsWith("<map ")) {
      try {
        const parts = text.substring(5).split(" ");
        if (parts.length == 2) {
          wordsDb.createWord(parts[0], parts[1]);
          logger.debug(`Mapped ${parts[0]} -> ${parts[1]}`);
        }
      } catch (error) {
        logger.debug('Something went wrong processCommands', error);
      }
    }
  }

  public async handleButtChance(nick: string, channel: string, text: string): Promise<void> {
    if (nick === "Farbjodr" && text.startsWith("<map ")) {
      return;
    }
    logger.debug('Handling butt chance');
    try {
      const server = await servers.getServer(channel);

      const config = await server.getSettings();
      //logger.debug('Server config', { config });

      logger.debug(`Server lock is ${server.lock}`);

      // TODO configurable
      if (["ItsJust_Vlad"].includes(nick)) {
        logger.debug("ignore message from " + nick);
        return;
      }

      // This is a small in-memory lock to prevent the bot from spamming back to back messages
      server.lock -= 1;

      // negative server.lock makes triggering more likely
      let chanceToButt = config.chanceToButt;
      const intendedPercent = 100 * config.chanceToButt;
      const messagesSinceLastTrigger = config.buttBuffer - server.lock;
      //console.log("messagesSinceLastTrigger", messagesSinceLastTrigger, "intendedPercent", intendedPercent);
      if (messagesSinceLastTrigger > intendedPercent) {
        chanceToButt = (messagesSinceLastTrigger - config.buttBuffer) / 100;
        //console.log("increased chance to", chanceToButt);
      }

      // Do the thing to handle the butt chance here
      const rng = Math.random();
      console.log("current chance", chanceToButt, "current rng", rng);

      if (nick === "Farbjodr" && text.startsWith("<force ")) {
        chanceToButt = 1;
        server.lock = 0;
        text = text.substring(7);
      }
      if (
        (config.botUsername !== nick || config.breakTheFirstRuleOfButtbotics) &&
        server.lock <= 0 &&
        rng <= chanceToButt
      ) {
        // const availableWords = text.trim().split(' ');
        // const wordsButtifiable = availableWords.filter((w) => shouldWeButt(w));
        // TODO wordsDb is never updated, was discord-only logic, try reimplement it
        // const wordsWithScores = await wordsDb.getWords(wordsButtifiable);
        const { result, words } = await buttify(text);

        await this.client.say(channel, result);
        logger.debug('Send buttified message to channel', { result, words });

        server.lock = config.buttBuffer;
        server.trackButtification();
      }
    } catch (error) {
      logger.debug('Something went wrong handling butt chance', error);
    }
  }
}

export default BotController;
