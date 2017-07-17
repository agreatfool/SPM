import {Entity, Column, PrimaryColumn} from "typeorm";

@Entity()
export class SpmPackage {
    @PrimaryColumn("int", {generated: true})
    id: number;

    @Column("text")
    name: string;
}