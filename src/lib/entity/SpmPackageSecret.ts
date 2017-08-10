import {Entity, Column, PrimaryColumn} from "typeorm";

@Entity()
export class SpmPackageSecret {
    @PrimaryColumn("text")
    name: string;

    @Column("text")
    secret: string;
}