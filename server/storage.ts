import { 
  teams, participants, programs, registrations,
  type Team, type Participant, type Program, type Registration,
  type InsertTeam, type InsertParticipant, type InsertProgram, type InsertRegistration,
  type FirstRegistration, type ParticipantWithTeam, type RegistrationWithDetails
} from "@shared/schema";

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
  createParticipant(participant: InsertParticipant): Promise<Participant>;
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
}

export class MemStorage implements IStorage {
  private teams: Map<number, Team> = new Map();
  private participants: Map<number, Participant> = new Map();
  private programs: Map<number, Program> = new Map();
  private registrations: Map<number, Registration> = new Map();
  
  private currentTeamId = 1;
  private currentParticipantId = 1;
  private currentProgramId = 1;
  private currentRegistrationId = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed teams
    const teamsData = [
      { name: "QUDS Team", code: "QU" },
      { name: "BADR Team", code: "BA" },
      { name: "NOOR Team", code: "NO" },
      { name: "FAJR Team", code: "FA" },
    ];

    teamsData.forEach(teamData => {
      const team: Team = { id: this.currentTeamId++, ...teamData };
      this.teams.set(team.id, team);
    });

    // Seed programs
    const programsData = [
      { name: "Group Dance Competition", type: "stage", participationType: "group", description: "Competitive dance performance for groups" },
      { name: "Group Drama Performance", type: "stage", participationType: "group", description: "Theatrical drama performance" },
      { name: "Group Musical Performance", type: "stage", participationType: "group", description: "Musical ensemble performance" },
      { name: "Group Poetry Recitation", type: "stage", participationType: "group", description: "Collective poetry recitation" },
      { name: "Solo Dance Performance", type: "stage", participationType: "individual", description: "Individual dance performance" },
      { name: "Solo Singing", type: "stage", participationType: "individual", description: "Individual vocal performance" },
      { name: "Monologue Performance", type: "stage", participationType: "individual", description: "Solo dramatic performance" },
      { name: "Stand-up Comedy", type: "stage", participationType: "individual", description: "Individual comedy performance" },
      { name: "Group Art Exhibition", type: "non-stage", participationType: "group", description: "Collaborative art display" },
      { name: "Group Photography Contest", type: "non-stage", participationType: "group", description: "Team photography competition" },
      { name: "Individual Painting", type: "non-stage", participationType: "individual", description: "Solo painting competition" },
      { name: "Individual Photography", type: "non-stage", participationType: "individual", description: "Individual photography contest" },
      { name: "Individual Calligraphy", type: "non-stage", participationType: "individual", description: "Solo calligraphy competition" },
      { name: "Individual Creative Writing", type: "non-stage", participationType: "individual", description: "Individual writing contest" },
    ];

    programsData.forEach(programData => {
      const program: Program = { id: this.currentProgramId++, ...programData };
      this.programs.set(program.id, program);
    });
  }

  // Teams
  async getTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  async getTeam(id: number): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const newTeam: Team = { id: this.currentTeamId++, ...team };
    this.teams.set(newTeam.id, newTeam);
    return newTeam;
  }

  // Participants
  async getParticipant(id: number): Promise<Participant | undefined> {
    return this.participants.get(id);
  }

  async getParticipantByCode(code: string): Promise<Participant | undefined> {
    return Array.from(this.participants.values()).find(p => p.uniqueCode === code);
  }

  async getParticipantByName(name: string): Promise<Participant | undefined> {
    return Array.from(this.participants.values()).find(p => p.fullName.toLowerCase() === name.toLowerCase());
  }

  async getParticipantWithTeam(id: number): Promise<ParticipantWithTeam | undefined> {
    const participant = this.participants.get(id);
    if (!participant) return undefined;
    
    const team = this.teams.get(participant.teamId);
    if (!team) return undefined;
    
    return { ...participant, team };
  }

  async createParticipant(participant: InsertParticipant): Promise<Participant> {
    const newParticipant: Participant = { 
      id: this.currentParticipantId++, 
      ...participant 
    };
    this.participants.set(newParticipant.id, newParticipant);
    return newParticipant;
  }

  async updateParticipantImage(id: number, imageUrl: string): Promise<Participant | undefined> {
    const participant = this.participants.get(id);
    if (!participant) return undefined;
    
    const updatedParticipant = { ...participant, profileImage: imageUrl };
    this.participants.set(id, updatedParticipant);
    return updatedParticipant;
  }

  // Programs
  async getPrograms(): Promise<Program[]> {
    return Array.from(this.programs.values());
  }

  async getProgramsByType(type: string, participationType?: string): Promise<Program[]> {
    return Array.from(this.programs.values()).filter(p => {
      if (p.type !== type) return false;
      if (participationType && p.participationType !== participationType) return false;
      return true;
    });
  }

  async getProgram(id: number): Promise<Program | undefined> {
    return this.programs.get(id);
  }

  async createProgram(program: InsertProgram): Promise<Program> {
    const newProgram: Program = { id: this.currentProgramId++, ...program };
    this.programs.set(newProgram.id, newProgram);
    return newProgram;
  }

  // Registrations
  async getRegistrations(): Promise<Registration[]> {
    return Array.from(this.registrations.values());
  }

  async getRegistrationsByParticipant(participantId: number): Promise<Registration[]> {
    return Array.from(this.registrations.values()).filter(r => r.participantId === participantId);
  }

  async getRegistrationsWithDetails(): Promise<RegistrationWithDetails[]> {
    const registrations = Array.from(this.registrations.values());
    const result: RegistrationWithDetails[] = [];

    for (const registration of registrations) {
      const participantWithTeam = await this.getParticipantWithTeam(registration.participantId);
      const program = this.programs.get(registration.programId);
      
      if (participantWithTeam && program) {
        result.push({
          ...registration,
          participant: participantWithTeam,
          program
        });
      }
    }

    return result;
  }

  async getRegistrationsByParticipantWithDetails(participantId: number): Promise<RegistrationWithDetails[]> {
    const registrations = await this.getRegistrationsByParticipant(participantId);
    const result: RegistrationWithDetails[] = [];

    for (const registration of registrations) {
      const participantWithTeam = await this.getParticipantWithTeam(registration.participantId);
      const program = this.programs.get(registration.programId);
      
      if (participantWithTeam && program) {
        result.push({
          ...registration,
          participant: participantWithTeam,
          program
        });
      }
    }

    return result;
  }

  async createRegistration(registration: InsertRegistration): Promise<Registration> {
    const newRegistration: Registration = { 
      id: this.currentRegistrationId++, 
      ...registration,
      registeredAt: new Date().toISOString()
    };
    this.registrations.set(newRegistration.id, newRegistration);
    return newRegistration;
  }

  async deleteRegistration(id: number): Promise<boolean> {
    return this.registrations.delete(id);
  }

  // Statistics
  async getStats(): Promise<{
    totalRegistered: number;
    stagePrograms: number;
    nonStagePrograms: number;
    totalPrograms: number;
  }> {
    const registrations = Array.from(this.registrations.values());
    const uniqueParticipants = new Set(registrations.map(r => r.participantId));
    
    let stagePrograms = 0;
    let nonStagePrograms = 0;

    for (const registration of registrations) {
      const program = this.programs.get(registration.programId);
      if (program?.type === 'stage') stagePrograms++;
      else if (program?.type === 'non-stage') nonStagePrograms++;
    }

    return {
      totalRegistered: uniqueParticipants.size,
      stagePrograms,
      nonStagePrograms,
      totalPrograms: registrations.length
    };
  }

  // Utility method to generate unique codes
  generateUniqueCode(teamCode: string): string {
    const existingCodes = Array.from(this.participants.values()).map(p => p.uniqueCode);
    let counter = 1;
    let code: string;
    
    do {
      code = `${teamCode}${String(counter).padStart(3, '0')}`;
      counter++;
    } while (existingCodes.includes(code));
    
    return code;
  }
}

export const storage = new MemStorage();
