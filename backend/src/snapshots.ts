import type { KCStateRow } from './db';
import type { KCStateSnapshot, KCId, ConceptualLevel } from '@its/shared';

export function toSnapshot(row: KCStateRow): KCStateSnapshot {
  return {
    kcId: row.kc_id as KCId,
    conceptualLevel: row.conceptual_level as ConceptualLevel,
    proceduralScore: row.procedural_score,
    misconceptions: {
      statusShowsCommitted: Boolean(row.misc_status_shows_committed),
      restoreEqualsStaged: Boolean(row.misc_restore_equals_staged),
      messagesOnlyForSelf: Boolean(row.misc_messages_only_for_self),
      messageOmitsWhy: Boolean(row.misc_message_omits_why),
    },
  };
}
