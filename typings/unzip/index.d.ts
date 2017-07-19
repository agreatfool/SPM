/// <reference types="node" />
export interface ExtractOption {
    path: string;
}

export declare namespace unzip {
    interface Extract {
        (options: ExtractOption): void;
    }
}
