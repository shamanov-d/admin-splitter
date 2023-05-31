import {existsSync, writeFileSync, readFileSync} from "fs";
import {resolve} from "path";

const STORAGE_NAME = resolve(process.cwd() + "/storage.json");

export interface StorageType {
  sourceUser: {
    token: string;
    user: number;
    searchWords?: string[];
    excludePage?: number[];
  };
  targetUser: {
    user: number;
    token: string;
  };
  captchaToken?: string;
}

export namespace Storage {
  export function get(): StorageType {
    if (!existsSync(STORAGE_NAME)) return {} as StorageType;
    return JSON.parse(readFileSync(STORAGE_NAME).toString());
  }

  export function save(data: StorageType) {
    writeFileSync(STORAGE_NAME, JSON.stringify(data));
  }
}
