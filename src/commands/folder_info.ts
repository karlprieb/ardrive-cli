import { CLICommand, ParametersHelper } from '../CLICommand';
import { GetAllRevisionsParameter, FolderIdParameter, DrivePrivacyParameters } from '../parameter_declarations';
import { cliArDriveAnonymousFactory, cliArDriveFactory } from '..';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
import { ArFSPublicFolder, ArFSPrivateFolder, EID } from 'ardrive-core-js';

new CLICommand({
	name: 'folder-info',
	parameters: [FolderIdParameter, GetAllRevisionsParameter, ...DrivePrivacyParameters],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);

		const result: Partial<ArFSPublicFolder | ArFSPrivateFolder> = await (async function () {
			const folderId = EID(parameters.getRequiredParameterValue(FolderIdParameter));

			if (await parameters.getIsPrivate()) {
				const wallet = await parameters.getRequiredWallet();
				const arDrive = cliArDriveFactory({ wallet: wallet });

				const driveId = await arDrive.getDriveIdForFolderId(folderId);
				const driveKey = await parameters.getDriveKey({ driveId });

				// We have the drive id from deriving a key, we can derive the owner
				const driveOwner = await arDrive.getOwnerForDriveId(driveId);

				return arDrive.getPrivateFolder({ folderId, driveKey, owner: driveOwner });
			} else {
				const arDrive = cliArDriveAnonymousFactory({});
				return arDrive.getPublicFolder({ folderId });
			}
		})();

		// TODO: Fix base types so deleting un-used values is not necessary; Tickets: PE-525 + PE-556
		delete result.size;
		delete result.dataTxId;
		delete result.dataContentType;
		delete result.lastModifiedDate;

		console.log(JSON.stringify(result, null, 4));
		return SUCCESS_EXIT_CODE;
	})
});
