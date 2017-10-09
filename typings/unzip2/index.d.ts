// Type definitions for unzip2 0.2.5

/// <reference types="node" />

export interface ExtractOption {
    path: string;
}

export declare namespace unzip2 {
    interface Extract {
        (options: ExtractOption): void;
    }
}
