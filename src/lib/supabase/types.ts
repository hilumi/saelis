/**
 * TEMPORARY TYPE BOUNDARY — hand-written Database type.
 *
 * Supabase can generate this file from a live project:
 *   npx supabase gen types typescript --project-id <project-id> --schema public \
 *     > src/lib/supabase/generated.types.ts
 *
 * Once generated, replace this Database definition with the generated one and
 * delete the hand-written table definitions. The row shapes in
 * src/types/database.ts mirror supabase/migrations exactly; any drift is a bug.
 */
import type {
  ArrivalRow,
  CompanionMemoryRow,
  CompanionProfileRow,
  ConversationRow,
  ConversationTurnRow,
  HorizonStepRow,
  ProfileRow,
  UserPrivacySettingsRow,
} from "@/types/database";

type Table<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

type ProfileInsert = Pick<ProfileRow, "id"> &
  Partial<Pick<ProfileRow, "preferred_name" | "timezone">>;

type CompanionProfileInsert = Pick<CompanionProfileRow, "user_id"> &
  Partial<Omit<CompanionProfileRow, "user_id" | "created_at" | "updated_at">>;

type ArrivalInsert = Pick<ArrivalRow, "user_id" | "mood" | "energy" | "support_need"> &
  Partial<Pick<ArrivalRow, "id" | "message" | "include_faith_reflection">>;

type ConversationInsert = Pick<ConversationRow, "user_id"> &
  Partial<Pick<ConversationRow, "id" | "title" | "status">>;

type ConversationTurnInsert = Pick<
  ConversationTurnRow,
  "conversation_id" | "user_id" | "role" | "content"
> &
  Partial<
    Pick<ConversationTurnRow, "id" | "support_mode" | "closing_line" | "provider_response_id">
  >;

type HorizonStepInsert = Pick<
  HorizonStepRow,
  "user_id" | "title" | "description" | "estimated_minutes"
> &
  Partial<Pick<HorizonStepRow, "id" | "conversation_id" | "arrival_id" | "completed">>;

type CompanionMemoryInsert = Pick<
  CompanionMemoryRow,
  "user_id" | "category" | "content" | "source"
> &
  Partial<Pick<CompanionMemoryRow, "id" | "status" | "user_approved">>;

type UserPrivacySettingsInsert = Pick<UserPrivacySettingsRow, "user_id"> &
  Partial<
    Pick<
      UserPrivacySettingsRow,
      "save_conversation_history" | "allow_companion_memory" | "allow_product_analytics"
    >
  >;

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, ProfileInsert>;
      companion_profiles: Table<CompanionProfileRow, CompanionProfileInsert>;
      arrivals: Table<ArrivalRow, ArrivalInsert>;
      conversations: Table<ConversationRow, ConversationInsert>;
      conversation_turns: Table<ConversationTurnRow, ConversationTurnInsert>;
      horizon_steps: Table<HorizonStepRow, HorizonStepInsert>;
      companion_memories: Table<CompanionMemoryRow, CompanionMemoryInsert>;
      user_privacy_settings: Table<UserPrivacySettingsRow, UserPrivacySettingsInsert>;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
