"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
let SpmPackageVersion = class SpmPackageVersion {
};
__decorate([
    typeorm_1.PrimaryColumn("int", { generated: true }),
    __metadata("design:type", Number)
], SpmPackageVersion.prototype, "id", void 0);
__decorate([
    typeorm_1.Column("int"),
    __metadata("design:type", Number)
], SpmPackageVersion.prototype, "pid", void 0);
__decorate([
    typeorm_1.Column("int"),
    __metadata("design:type", Number)
], SpmPackageVersion.prototype, "major", void 0);
__decorate([
    typeorm_1.Column("int"),
    __metadata("design:type", Number)
], SpmPackageVersion.prototype, "minor", void 0);
__decorate([
    typeorm_1.Column("int"),
    __metadata("design:type", Number)
], SpmPackageVersion.prototype, "patch", void 0);
__decorate([
    typeorm_1.Column("text", { name: "file_path" }),
    __metadata("design:type", String)
], SpmPackageVersion.prototype, "filePath", void 0);
__decorate([
    typeorm_1.Column("int"),
    __metadata("design:type", Number)
], SpmPackageVersion.prototype, "time", void 0);
__decorate([
    typeorm_1.Column("text"),
    __metadata("design:type", String)
], SpmPackageVersion.prototype, "dependencies", void 0);
SpmPackageVersion = __decorate([
    typeorm_1.Entity()
], SpmPackageVersion);
exports.SpmPackageVersion = SpmPackageVersion;
//# sourceMappingURL=SpmPackageVersion.js.map