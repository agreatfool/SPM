import {Entity, Column, PrimaryColumn} from "typeorm";

@Entity()
export class SpmPackage {
    @PrimaryColumn("int", {generated: true})
    id: number;

    @Column("int")
    sid: number;

    @Column("text")
    name: string;

    @Column("text", {default: "no description"})
    description: string;
}