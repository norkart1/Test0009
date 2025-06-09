import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(),
});

export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  uniqueCode: text("unique_code").notNull().unique(),
  profileImage: text("profile_image"),
});

export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'stage' or 'non-stage'
  participationType: text("participation_type").notNull(), // 'group' or 'individual'
  description: text("description"),
});

export const registrations = pgTable("registrations", {
  id: serial("id").primaryKey(),
  participantId: integer("participant_id").references(() => participants.id).notNull(),
  programId: integer("program_id").references(() => programs.id).notNull(),
  registeredAt: text("registered_at").notNull(),
});

// Zod schemas
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true });
export const insertParticipantSchema = createInsertSchema(participants).omit({ id: true, uniqueCode: true });
export const insertProgramSchema = createInsertSchema(programs).omit({ id: true });
export const insertRegistrationSchema = createInsertSchema(registrations).omit({ id: true, registeredAt: true });

// First registration schema
export const firstRegistrationSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  teamId: z.number().min(1, "Please select a team"),
});

// Second registration schema
export const secondRegistrationSchema = z.object({
  uniqueCode: z.string().min(5, "Invalid code format"),
  programIds: z.array(z.number()).min(1, "Please select at least one program"),
  profileImage: z.string().optional(),
});

// Types
export type Team = typeof teams.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type Program = typeof programs.$inferSelect;
export type Registration = typeof registrations.$inferSelect;

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type InsertProgram = z.infer<typeof insertProgramSchema>;
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;

export type FirstRegistration = z.infer<typeof firstRegistrationSchema>;
export type SecondRegistration = z.infer<typeof secondRegistrationSchema>;

// Extended types for API responses
export type ParticipantWithTeam = Participant & { team: Team };
export type RegistrationWithDetails = Registration & { 
  participant: ParticipantWithTeam;
  program: Program;
};
