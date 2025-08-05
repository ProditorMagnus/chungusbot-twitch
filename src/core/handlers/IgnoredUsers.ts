import db from '../db';

export interface KnownUser {
  _id: string;
  ignored: boolean;
}

class IgnoredUsers {
  private db = db.ignoredUsers;
  private cachedIgnoredUsers: string[];

  public addIgnoredUser = (userName: string): Promise<KnownUser> =>
    new Promise((resolve, reject): void => {
      this.db.insert(
        {
          _id: userName,
          ignored: true,
        },
        (err, result: KnownUser): void => {
          if (result) {
            this.cachedIgnoredUsers.push(userName);
            return resolve(result);
          }

          return reject(err);
        }
      );
    });

  public getIgnoredUsers = (): Promise<KnownUser[]> =>
    new Promise((resolve, reject): void => {
      this.db.find(
        { ignored: true },
        (err, result: KnownUser[]): void => {
          if (err) {
            reject(err);
          }

          this.cachedIgnoredUsers = result.map(u => u._id);
          return resolve(result);
        }
      );
    });

  public isUserIgnored = (userName: string): boolean =>
    this.cachedIgnoredUsers.includes(userName);
}

const ignoredUsersDb = new IgnoredUsers();

export default ignoredUsersDb;
