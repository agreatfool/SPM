import {Entity, Column, PrimaryColumn} from "typeorm";

@Entity()
export class SpmPackageSecret {
    @PrimaryColumn("int", {generated: true})
    id: number;

    @Column("text")
    name: string;

    @Column("text")
    secret: string;
}