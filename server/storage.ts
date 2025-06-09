import { 
  teams, participants, programs, registrations,
  type Team, type Participant, type Program, type Registration,
  type InsertTeam, type InsertParticipant, type InsertProgram, type InsertRegistration,
  type FirstRegistration, type ParticipantWithTeam, type RegistrationWithDetails
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Teams
  getTeams(): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  
  // Participants
  getParticipant(id: number): Promise<Participant | undefined>;
  getParticipantByCode(code: string): Promise<Participant | undefined>;
  getParticipantByName(name: string): Promise<Participant | undefined>;
  getParticipantWithTeam(id: number): Promise<ParticipantWithTeam | undefined>;
  createParticipant(participant: InsertParticipant & { uniqueCode: string }): Promise<Participant>;
  updateParticipantImage(id: number, imageUrl: string): Promise<Participant | undefined>;
  
  // Programs
  getPrograms(): Promise<Program[]>;
  getProgramsByType(type: string, participationType?: string): Promise<Program[]>;
  getProgram(id: number): Promise<Program | undefined>;
  createProgram(program: InsertProgram): Promise<Program>;
  
  // Registrations
  getRegistrations(): Promise<Registration[]>;
  getRegistrationsByParticipant(participantId: number): Promise<Registration[]>;
  getRegistrationsWithDetails(): Promise<RegistrationWithDetails[]>;
  getRegistrationsByParticipantWithDetails(participantId: number): Promise<RegistrationWithDetails[]>;
  createRegistration(registration: InsertRegistration): Promise<Registration>;
  deleteRegistration(id: number): Promise<boolean>;
  
  // Statistics
  getStats(): Promise<{
    totalRegistered: number;
    stagePrograms: number;
    nonStagePrograms: number;
    totalPrograms: number;
  }>;
  
  // Utility
  generateUniqueCode(teamCode: string): Promise<string>;
}

export class DatabaseStorage implements IStorage {
  // Teams
  async getTeams(): Promise<Team[]> {
    return await db.select().from(teams);
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team || undefined;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }

  // Participants
  async getParticipant(id: number): Promise<Participant | undefined> {
    const [participant] = await db.select().from(participants).where(eq(participants.id, id));
    return participant || undefined;
  }

  async getParticipantByCode(code: string): Promise<Participant | undefined> {
    const [participant] = await db.select().from(participants).where(eq(participants.uniqueCode, code));
    return participant || undefined;
  }

  async getParticipantByName(name: string): Promise<Participant | undefined> {
    const [participant] = await db.select().from(participants).where(eq(participants.fullName, name));
    return participant || undefined;
  }

  async getParticipantWithTeam(id: number): Promise<ParticipantWithTeam | undefined> {
    const result = await db
      .select()
      .from(participants)
      .leftJoin(teams, eq(participants.teamId, teams.id))
      .where(eq(participants.id, id));
    
    if (!result[0] || !result[0].teams) return undefined;
    
    return {
      ...result[0].participants,
      team: result[0].teams
    };
  }

  async createParticipant(participant: InsertParticipant & { uniqueCode: string }): Promise<Participant> {
    const [newParticipant] = await db.insert(participants).values(participant).returning();
    return newParticipant;
  }

  async updateParticipantImage(id: number, imageUrl: string): Promise<Participant | undefined> {
    const [updatedParticipant] = await db
      .update(participants)
      .set({ profileImage: imageUrl })
      .where(eq(participants.id, id))
      .returning();
    return updatedParticipant || undefined;
  }

  // Programs
  async getPrograms(): Promise<Program[]> {
    return await db.select().from(programs);
  }

  async getProgramsByType(type: string, participationType?: string): Promise<Program[]> {
    if (participationType) {
      return await db.select().from(programs)
        .where(and(eq(programs.type, type), eq(programs.participationType, participationType)));
    }
    
    return await db.select().from(programs).where(eq(programs.type, type));
  }

  async getProgram(id: number): Promise<Program | undefined> {
    const [program] = await db.select().from(programs).where(eq(programs.id, id));
    return program || undefined;
  }

  async createProgram(program: InsertProgram): Promise<Program> {
    const [newProgram] = await db.insert(programs).values(program).returning();
    return newProgram;
  }

  // Registrations
  async getRegistrations(): Promise<Registration[]> {
    return await db.select().from(registrations);
  }

  async getRegistrationsByParticipant(participantId: number): Promise<Registration[]> {
    return await db.select().from(registrations).where(eq(registrations.participantId, participantId));
  }

  async getRegistrationsWithDetails(): Promise<RegistrationWithDetails[]> {
    const result = await db
      .select()
      .from(registrations)
      .leftJoin(participants, eq(registrations.participantId, participants.id))
      .leftJoin(teams, eq(participants.teamId, teams.id))
      .leftJoin(programs, eq(registrations.programId, programs.id));

    return result.map(row => ({
      ...row.registrations,
      participant: {
        ...row.participants!,
        team: row.teams!
      },
      program: row.programs!
    }));
  }

  async getRegistrationsByParticipantWithDetails(participantId: number): Promise<RegistrationWithDetails[]> {
    const result = await db
      .select()
      .from(registrations)
      .leftJoin(participants, eq(registrations.participantId, participants.id))
      .leftJoin(teams, eq(participants.teamId, teams.id))
      .leftJoin(programs, eq(registrations.programId, programs.id))
      .where(eq(registrations.participantId, participantId));

    return result.map(row => ({
      ...row.registrations,
      participant: {
        ...row.participants!,
        team: row.teams!
      },
      program: row.programs!
    }));
  }

  async createRegistration(registration: InsertRegistration): Promise<Registration> {
    const [newRegistration] = await db
      .insert(registrations)
      .values({
        ...registration,
        registeredAt: new Date().toISOString()
      })
      .returning();
    return newRegistration;
  }

  async deleteRegistration(id: number): Promise<boolean> {
    const result = await db.delete(registrations).where(eq(registrations.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Statistics
  async getStats(): Promise<{
    totalRegistered: number;
    stagePrograms: number;
    nonStagePrograms: number;
    totalPrograms: number;
  }> {
    const allRegistrations = await this.getRegistrationsWithDetails();
    const uniqueParticipants = new Set(allRegistrations.map(r => r.participantId));
    
    const stagePrograms = allRegistrations.filter(r => r.program.type === 'stage').length;
    const nonStagePrograms = allRegistrations.filter(r => r.program.type === 'non-stage').length;

    return {
      totalRegistered: uniqueParticipants.size,
      stagePrograms,
      nonStagePrograms,
      totalPrograms: allRegistrations.length
    };
  }

  // Utility method to generate unique codes
  async generateUniqueCode(teamCode: string): Promise<string> {
    const existingParticipants = await db.select().from(participants);
    const existingCodes = existingParticipants.map(p => p.uniqueCode);
    let counter = 1;
    let code: string;
    
    do {
      code = `${teamCode}${String(counter).padStart(3, '0')}`;
      counter++;
    } while (existingCodes.includes(code));
    
    return code;
  }
}

// Initialize database with seed data
async function seedDatabase() {
  try {
    // Check if teams already exist
    const existingTeams = await db.select().from(teams);
    if (existingTeams.length > 0) return;

    // Seed teams
    const teamsData = [
      { name: "QUDS Team", code: "QU" },
      { name: "BADR Team", code: "BA" },
      { name: "NOOR Team", code: "NO" },
      { name: "FAJR Team", code: "FA" },
    ];
    await db.insert(teams).values(teamsData);

    // Seed programs
    const programsData = [
      { name: "Arabic Speech 01", type: "stage", participationType: "group", description: "مسابقة الخطابة العربية للمجموعات" },
      { name: "Arabic Song 02", type: "stage", participationType: "group", description: "العروض المسرحية الجماعية" },
      { name: "Arabic Story telling 03", type: "stage", participationType: "group", description: "الأداء الموسيقي الجماعي" },
      { name: "Malayalam Song 04", type: "stage", participationType: "group", description: "إلقاء الشعر الجماعي" },
      { name: "Arabic Speech 05", type: "stage", participationType: "individual", description: "أداء الرقص الفردي" },
      { name: "Arabic Speech 06", type: "stage", participationType: "individual", description: "الغناء الفردي" },
      { name: "Arabic Speech 07", type: "stage", participationType: "individual", description: "الأداء المسرحي الفردي" },
      { name: "Arabic Speech 08", type: "stage", participationType: "individual", description: "الكوميديا الفردية" },
      { name: "Arabic Essay 09", type: "non-stage", participationType: "group", description: "معرض الفنون الجماعي" },
      { name: "Arabic Calligraphy 10", type: "non-stage", participationType: "group", description: "مسابقة التصوير الجماعي" },
      { name: "Arabic Speech 11", type: "non-stage", participationType: "individual", description: "مسابقة الرسم الفردي" },
      { name: "Arabic Speech 12", type: "non-stage", participationType: "individual", description: "مسابقة التصوير الفردي" },
      { name: "Arabic Speech 13", type: "non-stage", participationType: "individual", description: "مسابقة الخط العربي" },
      { name: "Arabic Speech 14", type: "non-stage", participationType: "individual", description: "مسابقة الكتابة الإبداعية" },
    ];
    await db.insert(programs).values(programsData);
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

export const storage = new DatabaseStorage();

// Initialize database
seedDatabase();
