import {Entity, Column, PrimaryColumn} from 'typeorm';
import {PackageState} from "../Const.tx";

@Entity()
export class SpmPackageSecret {
    @PrimaryColumn('int', {generated: true})
    id: number;

    @Column('text')
    name: string;

    @Column('text')
    secret: string;

    @Column('int', {default: PackageState.ENABLED})
    state: number;
}
