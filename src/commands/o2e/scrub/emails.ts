import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError, AuthFields } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { Connection } from 'jsforce';
import { isNullOrUndefined } from 'util';

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
    const jsforce = require('jsforce');

    async function getJsforceConnection(authFields: AuthFields): Promise<Connection> {
      var conn = new jsforce.Connection({
          instanceUrl : authFields.instanceUrl,
          accessToken : authFields.accessToken
      });
  
      return conn;
    }

    if (this.org.getOrgId() == '00D15000000GZ4bEAG') {
        throw new SfdxError(messages.getMessage('errorCannotRunPluginInProd'));
    }

    //if (this.flags.targetusername.substring(0,27) != 'O2E.Dataload@o2ebrands.com.') {
    if (this.flags.targetusername.substring(0,29) != 'stephanie.wong@o2ebrands.com.') {
      throw new SfdxError(messages.getMessage('errorInvalidAuthUser'));
    }

    var o2eObjects:string[] = new Array("Account","Contact","Lead");
    var o2eFields:string[] = new Array("Email__c","Email");

    if (o2eObjects.indexOf(this.flags.object) < 0) {
        throw new SfdxError(messages.getMessage('errorInvalidObject'));
    }

    if (o2eFields.indexOf(this.flags.field) < 0) {
      throw new SfdxError(messages.getMessage('errorInvalidField'));
    }

    let scrubResult;
    let notScrubbedCount = 0;

    interface o2eEmails {
        Id: string;
        Email__c?: string;
        Email?: string;
    }

    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const connection = await getJsforceConnection(this.org.getConnection().getConnectionOptions());

    const queryEmails = 'Select Id, ' + this.flags.field + ' From ' + this.flags.object + ' where ' + this.flags.field + '!= \'\' and (not ' + this.flags.field + ' like \'%invalidX\') order by Id';
    var resultEmails = await connection.query<o2eEmails>(queryEmails);

    if (resultEmails.records.length > 0) {
      var arr_scrubEmails:any[] = new Array();
      var count = resultEmails.records.length;

      while (count > 0) {
        // loop thru all records and scrub email address
        if (this.flags.object == 'Account') {
          for (var i=0; i<resultEmails.records.length; i++) {
              resultEmails.records[i].Email__c = resultEmails.records[i].Email__c + '.invalidX';
              arr_scrubEmails.push(resultEmails.records[i]);
          }
        }
        else {
            for (var i=0; i<resultEmails.totalSize; i++) {
              resultEmails.records[i].Email = resultEmails.records[i].Email + '.invalidX';
              arr_scrubEmails.push(resultEmails.records[i]);
          }
        }

        if (!isNullOrUndefined(resultEmails.nextRecordsUrl)) {
          resultEmails = await connection.queryMore<o2eEmails>(resultEmails.nextRecordsUrl);
          count = resultEmails.records.length;
        }
        else {
          count = 0;
        }        
      }

      console.log('arr_scrubEmails.length ' + arr_scrubEmails.length);

      // update records
      scrubResult = connection.sobject(this.flags.object).updateBulk(arr_scrubEmails);

    }

    // Check that all emails are scrubbed
    const resultEmailsNotScrubbed = await connection.query<o2eEmails>(queryEmails);
    
    if (resultEmailsNotScrubbed.totalSize > 0) {
      notScrubbedCount = resultEmailsNotScrubbed.totalSize;
    }

    // Return an object to be displayed with --json
    return {
        orgId: this.org.getOrgId(),
        object: this.flags.object,
        field: this.flags.field,
        recordScrubbed: arr_scrubEmails.length,
        recordNotScrubbed: notScrubbedCount
    };    
  }  
}