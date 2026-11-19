import mongoose, { model } from 'mongoose';
import { DaybookEntrySchema } from './DaybookEntry';

// Personal Day Book: same fields as the business Day Book, kept in its own
// collection (personaldaybookentries) so the two books never mix.
const PersonalDaybookEntrySchema = DaybookEntrySchema.clone();

// See DaybookEntry: keeps the dev server on the current schema after hot reload.
if (process.env.NODE_ENV !== 'production' && mongoose.models.PersonalDaybookEntry) {
  mongoose.deleteModel('PersonalDaybookEntry');
}

export default mongoose.models.PersonalDaybookEntry || model('PersonalDaybookEntry', PersonalDaybookEntrySchema);
