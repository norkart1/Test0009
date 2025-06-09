import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { firstRegistrationSchema, secondRegistrationSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get teams
  app.get("/api/teams", async (req, res) => {
    try {
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  // Get programs
  app.get("/api/programs", async (req, res) => {
    try {
      const { type, participationType } = req.query;
      
      if (type && typeof type === 'string') {
        const programs = await storage.getProgramsByType(
          type, 
          participationType as string | undefined
        );
        res.json(programs);
      } else {
        const programs = await storage.getPrograms();
        res.json(programs);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch programs" });
    }
  });

  // Get statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // First registration - create participant and generate code
  app.post("/api/register/first", async (req, res) => {
    try {
      const validatedData = firstRegistrationSchema.parse(req.body);
      
      // Check for duplicate name
      const existingParticipant = await storage.getParticipantByName(validatedData.fullName);
      if (existingParticipant) {
        return res.status(400).json({ 
          message: "A participant with this name already exists. Please use a different name." 
        });
      }

      // Get team for code generation
      const team = await storage.getTeam(validatedData.teamId);
      if (!team) {
        return res.status(400).json({ message: "Invalid team selected" });
      }

      // Generate unique code
      const uniqueCode = await storage.generateUniqueCode(team.code);

      // Create participant
      const participant = await storage.createParticipant({
        fullName: validatedData.fullName,
        teamId: validatedData.teamId,
        uniqueCode,
        profileImage: null,
      });

      const participantWithTeam = await storage.getParticipantWithTeam(participant.id);
      
      res.json({ 
        participant: participantWithTeam,
        uniqueCode,
        message: "Registration successful! Please save your unique code for program registration."
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Registration failed" });
      }
    }
  });

  // Validate code and get participant
  app.get("/api/participant/:code", async (req, res) => {
    try {
      const { code } = req.params;
      
      const participant = await storage.getParticipantByCode(code);
      if (!participant) {
        return res.status(404).json({ message: "Invalid code. Please check and try again." });
      }

      const participantWithTeam = await storage.getParticipantWithTeam(participant.id);
      const registrations = await storage.getRegistrationsByParticipantWithDetails(participant.id);
      
      res.json({ 
        participant: participantWithTeam,
        registrations
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch participant data" });
    }
  });

  // Second registration - register for programs
  app.post("/api/register/second", async (req, res) => {
    try {
      const validatedData = secondRegistrationSchema.parse(req.body);
      
      // Validate participant exists
      const participant = await storage.getParticipantByCode(validatedData.uniqueCode);
      if (!participant) {
        return res.status(404).json({ message: "Invalid code" });
      }

      // Update profile image if provided
      if (validatedData.profileImage) {
        await storage.updateParticipantImage(participant.id, validatedData.profileImage);
      }

      // Check for existing registrations to avoid duplicates
      const existingRegistrations = await storage.getRegistrationsByParticipant(participant.id);
      const existingProgramIds = existingRegistrations.map(r => r.programId);

      // Register for new programs
      const newRegistrations = [];
      for (const programId of validatedData.programIds) {
        if (!existingProgramIds.includes(programId)) {
          const registration = await storage.createRegistration({
            participantId: participant.id,
            programId
          });
          newRegistrations.push(registration);
        }
      }

      // Get updated registrations with details
      const allRegistrations = await storage.getRegistrationsByParticipantWithDetails(participant.id);
      
      res.json({ 
        registrations: allRegistrations,
        newRegistrations: newRegistrations.length,
        message: `Successfully registered for ${newRegistrations.length} program(s)`
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Program registration failed" });
      }
    }
  });

  // Upload profile image
  app.post("/api/upload/profile", upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // In a real application, you would upload to cloud storage
      // For now, we'll just return a mock URL
      const imageUrl = `/uploads/${req.file.filename}`;
      
      res.json({ 
        imageUrl,
        message: "Image uploaded successfully"
      });
    } catch (error) {
      res.status(500).json({ message: "Image upload failed" });
    }
  });

  // Delete program registration
  app.delete("/api/registration/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteRegistration(id);
      
      if (!success) {
        return res.status(404).json({ message: "Registration not found" });
      }
      
      res.json({ message: "Registration deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete registration" });
    }
  });

  // Get all registrations (for reports)
  app.get("/api/registrations", async (req, res) => {
    try {
      const registrations = await storage.getRegistrationsWithDetails();
      res.json(registrations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  // Serve uploaded files with proper headers
  app.use('/uploads', (req, res, next) => {
    const filePath = path.join(uploadDir, req.path);
    if (fs.existsSync(filePath)) {
      // Set proper content type for images
      const ext = path.extname(filePath).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        res.setHeader('Content-Type', `image/${ext.slice(1) === 'jpg' ? 'jpeg' : ext.slice(1)}`);
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
