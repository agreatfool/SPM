import {Entity, Column, PrimaryColumn} from "typeorm";

@Entity()
export class SpmPackage {
    @PrimaryColumn("text")
    name: string;

    @Column("text", {default: "no description"})
    description: string;
}