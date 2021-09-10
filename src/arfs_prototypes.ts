import {
	ArFSFileData,
	ArFSObjectTransactionData,
	ArFSPrivateDriveData,
	ArFSPrivateFolderData,
	ArFSPublicDriveData,
	ArFSPublicFileData,
	ArFSPublicFolderData
} from './arfs_trx_data_types';
import Transaction from 'arweave/node/lib/transaction';
import { DrivePrivacy, GQLTagInterface } from 'ardrive-core-js';
import { DataContentType, DriveID, FileID, FolderID } from './arfsdao';

export abstract class ArFSObjectMetadataPrototype {
	abstract protectedTags: string[];
	abstract objectData: ArFSObjectTransactionData;
	abstract addTagsToTransaction(transaction: Transaction): void;

	// Implementation should throw if any protected tags are identified
	assertProtectedTags(tags: GQLTagInterface[]): void {
		tags.forEach((tag) => {
			if (this.protectedTags.includes(tag.name)) {
				throw new Error(`Tag ${tag.name} is protected and cannot be used in this context!`);
			}
		});
	}
}

export abstract class ArFSDriveMetaDataPrototype extends ArFSObjectMetadataPrototype {
	abstract unixTime: number;
	abstract driveId: string;
	abstract objectData: ArFSObjectTransactionData;
	abstract readonly privacy: DrivePrivacy;

	get protectedTags(): string[] {
		return ['Entity-Type', 'Unix-Time', 'Drive-Id', 'Drive-Privacy'];
	}

	addTagsToTransaction(transaction: Transaction): void {
		transaction.addTag('Entity-Type', 'drive');
		transaction.addTag('Unix-Time', this.unixTime.toString());
		transaction.addTag('Drive-Id', this.driveId);
		transaction.addTag('Drive-Privacy', this.privacy);
	}
}

export class ArFSPublicDriveMetaDataPrototype extends ArFSDriveMetaDataPrototype {
	readonly privacy: DrivePrivacy = 'public';

	get protectedTags(): string[] {
		return ['Content-Type', ...super.protectedTags];
	}

	constructor(readonly objectData: ArFSPublicDriveData, readonly unixTime: number, readonly driveId: string) {
		super();
	}

	addTagsToTransaction(transaction: Transaction): void {
		super.addTagsToTransaction(transaction);
		transaction.addTag('Content-Type', 'application/json');
	}
}

export class ArFSPrivateDriveMetaDataPrototype extends ArFSDriveMetaDataPrototype {
	readonly privacy: DrivePrivacy = 'private';

	constructor(readonly unixTime: number, readonly driveId: string, readonly objectData: ArFSPrivateDriveData) {
		super();
	}

	addTagsToTransaction(transaction: Transaction): void {
		super.addTagsToTransaction(transaction);
		transaction.addTag('Content-Type', 'application/octet-stream');
		transaction.addTag('Cipher', this.objectData.cipher);
		transaction.addTag('Cipher-IV', this.objectData.cipherIV);
		transaction.addTag('Drive-Auth-Mode', this.objectData.driveAuthMode);
	}
}

export abstract class ArFSFolderMetaDataPrototype extends ArFSObjectMetadataPrototype {
	abstract unixTime: number;
	abstract driveId: DriveID;
	abstract folderId: FolderID;
	abstract objectData: ArFSObjectTransactionData;
	abstract parentFolderId?: FolderID;
	abstract readonly privacy: DrivePrivacy;

	get protectedTags(): string[] {
		return ['Entity-Type', 'Unix-Time', 'Drive-Id', 'Folder-Id', 'Drive-Privacy', 'Parent-Folder-Id'];
	}

	addTagsToTransaction(transaction: Transaction): void {
		transaction.addTag('Entity-Type', 'folder');
		transaction.addTag('Unix-Time', this.unixTime.toString());
		transaction.addTag('Drive-Id', this.driveId);
		transaction.addTag('Folder-Id', this.folderId);
		transaction.addTag('Drive-Privacy', this.privacy);
		if (this.parentFolderId) {
			// Root folder transactions do not have Parent-Folder-Id
			transaction.addTag('Parent-Folder-Id', this.parentFolderId);
		}
	}
}

export class ArFSPublicFolderMetaDataPrototype extends ArFSFolderMetaDataPrototype {
	readonly privacy: DrivePrivacy = 'public';

	constructor(
		readonly objectData: ArFSPublicFolderData,
		readonly unixTime: number,
		readonly driveId: DriveID,
		readonly folderId: FolderID,
		readonly parentFolderId?: FolderID
	) {
		super();
	}

	get protectedTags(): string[] {
		return ['Content-Type', ...super.protectedTags];
	}

	addTagsToTransaction(transaction: Transaction): void {
		super.addTagsToTransaction(transaction);
		transaction.addTag('Content-Type', 'application/json');
	}
}

export class ArFSPrivateFolderMetaDataPrototype extends ArFSFolderMetaDataPrototype {
	readonly privacy: DrivePrivacy = 'private';

	constructor(
		//readonly folderName: string,
		//readonly rootFolderId: string,
		readonly unixTime: number,
		readonly driveId: DriveID,
		readonly folderId: FolderID,
		readonly objectData: ArFSPrivateFolderData,
		readonly parentFolderId?: FolderID
	) {
		super();
	}

	addTagsToTransaction(transaction: Transaction): void {
		super.addTagsToTransaction(transaction);
		transaction.addTag('Content-Type', 'application/octet-stream');
		transaction.addTag('Cipher', this.objectData.cipher);
		transaction.addTag('Cipher-IV', this.objectData.cipherIV);
		transaction.addTag('Drive-Auth-Mode', this.objectData.driveAuthMode);
	}
}

export abstract class ArFSFileMetaDataPrototype extends ArFSObjectMetadataPrototype {
	abstract unixTime: number;
	abstract driveId: DriveID;
	abstract fileId: FileID;
	abstract objectData: ArFSObjectTransactionData;
	abstract parentFolderId: FolderID;
	abstract readonly privacy: DrivePrivacy;

	get protectedTags(): string[] {
		return ['Entity-Type', 'Unix-Time', 'Drive-Id', 'File-Id', 'Drive-Privacy', 'Parent-Folder-Id'];
	}

	addTagsToTransaction(transaction: Transaction): void {
		transaction.addTag('Entity-Type', 'file');
		transaction.addTag('Unix-Time', this.unixTime.toString());
		transaction.addTag('Drive-Id', this.driveId);
		transaction.addTag('File-Id', this.fileId);
		transaction.addTag('Drive-Privacy', this.privacy);
		transaction.addTag('Parent-Folder-Id', this.parentFolderId);
	}
}

export class ArFSFileDataPrototype extends ArFSObjectMetadataPrototype {
	constructor(readonly objectData: ArFSFileData, readonly contentType: DataContentType) {
		super();
	}

	get protectedTags(): string[] {
		return ['Content-Type'];
	}

	addTagsToTransaction(transaction: Transaction): void {
		transaction.addTag('Content-Type', this.contentType);
	}
}

export class ArFSPublicFileMetaDataPrototype extends ArFSFileMetaDataPrototype {
	readonly privacy: DrivePrivacy = 'public';

	constructor(
		readonly objectData: ArFSPublicFileData,
		readonly unixTime: number,
		readonly driveId: DriveID,
		readonly fileId: FileID,
		readonly parentFolderId: FolderID
	) {
		super();
	}

	get protectedTags(): string[] {
		return ['Content-Type', ...super.protectedTags];
	}

	addTagsToTransaction(transaction: Transaction): void {
		super.addTagsToTransaction(transaction);
		transaction.addTag('Content-Type', 'application/json');
	}
}
