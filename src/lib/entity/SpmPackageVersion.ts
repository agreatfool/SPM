import {Column, Entity, PrimaryColumn} from 'typeorm';
import {PackageState} from "../Const.tx";

@Entity()
export class SpmPackageVersion {
    @PrimaryColumn('int', {generated: true})
    id: number;

    @Column('text')
    name: string;

    @Column('int')
    major: number;

    @Column('int')
    minor: number;

    @Column('int')
    patch: number;

    @Column('text', {name: 'file_path'})
    filePath: string;

    @Column('int')
    time: number;

    @Column('text')
    dependencies: string;

    @Column('int', {default: PackageState.ENABLED})
    state: number;
}
