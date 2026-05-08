/**
 * WatermelonDB model for user_products (file 02).
 */
import { Model } from '@nozbe/watermelondb';
import { date, field } from '@nozbe/watermelondb/decorators';

export class UserProductModel extends Model {
  static override table = 'user_products';

  @field('user_id') userId!: string;
  @field('category') category!: string;
  @field('name') name!: string;
  @date('started_at') startedAt!: Date;
  @date('stopped_at') stoppedAt!: Date | null;
  @field('notes') notes!: string | null;
}
