"use strict";
import * as LibPath from 'path'
import * as LibFs from "mz/fs";
import {Connection, createConnection} from "typeorm";

export default class Database {

    private static _instance: Database;

    private _initialized: boolean;
    public conn: Connection;

    public static instance(): Database {
        if (Database._instance === undefined) {
            Database._instance = new Database();
        }
        return Database._instance;
    }

    private constructor() {
        this._initialized = false;
    }

    public async init() {
        try {
            let dir = LibPath.join(__dirname, "entity");
            let files = await LibFs.readdir(dir);

            let entities = [];
            for (let file of files) {
                if (LibPath.basename(file).match(/.+\.js$/) !== null) {
                    let outputs = require(LibPath.join(dir, file)) as {[key: string]: any};
                    for (let key in outputs) {
                        entities.push(outputs[key]);
                    }
                }
            }

            this.conn = await createConnection({
                type: "sqlite",
                database: LibPath.join(__dirname, "..", "..", "Spm.db"),
                entities: entities,
                autoSchemaSync: true,
            });

            this._initialized = true;
        } catch (e) {
            throw new Error('[Database] Error:' + e.message);
        }
    }
}
