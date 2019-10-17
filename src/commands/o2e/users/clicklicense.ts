import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError, AuthInfo, Connection } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('mytest', 'org');

export default class Org extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    account: flags.string({char: 'a', description: messages.getMessage('accountFlagDescription')}),
    mode: flags.string({char: 'm', description: messages.getMessage('modeFlagDescription')})
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static supportsDevhubUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<AnyJson> {

    interface o2eUsers {
      Id: string;
    }

    interface clickLicense {
        Id?: string;
        userId: string;
        packageLicenseId: string;
    }

    let opResult;

    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const connection = await Connection.create({
        authInfo: await AuthInfo.create({ username: this.flags.targetusername })
      });
    
    const queryUser = 'Select Id From User Where username = \'' + this.flags.account + '\'';
    const resultUser = await connection.query<o2eUsers>(queryUser);
       
    if (!resultUser.records || resultUser.records.length <= 0) {
       throw new SfdxError(messages.getMessage('errorNoUsers', [this.flags.account]));
    }
    
    const queryLicense = 'Select Id From UserPackageLicense Where userId = \'' + resultUser.records[0].Id + '\'';
    const resultLicense = await connection.query<clickLicense>(queryLicense);

    const queryPkgLicense = 'SELECT Id FROM PackageLicense WHERE NamespacePrefix = \'CKSW_SRVC\'';
    const resultPkgLicense = await connection.query<clickLicense>(queryPkgLicense);
    
    if (this.flags.mode == 'add') {
      if (resultLicense.records.length > 0) {
        throw new SfdxError(messages.getMessage('errorCannotAddClickLicense', [this.flags.account]));
      }

      var newLicense:clickLicense = {userId:resultUser.records[0].Id,packageLicenseId:resultPkgLicense.records[0].Id};

      opResult = await connection.sobject('UserPackageLicense').create(newLicense);
    }
    else if (this.flags.mode == 'remove') {
      if (!resultLicense.records || resultLicense.records.length <= 0) {
        throw new SfdxError(messages.getMessage('errorNoLicenseToRemove', [this.flags.account]));
      }

      opResult = await connection.sobject('UserPackageLicense').delete(resultLicense.records[0].Id);
    }

    // Return an object to be displayed with --json
    return { orgId: this.org.getOrgId(), 
        user: this.flags.account,
        mode: this.flags.mode,
        result: opResult
    };
  }
}