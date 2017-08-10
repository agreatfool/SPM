import * as LibFs from "mz/fs";
import * as http from "http";
import * as qs from "querystring";
import {RequestMethod, SpmPackageRequest} from "./lib";

export function post(uri: string, params: Object, callback: (chunk: Buffer | string, resolve: any, reject: any) => void, handleResponse?: Function) {
    return new Promise((resolve, reject) => {
        // create request
        let reqOptions = SpmPackageRequest.getRequestOption(uri, RequestMethod.post);

        let req = http.request(reqOptions, (res) => {
            (handleResponse)
                ? handleResponse(res, resolve)
                : res.on('data', (chunk) => callback(chunk, resolve, reject));
        }).on('error', (e) => {
            reject(e);
        });

        // send content
        let reqParamsStr = qs.stringify(params);
        req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        req.setHeader('Content-Length', Buffer.byteLength(reqParamsStr, 'utf8').toString());
        req.write(reqParamsStr);
    });
}

export function postForm(uri: string, params: Object, filePath: Array<string>, callback: (chunk: Buffer | string, resolve: any, reject: any) => void) {
    return new Promise((resolve, reject) => {
        // create request
        let reqOptions = SpmPackageRequest.getRequestOption(uri, RequestMethod.post);
        let req = http.request(reqOptions, (res) => {
            res.on('data', (chunk) => callback(chunk, resolve, reject));
        }).on('error', (e) => {
            reject(e);
        });

        // send content
        let boundaryKey = Math.random().toString(16);
        let enddata = '\r\n----' + boundaryKey + '--';

        // build form params head
        let content = '';
        for (let key in params) {
            content += '\r\n----' + boundaryKey + '\r\n'
                + 'Content-Disposition: form-data; name="' + key + '" \r\n\r\n'
                + encodeURIComponent(params[key]);
        }

        let contentBinary = new Buffer(content, 'utf-8');
        let contentLength = contentBinary.length;

        // build upload file head
        if (filePath.length > 0) {
            content += '\r\n----' + boundaryKey + '\r\n'
                + 'Content-Type: application/octet-stream\r\n'
                + 'Content-Disposition: form-data; name="fileUpload"; filename="' + `${Math.random().toString(16)}.zip` + '"\r\n'
                + "Content-Transfer-Encoding: binary\r\n\r\n";
            contentBinary = new Buffer(content, 'utf-8');
            contentLength = LibFs.statSync(filePath[0]).size + contentBinary.length;

            // send request stream
            let fileStream = LibFs.createReadStream(filePath[0]);
            fileStream.on('end', () => {
                req.end(enddata);
            });
            fileStream.pipe(req, {end: false});
        }

        // send request headers
        req.setHeader('Content-Type', 'multipart/form-data; boundary=--' + boundaryKey);
        req.setHeader('Content-Length', `${contentLength + Buffer.byteLength(enddata)}`);
        req.write(contentBinary);

        if (filePath.length === 0) {
            req.end(enddata);
        }
    });
}