import * as LibPath from 'path';
import * as LibFs from 'mz/fs';
import {Connection, createConnection} from 'typeorm';
import {Spm} from '../bin/lib/lib';

export default class Database {

    private static _instance: Database;

    private _initialized: boolean;
    private _conn: Connection;

    public static instance(): Database {
        if (Database._instance === undefined) {
            Database._instance = new Database();
        }
        return Database._instance;
    }

    private constructor() {
        this._initialized = false;
    }

    public get conn(): Connection {
        return this._conn;
    }

    public async init() {
        try {
            let dir = LibPath.join(__dirname, 'entity');
            let files = await LibFs.readdir(dir);

            let entities = [];
            for (let file of files) {
                if (LibPath.basename(file).match(/.+\.js$/) === null) {
                    continue;
                }
                let outputs = require(LibPath.join(dir, file)) as { [key: string]: any };
                for (let key in outputs) {
                    entities.push(outputs[key]);
                }
            }

            this._conn = await createConnection({
                type: 'sqlite',
                database: LibPath.join(Spm.SPM_ROOT_PATH, 'Spm.db'),
                entities: entities,
                autoSchemaSync: false, // only works when creating db file, no effect when changing schema
            });

            this._initialized = true;
        } catch (e) {
            throw new Error(`[Database] Error: ${e.message}`);
        }
    }
}
