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
    deactivate: flags.string({char: 'd', description: messages.getMessage('deactivateFlagDescription')}),
    activate: flags.string({char: 'a', description: messages.getMessage('activateFlagDescription')})
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
        IsActive: boolean;
    }

    let opResult;

    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const connection = await Connection.create({
        authInfo: await AuthInfo.create({ username: this.flags.targetusername })
      });
    
    const queryGetDeactivateUser = 'Select Id, IsActive From User Where username = \'' + this.flags.deactivate + '\'';
    const resultDeactivateUser = await connection.query<o2eUsers>(queryGetDeactivateUser);
       
    if (!resultDeactivateUser.records || resultDeactivateUser.records.length <= 0) {
       throw new SfdxError(messages.getMessage('errorNoUsers', [this.flags.deactivate]));
    }
    
    if (resultDeactivateUser.records && resultDeactivateUser.records[0].IsActive == false) {
       throw new SfdxError(messages.getMessage('errorCannotUpdateStatus', [this.flags.deactivate,"Inactive"]));
    }    

    const queryGetActivateUser = 'Select Id, IsActive From User Where username = \'' + this.flags.activate + '\'';
    const resultActivateUser = await connection.query<o2eUsers>(queryGetActivateUser);
       
    if (!resultActivateUser.records || resultActivateUser.records.length <= 0) {
       throw new SfdxError(messages.getMessage('errorNoUsers', [this.flags.activate]));
    }
    
    if (resultActivateUser.records && resultActivateUser.records[0].IsActive == true) {
       throw new SfdxError(messages.getMessage('errorCannotUpdateStatus', [this.flags.activate,"Active"]));
    }

    resultDeactivateUser.records[0].IsActive = false;
    if (resultDeactivateUser.records[0].Id) {
        opResult = await connection.sobject('User').update(resultDeactivateUser.records[0]);
    }

    resultActivateUser.records[0].IsActive = true;
    if (resultActivateUser.records[0].Id) {
        opResult = await connection.sobject('User').update(resultActivateUser.records[0]);
    }

    // Return an object to be displayed with --json
    return { orgId: this.org.getOrgId(), 
        DeactivateUser: [ 
            {Id: resultDeactivateUser.records[0].Id,
            Email: this.flags.deactivate,
            IsActive: resultDeactivateUser.records[0].IsActive 
            }
        ],
        ActivateUser: [ 
            {Id: resultActivateUser.records[0].Id,
            Email: this.flags.activate,
            IsActive: resultActivateUser.records[0].IsActive  
            }
        ]
    };
  }

//   private async validateUser(userEmail: string, userNewStatus: boolean) {
//     // The type we are querying for
//     interface o2eUsers {
//         Id: string;
//         Name: string;
//         IsActive: boolean;
//     }
    
//     const conn = this.org.getConnection();
//     const query = 'Select Id, Name, IsActive From User Where username = \'' + userEmail + '\'';

//     this.ux.log(query);

//     const resultUser = await conn.query<o2eUsers>(query);

//     if (!resultUser.records || resultUser.records.length <= 0) {
//         throw new SfdxError(messages.getMessage('errorNoUsers', [userEmail]));
//     }

//     if (resultUser.records[0].IsActive == userNewStatus) {
//         let status = (userNewStatus) ? "activated":"deactivated";
//         throw new SfdxError(messages.getMessage('errorCannotUpdateStatus', [userEmail,status]));
//     }

//     return true;
//   };
}
