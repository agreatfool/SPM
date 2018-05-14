import {Entity, Column, PrimaryColumn} from 'typeorm';

@Entity()
export class SpmGlobalSecret {
    @PrimaryColumn('int', {generated: true})
    id: number;

    @Column('text')
    secret: string;
}
