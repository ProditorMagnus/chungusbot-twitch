/* eslint-disable consistent-return */
import db from '../db';
import Servers from './Servers';
import stats from './Stats';
import config, { ButtBotConfig } from '../../config';

export interface ServerType {
  _id: string;
  roles: string[];
  muted: boolean;
  buttifyCount: number;
  settings?: ButtBotConfig;
}

class Server {
  private db = db.servers;
  public id: string;
  public prepared = false;
  public lock = 0;

  public constructor(serverId: string) {
    this.id = serverId;
  }

  public async prepareServer(): Promise<ServerType> {
    return new Promise((resolve, reject): void => {
      this.db.findOne({ _id: this.id }, (err, server: ServerType) => {
        if (!server) {
          Servers.createServer(this.id)
            .then((newServer) => {
              this.prepared = true;
              return resolve(newServer);
            })
            .catch((e) => reject(e));
        } else {
          this.prepared = true;
          return resolve(server);
        }
      });
    });
  }

  public trackButtification = (): void => {
    this.db.update({ _id: this.id }, { $inc: { buttifyCount: 1 } });
    stats.trackButtification();
  };

  public getButtifyCount = (): Promise<number> =>
    new Promise((resolve, reject): void => {
      this.db.findOne({ _id: this.id }, (err, server: ServerType) => {
        if (!server) {
          return reject(new Error('Cant find server in database'));
        }

        return resolve(server.buttifyCount || 0);
      });
    });

  // TODO remove irrelevant server stuff
  public getSettings = (): Promise<ButtBotConfig> =>
    new Promise((resolve, reject): void => {
      this.db.findOne({ _id: this.id }, (err, server: ServerType) => {
        if (!server) {
          return reject(new Error('Cant find server in database'));
        }

        if (!server.settings) {
          return resolve(config);
        }

        const settings: Partial<ButtBotConfig> = {};

        settings.chanceToButt =
          server.settings.chanceToButt || config.chanceToButt;
        settings.buttBuffer =
          typeof server.settings.buttBuffer !== 'undefined'
            ? server.settings.buttBuffer
            : config.buttBuffer;
        settings.buttAI = server.settings.buttAI === 0 ? 0 : config.buttAI;

        const mergedSettings = Object.assign({}, config, settings);

        return resolve(mergedSettings);
      });
    });
}

export default Server;
