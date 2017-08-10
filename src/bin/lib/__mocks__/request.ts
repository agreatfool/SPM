export function post(uri: string, params: Object, callback: (chunk: Buffer | string, resolve: any, reject: any) => void, handleResponse?: Function) {
    return new Promise((resolve, reject) => {
        callback("123", resolve, reject)
    });
}

export function postForm(uri: string, params: Object, filePath: Array<string>, callback: (chunk: Buffer | string, resolve: any, reject: any) => void) {
    return new Promise((resolve, reject) => {
        callback("123", resolve, reject)
    });
}