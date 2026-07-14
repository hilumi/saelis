/** A single manageable next step. */
export interface HorizonStepInput {
  title: string;
  description: string;
  estimatedMinutes: number;
  conversationId?: string | null;
  arrivalId?: string | null;
}
