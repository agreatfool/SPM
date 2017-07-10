import {Entity, Column, PrimaryColumn} from "typeorm";

@Entity()
export class SpmPackageVersion {
    @PrimaryColumn("int", { generated: true })
    id: number;

    @Column("int")
    pid: number;

    @Column("int")
    major: number;

    @Column("int")
    minor: number;

    @Column("int")
    patch: number;

    @Column("text")
    filePath: string;

    @Column("int")
    time: number;
}