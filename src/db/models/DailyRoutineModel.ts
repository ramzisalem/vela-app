/**
 * WatermelonDB model for daily_routines (file 09).
 */
import { Model } from '@nozbe/watermelondb';
import { date, field } from '@nozbe/watermelondb/decorators';

export class DailyRoutineModel extends Model {
  static override table = 'daily_routines';

  @field('remote_id') remoteId!: string;
  @field('user_id') userId!: string;
  @field('week_number') weekNumber!: number;
  @date('generated_at') generatedAt!: Date;
  @field('tasks_json') tasksJson!: string;
  @field('personalization_note') personalizationNote!: string | null;
}
