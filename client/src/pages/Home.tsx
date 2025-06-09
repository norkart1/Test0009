import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { ImageUploadModal } from "@/components/ImageUploadModal";
import { apiRequest } from "@/lib/queryClient";
import { 
  firstRegistrationSchema, 
  secondRegistrationSchema,
  type FirstRegistration,
  type SecondRegistration,
  type Team,
  type Program,
  type ParticipantWithTeam,
  type RegistrationWithDetails
} from "@shared/schema";
import {
  generateIndividualReport,
  generateHistoryIDCard,
  generateBatchReport,
  exportToCSV,
  exportToJSON
} from "@/lib/reportGenerator";
import {
  Palette,
  Moon,
  Sun,
  Users,
  UserPlus,
  Key,
  ChartBar,
  HelpCircle,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  Drama,
  User,
  Plus,
  Edit,
  Trash2,
  Download,
  FileText,
  Archive,
  IdCard,
  Database,
  Save,
  Check,
  Camera,
  ArrowRight,
  LogIn,
  Info
} from "lucide-react";

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantWithTeam | null>(null);
  const [selectedRegistrations, setSelectedRegistrations] = useState<RegistrationWithDetails[]>([]);
  const [programType, setProgramType] = useState<string>("");
  const [participationType, setParticipationType] = useState<string>("");
  const [existingCode, setExistingCode] = useState("");
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedPrograms, setSelectedPrograms] = useState<number[]>([]);
  
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch teams
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Fetch programs based on type and participation
  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ["/api/programs", programType, participationType],
    enabled: !!programType,
  });

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  // First registration form
  const firstForm = useForm<FirstRegistration>({
    resolver: zodResolver(firstRegistrationSchema),
    defaultValues: {
      fullName: "",
      teamId: 0,
    },
  });

  // Second registration form
  const secondForm = useForm<SecondRegistration>({
    resolver: zodResolver(secondRegistrationSchema),
    defaultValues: {
      uniqueCode: "",
      programIds: [],
      profileImage: "",
    },
  });

  // First registration mutation
  const firstRegistrationMutation = useMutation({
    mutationFn: async (data: FirstRegistration) => {
      const response = await apiRequest("POST", "/api/register/first", data);
      return response.json();
    },
    onSuccess: (data) => {
      setSelectedParticipant(data.participant);
      setCurrentStep(2);
      secondForm.setValue("uniqueCode", data.uniqueCode);
      toast({
        title: "Registration Successful!",
        description: `Your unique code is: ${data.uniqueCode}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Second registration mutation
  const secondRegistrationMutation = useMutation({
    mutationFn: async (data: SecondRegistration) => {
      const response = await apiRequest("POST", "/api/register/second", data);
      return response.json();
    },
    onSuccess: (data) => {
      setSelectedRegistrations(data.registrations);
      setCurrentStep(3);
      setSelectedPrograms([]);
      toast({
        title: "Programs Registered!",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Validate existing code mutation
  const validateCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("GET", `/api/participant/${code}`);
      return response.json();
    },
    onSuccess: (data) => {
      setSelectedParticipant(data.participant);
      setSelectedRegistrations(data.registrations);
      setCurrentStep(2);
      secondForm.setValue("uniqueCode", data.participant.uniqueCode);
      toast({
        title: "Code Validated",
        description: "Proceed with program registration",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Invalid Code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete registration mutation
  const deleteRegistrationMutation = useMutation({
    mutationFn: async (registrationId: number) => {
      const response = await apiRequest("DELETE", `/api/registration/${registrationId}`);
      return response.json();
    },
    onSuccess: () => {
      if (selectedParticipant) {
        validateCodeMutation.mutate(selectedParticipant.uniqueCode);
      }
      toast({
        title: "Success",
        description: "Registration deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch all registrations for reports
  const { data: allRegistrations = [] } = useQuery<RegistrationWithDetails[]>({
    queryKey: ["/api/registrations"],
  });

  const handleFirstRegistration = (data: FirstRegistration) => {
    firstRegistrationMutation.mutate(data);
  };

  const handleSecondRegistration = () => {
    if (selectedPrograms.length === 0) {
      toast({
        title: "No Programs Selected",
        description: "Please select at least one program",
        variant: "destructive",
      });
      return;
    }

    secondRegistrationMutation.mutate({
      uniqueCode: selectedParticipant?.uniqueCode || "",
      programIds: selectedPrograms,
      profileImage: secondForm.getValues("profileImage"),
    });
  };

  const handleExistingCodeSubmit = () => {
    if (!existingCode.trim()) {
      toast({
        title: "Code Required",
        description: "Please enter your unique code",
        variant: "destructive",
      });
      return;
    }
    validateCodeMutation.mutate(existingCode);
  };

  const handleImageUpload = (imageUrl: string) => {
    secondForm.setValue("profileImage", imageUrl);
    toast({
      title: "Image Uploaded",
      description: "Profile photo updated successfully",
    });
  };

  const addProgram = (programId: number) => {
    if (!selectedPrograms.includes(programId)) {
      setSelectedPrograms([...selectedPrograms, programId]);
    }
  };

  const removeProgram = (programId: number) => {
    setSelectedPrograms(selectedPrograms.filter(id => id !== programId));
  };

  const getProgressPercentage = () => {
    switch (currentStep) {
      case 1: return 33;
      case 2: return 66;
      case 3: return 100;
      default: return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-primary to-secondary p-2 rounded-lg">
                <Palette className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Arts Fest Portal</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Registration System</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                className="p-2"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                <Users className="h-4 w-4" />
                <span>{stats?.totalRegistered || 0} Registered</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Progress Indicator */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Registration Progress</h2>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-500 font-medium">Step {currentStep} of 3</span>
              </div>
            </div>
            
            <Progress value={getProgressPercentage()} className="mb-4" />
            
            <div className="flex items-center justify-between text-sm">
              <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-green-500' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                  1
                </div>
                <span>First Registration</span>
              </div>
              <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-green-500' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                  2
                </div>
                <span>Program Selection</span>
              </div>
              <div className={`flex items-center space-x-2 ${currentStep >= 3 ? 'text-green-500' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                  3
                </div>
                <span>Confirmation</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            
            {/* First Registration Form */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <UserPlus className="text-primary" />
                    </div>
                    <div>
                      <CardTitle>First Registration</CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Enter your details to get started</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Form {...firstForm}>
                    <form onSubmit={firstForm.handleSubmit(handleFirstRegistration)} className="space-y-6">
                      <FormField
                        control={firstForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input {...field} placeholder="Enter your full name" />
                                <User className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                              </div>
                            </FormControl>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              We'll check for duplicate registrations automatically
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={firstForm.control}
                        name="teamId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Team *</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose your team" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {teams.map((team) => (
                                  <SelectItem key={team.id} value={team.id.toString()}>
                                    {team.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <Info className="text-primary mt-0.5 h-4 w-4" />
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">What happens next?</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                              After registration, you'll receive a unique code (e.g., QU001, BA001) that you'll use for program registration.
                            </p>
                          </div>
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={firstRegistrationMutation.isPending}
                      >
                        <ArrowRight className="mr-2 h-4 w-4" />
                        {firstRegistrationMutation.isPending ? "Generating Code..." : "Generate My Code"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* Second Registration Form */}
            {currentStep === 2 && selectedParticipant && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-green-500/10 p-3 rounded-lg">
                        <CheckCircle className="text-green-500 text-xl" />
                      </div>
                      <div>
                        <CardTitle>Program Registration</CardTitle>
                        <p className="text-gray-500 dark:text-gray-400">
                          Code: <Badge variant="outline" className="font-mono">{selectedParticipant.uniqueCode}</Badge>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <img 
                          src={selectedParticipant.profileImage || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150"} 
                          alt="Profile" 
                          className="w-16 h-16 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-lg"
                        />
                        <Button
                          size="sm"
                          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full p-0"
                          onClick={() => setIsImageModalOpen(true)}
                        >
                          <Camera className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsImageModalOpen(true)}
                      >
                        Upload Photo
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-8">
                    
                    {/* Program Type Selection */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Program Type</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant={programType === "stage" ? "default" : "outline"}
                            className="p-4 h-auto flex-col space-y-2"
                            onClick={() => setProgramType("stage")}
                          >
                            <Drama className="h-6 w-6" />
                            <div className="font-medium">Stage Programs</div>
                            <div className="text-xs opacity-75">
                              {programs.filter(p => p.type === "stage").length} available
                            </div>
                          </Button>
                          <Button
                            variant={programType === "non-stage" ? "default" : "outline"}
                            className="p-4 h-auto flex-col space-y-2"
                            onClick={() => setProgramType("non-stage")}
                          >
                            <Palette className="h-6 w-6" />
                            <div className="font-medium">Non-Stage Programs</div>
                            <div className="text-xs opacity-75">
                              {programs.filter(p => p.type === "non-stage").length} available
                            </div>
                          </Button>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Participation Type</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant={participationType === "group" ? "secondary" : "outline"}
                            className="p-4 h-auto flex-col space-y-2"
                            onClick={() => setParticipationType("group")}
                          >
                            <Users className="h-6 w-6" />
                            <div className="font-medium">Group</div>
                            <div className="text-xs opacity-75">Team events</div>
                          </Button>
                          <Button
                            variant={participationType === "individual" ? "secondary" : "outline"}
                            className="p-4 h-auto flex-col space-y-2"
                            onClick={() => setParticipationType("individual")}
                          >
                            <User className="h-6 w-6" />
                            <div className="font-medium">Individual</div>
                            <div className="text-xs opacity-75">Solo events</div>
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Program Selection */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available Programs</h3>
                        
                        {programType && participationType && (
                          <div className="space-y-4">
                            <Select onValueChange={(value) => addProgram(parseInt(value))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a program" />
                              </SelectTrigger>
                              <SelectContent>
                                {programs
                                  .filter(p => p.type === programType && p.participationType === participationType)
                                  .filter(p => !selectedPrograms.includes(p.id))
                                  .map((program) => (
                                    <SelectItem key={program.id} value={program.id.toString()}>
                                      {program.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      {/* Selected Programs */}
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Selected Programs</h4>
                        
                        {selectedPrograms.length > 0 ? (
                          <div className="space-y-2">
                            {selectedPrograms.map((programId) => {
                              const program = programs.find(p => p.id === programId);
                              if (!program) return null;
                              
                              return (
                                <div key={programId} className="flex items-center justify-between bg-white dark:bg-gray-700 p-3 rounded-lg">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                      <Drama className="text-primary text-sm" />
                                    </div>
                                    <div>
                                      <div className="font-medium text-gray-900 dark:text-white">{program.name}</div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {program.type} • {program.participationType}
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeProgram(programId)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                            <Info className="mx-auto mb-2 h-8 w-8" />
                            <p>No programs selected yet</p>
                          </div>
                        )}
                      </div>

                      {/* Existing Registrations */}
                      {selectedRegistrations.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Current Registrations</h4>
                          <div className="space-y-2">
                            {selectedRegistrations.map((registration) => (
                              <div key={registration.id} className="flex items-center justify-between bg-white dark:bg-gray-700 p-3 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                    <CheckCircle className="text-blue-500 text-sm" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-white">{registration.program.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      Registered: {new Date(registration.registeredAt).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteRegistrationMutation.mutate(registration.id)}
                                  disabled={deleteRegistrationMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col sm:flex-row gap-4">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setCurrentStep(1)}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Back to First Step
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={handleSecondRegistration}
                      disabled={secondRegistrationMutation.isPending || selectedPrograms.length === 0}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {secondRegistrationMutation.isPending ? "Registering..." : "Complete Registration"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Confirmation Step */}
            {currentStep === 3 && selectedParticipant && (
              <Card>
                <CardHeader>
                  <div className="text-center">
                    <div className="bg-green-500/10 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <CheckCircle className="text-green-500 text-3xl" />
                    </div>
                    <CardTitle className="text-2xl text-green-600">Registration Complete!</CardTitle>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                      You have successfully registered for the Arts Fest programs
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Your Details</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Name: {selectedParticipant.fullName}<br />
                        Team: {selectedParticipant.team.name}<br />
                        Code: <Badge variant="outline" className="font-mono">{selectedParticipant.uniqueCode}</Badge>
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Registered Programs</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        You are registered for {selectedRegistrations.length} program(s)
                      </p>
                    </div>

                    <Button
                      onClick={() => {
                        setCurrentStep(1);
                        setSelectedParticipant(null);
                        setSelectedRegistrations([]);
                        setSelectedPrograms([]);
                        setProgramType("");
                        setParticipationType("");
                        firstForm.reset();
                        secondForm.reset();
                      }}
                      className="w-full"
                    >
                      Register Another Participant
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Existing User Card */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="bg-secondary/10 p-2 rounded-lg">
                      <Key className="text-secondary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Have a Code?</CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Skip to program registration</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Enter your code (e.g., QU001)"
                    value={existingCode}
                    onChange={(e) => setExistingCode(e.target.value)}
                  />
                  <Button 
                    className="w-full" 
                    variant="secondary"
                    onClick={handleExistingCodeSubmit}
                    disabled={validateCodeMutation.isPending}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    {validateCodeMutation.isPending ? "Validating..." : "Continue Registration"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Statistics Card */}
            <Card className="bg-gradient-to-br from-primary to-secondary text-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Registration Stats</CardTitle>
                  <ChartBar className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-90">Total Registered</span>
                  <span className="font-bold">{stats?.totalRegistered || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-90">Stage Programs</span>
                  <span className="font-bold">{stats?.stagePrograms || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-90">Non-Stage Programs</span>
                  <span className="font-bold">{stats?.nonStagePrograms || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* Help Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="bg-green-500/10 p-2 rounded-lg">
                    <HelpCircle className="text-green-500" />
                  </div>
                  <CardTitle className="text-base">Need Help?</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                  <Mail className="h-4 w-4" />
                  <span>support@artsfest.edu</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                  <Phone className="h-4 w-4" />
                  <span>+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                  <Clock className="h-4 w-4" />
                  <span>Mon-Fri 9AM-5PM</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reports Section */}
        <Card className="mt-12">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="bg-yellow-500/10 p-2 rounded-lg">
                <Download className="text-yellow-500" />
              </div>
              <div>
                <CardTitle>Reports & Downloads</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">Generate and download your participation reports</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="p-4 h-auto flex-col space-y-2"
                onClick={() => {
                  if (selectedParticipant && selectedRegistrations.length > 0) {
                    generateIndividualReport(selectedParticipant, selectedRegistrations);
                  } else {
                    toast({
                      title: "No Data",
                      description: "Please complete registration first",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <FileText className="text-primary text-2xl" />
                <div className="font-medium text-gray-900 dark:text-white">Individual Report</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">PDF format</div>
              </Button>

              <Button 
                variant="outline" 
                className="p-4 h-auto flex-col space-y-2"
                onClick={() => {
                  if (allRegistrations.length > 0) {
                    generateBatchReport(allRegistrations);
                  } else {
                    toast({
                      title: "No Data",
                      description: "No registrations found",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Archive className="text-primary text-2xl" />
                <div className="font-medium text-gray-900 dark:text-white">All Reports</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">PDF format</div>
              </Button>

              <Button 
                variant="outline" 
                className="p-4 h-auto flex-col space-y-2"
                onClick={() => {
                  if (selectedParticipant && selectedRegistrations.length > 0) {
                    generateHistoryIDCard(selectedParticipant, selectedRegistrations);
                  } else {
                    toast({
                      title: "No Data",
                      description: "Please complete registration first",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <IdCard className="text-secondary text-2xl" />
                <div className="font-medium text-gray-900 dark:text-white">History ID Card</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">PDF format</div>
              </Button>

              <Button 
                variant="outline" 
                className="p-4 h-auto flex-col space-y-2"
                onClick={() => {
                  if (allRegistrations.length > 0) {
                    const format = window.confirm("Export as CSV? (Cancel for JSON)");
                    if (format) {
                      exportToCSV(allRegistrations);
                    } else {
                      exportToJSON(allRegistrations);
                    }
                  } else {
                    toast({
                      title: "No Data",
                      description: "No registrations found",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Database className="text-green-500 text-2xl" />
                <div className="font-medium text-gray-900 dark:text-white">Export Data</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">CSV/JSON format</div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Image Upload Modal */}
      <ImageUploadModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onImageUpload={handleImageUpload}
      />
    </div>
  );
}
