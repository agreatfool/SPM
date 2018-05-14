import {Entity, Column, PrimaryColumn} from 'typeorm';
import {PackageState} from "../Const.tx";

@Entity()
export class SpmPackage {
    @PrimaryColumn('int', {generated: true})
    id: number;

    @Column('text')
    name: string;

    @Column('text', {default: 'no description'})
    description: string;

    @Column('int', {default: PackageState.ENABLED})
    state: number;
}
