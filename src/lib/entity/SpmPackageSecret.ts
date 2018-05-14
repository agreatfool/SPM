import {Entity, Column, PrimaryColumn} from 'typeorm';

@Entity()
export class SpmPackageSecret {
    @PrimaryColumn('int', {generated: true})
    id: number;

    @Column('int')
    pid: number;

    @Column('text')
    secret: string;
}
