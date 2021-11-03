import { arDriveFactory, cliArweave, cliWalletDao } from '..';
import { ArDriveAnonymous } from '../ardrive';
import { ArFSDAOAnonymous } from '../arfsdao_anonymous';
import { ArFSPrivateFileOrFolderWithPaths, ArFSPublicFileOrFolderWithPaths } from '../arfs_entities';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { SUCCESS_EXIT_CODE } from '../CLICommand/constants';
import {
	BoostParameter,
	DestinationFileNameParameter,
	DriveIdParameter,
	DrivePrivacyParameters,
	DryRunParameter,
	TreeDepthParams
} from '../parameter_declarations';
import { FeeMultiple } from '../types';
import { readJWKFile } from '../utils';
import { alphabeticalOrder } from '../utils/sort_functions';

new CLICommand({
	name: 'create-manifest',
	parameters: [
		DriveIdParameter,
		DestinationFileNameParameter,
		BoostParameter,
		DryRunParameter,
		...TreeDepthParams,
		...DrivePrivacyParameters
	],
	async action(options) {
		if (!options.destFileName) {
			options.destFileName = 'ArDrive Manifest.json';
		}
		const parameters = new ParametersHelper(options, cliWalletDao);

		let rootFolderId: string;

		const wallet = readJWKFile(options.walletFile);

		const arDrive = arDriveFactory({
			wallet: wallet,
			feeMultiple: options.boost as FeeMultiple,
			dryRun: options.dryRun
		});

		const driveId = parameters.getRequiredParameterValue(DriveIdParameter);
		let children: (ArFSPrivateFileOrFolderWithPaths | ArFSPublicFileOrFolderWithPaths)[];
		const maxDepth = await parameters.getMaxDepth(Number.MAX_SAFE_INTEGER);

		if (await parameters.getIsPrivate()) {
			const wallet = await parameters.getRequiredWallet();
			const arDrive = arDriveFactory({ wallet });
			const driveKey = await parameters.getDriveKey({ driveId });
			const drive = await arDrive.getPrivateDrive(driveId, driveKey);
			rootFolderId = drive.rootFolderId;

			// We have the drive id from deriving a key, we can derive the owner
			const driveOwner = await arDrive.getOwnerForDriveId(driveId);

			children = await arDrive.listPrivateFolder({
				folderId: rootFolderId,
				driveKey,
				maxDepth,
				includeRoot: true,
				owner: driveOwner
			});
		} else {
			const arDrive = new ArDriveAnonymous(new ArFSDAOAnonymous(cliArweave));
			const drive = await arDrive.getPublicDrive(driveId);
			rootFolderId = drive.rootFolderId;
			children = await arDrive.listPublicFolder({ folderId: rootFolderId, maxDepth, includeRoot: true });
		}

		const sortedChildren = children.sort((a, b) => alphabeticalOrder(a.path, b.path)) as (
			| Partial<ArFSPrivateFileOrFolderWithPaths>
			| Partial<ArFSPublicFileOrFolderWithPaths>
		)[];

		// TODO: Fix base types so deleting un-used values is not necessary; Tickets: PE-525 + PE-556
		sortedChildren.map((fileOrFolderMetaData) => {
			if (fileOrFolderMetaData.entityType === 'folder') {
				delete fileOrFolderMetaData.lastModifiedDate;
				delete fileOrFolderMetaData.size;
				delete fileOrFolderMetaData.dataTxId;
				delete fileOrFolderMetaData.dataContentType;
			}
			delete fileOrFolderMetaData.syncStatus;
		});

		// TURN SORTED CHILDREN INTO MANIFEST
		// These interfaces taken from arweave-deploy
		interface ManifestPathMap {
			[index: string]: { id: string };
		}
		interface Manifest {
			manifest: 'arweave/paths';
			version: '0.1.0';
			index?: {
				path: string;
			};
			paths: ManifestPathMap;
		}

		//const indexPath = noIndex ? null : 'index.html';
		const indexPath = 'index.html';
		const pathMap: ManifestPathMap = {};
		sortedChildren.forEach((child) => {
			if (child.dataTxId && child.path) {
				pathMap[child.path] = { id: child.dataTxId };
			}
		});

		const arweaveManifest: Manifest = {
			manifest: 'arweave/paths',
			version: '0.1.0',
			index: {
				path: indexPath
			},
			paths: pathMap
		};

		// Display data
		console.log(JSON.stringify(arweaveManifest));
		console.log(JSON.stringify(sortedChildren, null, 4));

		const result = await (async () => {
			if (await parameters.getIsPrivate()) {
				const driveKey = await parameters.getDriveKey({ driveId });
				return arDrive.uploadPrivateFile(rootFolderId, manifestEntity, driveKey, options.destFileName);
			} else {
				return arDrive.uploadPublicFile(rootFolderId, manifestEntity, options.destFileName);
			}
		})();
		console.log(JSON.stringify(result, null, 4));

		return SUCCESS_EXIT_CODE;
	}
});
