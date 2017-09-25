/// <reference types="node" />
export interface ExtractOption {
    path: string;
}

export declare namespace unzip2 {
    interface Extract {
        (options: ExtractOption): void;
    }
}
