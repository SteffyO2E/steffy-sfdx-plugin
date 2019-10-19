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
    object: flags.string({char: 'o', description: messages.getMessage('objectFlagDescription')}),
    field: flags.string({char: 'f', description: messages.getMessage('fieldFlagDescription')})
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static supportsDevhubUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<AnyJson> {
    if (this.org.getOrgId() == '00D15000000GZ4bEAG') {
        throw new SfdxError(messages.getMessage('errorCannotRunPluginInProd'));
    }

    var o2eObjects:string[] = new Array("Account","Contact","Lead")
    let scrubResult;

    if (o2eObjects.indexOf(this.flags.object) < 0) {
        throw new SfdxError(messages.getMessage('errorInvalidObject'));
    }

    interface o2eEmails {
        Id: string;       
        Email__c: string;
    }

    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const connection = await Connection.create({
        authInfo: await AuthInfo.create({ username: this.flags.targetusername })
      });
    
    const queryEmails = 'Select Id, ' + this.flags.field + ' From ' + this.flags.object + ' where ' + this.flags.field + '!= \'\' and (not email__c like \'%invalidX\') LIMIT 5';
    const resultEmails = await connection.query<o2eEmails>(queryEmails);

    if (resultEmails.totalSize > 0) {
        var arr_scrubEmails:any[] = new Array();
        
        // loop thru all records and scrub email address
        for (var i=0; i<resultEmails.totalSize; i++) {
            resultEmails.records[i].Email__c = resultEmails.records[i].Email__c + '.invalidX';
            console.log(resultEmails.records[i].Id);
            console.log(resultEmails.records[i].Email__c);
            arr_scrubEmails.push(resultEmails.records[i]);
        }

        // update records
        scrubResult = await connection.sobject(this.flags.object).update(arr_scrubEmails);
    }

    // Check that all emails are scrubbed
    
    // Return an object to be displayed with --json
    return { 
        orgId: this.org.getOrgId(),
        scrubbed: [ 
            {object: this.flags.object,
             field: this.flags.field,
             recordCount: arr_scrubEmails.length,
             result: scrubResult
            }
        ]
    };
  }
}
