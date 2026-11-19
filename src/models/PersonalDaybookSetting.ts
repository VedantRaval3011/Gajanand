import mongoose, { model } from 'mongoose';
import { DaybookSettingSchema } from './DaybookSetting';

// Opening balance of the Personal Day Book, separate from the business Day Book's.
const PersonalDaybookSettingSchema = DaybookSettingSchema.clone();

// See DaybookEntry: keeps the dev server on the current schema after hot reload.
if (process.env.NODE_ENV !== 'production' && mongoose.models.PersonalDaybookSetting) {
  mongoose.deleteModel('PersonalDaybookSetting');
}

export default mongoose.models.PersonalDaybookSetting || model('PersonalDaybookSetting', PersonalDaybookSettingSchema);
