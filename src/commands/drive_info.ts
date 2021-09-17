import { ArDriveReadOnly, ArDriveReadWrite } from '../ardrive';
import { ArFSDAOReadOnly, ArFSDAOReadWrite } from '../arfsdao';
import { CLICommand } from '../CLICommand';
import { CommonContext } from '../CLICommand/common_context';
import {
	DriveIdParameter,
	DriveKeyParameter,
	DrivePasswordParameter,
	GetAllRevisionsParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { arweave } from '..';

/* eslint-disable no-console */

new CLICommand({
	name: 'drive-info',
	parameters: [
		DriveIdParameter,
		GetAllRevisionsParameter,
		DrivePasswordParameter,
		DriveKeyParameter,
		WalletFileParameter
	],
	async action(options) {
		const context = new CommonContext(options);
		const wallet = await context.getWallet().catch(() => null);
		const result = await (function () {
			if (wallet) {
				const arDrive = new ArDriveReadWrite(new ArFSDAOReadWrite(wallet, arweave));
				const driveId: string = options.driveId;
				// const getAllRevisions: boolean = options.getAllRevisions;
				return arDrive.getPrivateDrive(driveId /*, getAllRevisions*/);
			} else {
				const arDrive = new ArDriveReadOnly(new ArFSDAOReadOnly(arweave));
				const driveId: string = options.driveId;
				// const getAllRevisions: boolean = options.getAllRevisions;
				return arDrive.getPublicDrive(driveId /*, getAllRevisions*/);
			}
		})();
		console.log(JSON.stringify(result, null, 4));
		process.exit(0);
	}
});
