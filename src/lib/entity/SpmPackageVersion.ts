import {Entity, Column, PrimaryColumn} from "typeorm";

@Entity()
export class SpmPackageVersion {
    @PrimaryColumn("int", {generated: true})
    id: number;

    @Column("text")
    name: string;

    @Column("int")
    major: number;

    @Column("int")
    minor: number;

    @Column("int")
    patch: number;

    @Column("text", {name: "file_path"})
    filePath: string;

    @Column("int")
    time: number;

    @Column("text")
    dependencies: string;
}