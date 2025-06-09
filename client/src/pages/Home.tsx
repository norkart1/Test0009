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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
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
  Info,
  Filter,
  Search,
  Calendar,
  Award,
  Star,
  TrendingUp,
  Target,
  Activity
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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  
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

  // Fetch all registrations for reports
  const { data: allRegistrations = [] } = useQuery<RegistrationWithDetails[]>({
    queryKey: ["/api/registrations"],
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
      queryClient.invalidateQueries({ queryKey: ["/api/registrations"] });
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

  // Filter registrations for the table
  const filteredRegistrations = allRegistrations.filter(reg => {
    const matchesSearch = searchTerm === "" || 
      reg.participant.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.participant.uniqueCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.participant.team.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === "all" || reg.program.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(filteredRegistrations.map(reg => reg.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (registrationId: number, checked: boolean) => {
    if (checked) {
      setSelectedRows([...selectedRows, registrationId]);
    } else {
      setSelectedRows(selectedRows.filter(id => id !== registrationId));
    }
  };

  const exportSelectedData = (format: 'csv' | 'json' | 'pdf') => {
    const selectedData = filteredRegistrations.filter(reg => selectedRows.includes(reg.id));
    const dataToExport = selectedData.length > 0 ? selectedData : filteredRegistrations;
    
    switch (format) {
      case 'csv':
        exportToCSV(dataToExport);
        break;
      case 'json':
        exportToJSON(dataToExport);
        break;
      case 'pdf':
        generateBatchReport(dataToExport);
        break;
    }
    
    toast({
      title: "Export Successful",
      description: `Data exported in ${format.toUpperCase()} format`,
    });
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2.5 rounded-xl shadow-lg">
                <Palette className="text-white h-6 w-6" />
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
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              
              <div className="hidden sm:flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{stats?.totalRegistered || 0}</span>
                  <span>Registered</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{stats?.totalPrograms || 0}</span>
                  <span>Programs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Progress Indicator */}
        <Card className="mb-8 border-0 shadow-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Registration Progress</h2>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">Step {currentStep} of 3</span>
              </div>
            </div>
            
            <Progress value={getProgressPercentage()} className="mb-4 h-2" />
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm space-y-4 sm:space-y-0">
              <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${currentStep >= 1 ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-200 text-gray-400'}`}>
                  {currentStep > 1 ? <Check className="h-4 w-4" /> : '1'}
                </div>
                <span className="font-medium">First Registration</span>
              </div>
              <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${currentStep >= 2 ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-200 text-gray-400'}`}>
                  {currentStep > 2 ? <Check className="h-4 w-4" /> : '2'}
                </div>
                <span className="font-medium">Program Selection</span>
              </div>
              <div className={`flex items-center space-x-2 ${currentStep >= 3 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${currentStep >= 3 ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-200 text-gray-400'}`}>
                  {currentStep >= 3 ? <Check className="h-4 w-4" /> : '3'}
                </div>
                <span className="font-medium">Confirmation</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* First Registration Form */}
            {currentStep === 1 && (
              <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-t-lg">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-500 p-3 rounded-xl shadow-lg">
                      <UserPlus className="text-white h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">First Registration</CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Enter your details to get started</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <Form {...firstForm}>
                    <form onSubmit={firstForm.handleSubmit(handleFirstRegistration)} className="space-y-8">
                      <FormField
                        control={firstForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold">Full Name *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  {...field} 
                                  placeholder="Enter your full name" 
                                  className="pl-10 h-12 text-base border-2 focus:border-blue-500"
                                />
                                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                              </div>
                            </FormControl>
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                              <Info className="h-3 w-3" />
                              <span>We'll check for duplicate registrations automatically</span>
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
                            <FormLabel className="text-base font-semibold">Select Team *</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                              <FormControl>
                                <SelectTrigger className="h-12 text-base border-2 focus:border-blue-500">
                                  <SelectValue placeholder="Choose your team" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {teams.map((team) => (
                                  <SelectItem key={team.id} value={team.id.toString()}>
                                    <div className="flex items-center space-x-2">
                                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                      <span>{team.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start space-x-3">
                          <Info className="text-blue-600 dark:text-blue-400 mt-0.5 h-5 w-5" />
                          <div>
                            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">What happens next?</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                              After registration, you'll receive a unique code (e.g., QU001, BA001) that you'll use for program registration.
                            </p>
                          </div>
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                        disabled={firstRegistrationMutation.isPending}
                      >
                        {firstRegistrationMutation.isPending ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Generating Code...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <ArrowRight className="h-5 w-5" />
                            <span>Generate My Code</span>
                          </div>
                        )}
                      </Button>
                    </form>
                  </Form>

                  <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Already have a code?</p>
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                        <Input
                          placeholder="Enter your unique code"
                          value={existingCode}
                          onChange={(e) => setExistingCode(e.target.value)}
                          className="flex-1 h-10"
                        />
                        <Button
                          onClick={handleExistingCodeSubmit}
                          variant="outline"
                          disabled={validateCodeMutation.isPending}
                          className="h-10 px-6"
                        >
                          {validateCodeMutation.isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <LogIn className="h-4 w-4" />
                              <span>Continue</span>
                            </div>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Second Registration Form */}
            {currentStep === 2 && selectedParticipant && (
              <div className="space-y-8">
                {/* Participant Info Card */}
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                      <div className="relative">
                        {selectedParticipant.profileImage ? (
                          <img 
                            src={selectedParticipant.profileImage} 
                            alt="Profile" 
                            className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-white shadow-lg">
                            <User className="h-8 w-8 text-white" />
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsImageModalOpen(true)}
                          className="absolute -bottom-2 -right-2 rounded-full p-2 bg-white shadow-lg"
                        >
                          <Camera className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedParticipant.fullName}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {selectedParticipant.team.name}
                          </Badge>
                          <Badge variant="outline" className="font-mono">
                            {selectedParticipant.uniqueCode}
                          </Badge>
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {selectedRegistrations.length} Programs
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Program Selection */}
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-t-lg">
                    <div className="flex items-center space-x-3">
                      <div className="bg-green-500 p-3 rounded-xl shadow-lg">
                        <Drama className="text-white h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Program Registration</CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Select programs to participate in</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    
                    {/* Program Type Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-base font-semibold mb-3 block">Program Type *</Label>
                        <Select value={programType} onValueChange={setProgramType}>
                          <SelectTrigger className="h-12 text-base border-2">
                            <SelectValue placeholder="Select program type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="stage">
                              <div className="flex items-center space-x-2">
                                <Drama className="h-4 w-4 text-purple-500" />
                                <span>Stage Programs</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="non-stage">
                              <div className="flex items-center space-x-2">
                                <Palette className="h-4 w-4 text-blue-500" />
                                <span>Non-Stage Programs</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-base font-semibold mb-3 block">Participation Type *</Label>
                        <Select 
                          value={participationType} 
                          onValueChange={setParticipationType}
                          disabled={!programType}
                        >
                          <SelectTrigger className="h-12 text-base border-2">
                            <SelectValue placeholder="Select participation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="group">
                              <div className="flex items-center space-x-2">
                                <Users className="h-4 w-4 text-green-500" />
                                <span>Group Programs</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="individual">
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4 text-orange-500" />
                                <span>Individual Programs</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Available Programs */}
                    {programs.length > 0 && (
                      <div>
                        <Label className="text-base font-semibold mb-4 block">Available Programs</Label>
                        <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                          {programs.map((program) => {
                            const isSelected = selectedPrograms.includes(program.id);
                            const isAlreadyRegistered = selectedRegistrations.some(reg => reg.programId === program.id);
                            
                            return (
                              <div
                                key={program.id}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                  isAlreadyRegistered 
                                    ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600' 
                                    : isSelected 
                                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' 
                                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300'
                                }`}
                                onClick={() => {
                                  if (!isAlreadyRegistered) {
                                    if (isSelected) {
                                      removeProgram(program.id);
                                    } else {
                                      addProgram(program.id);
                                    }
                                  }
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900 dark:text-white">{program.name}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{program.description}</p>
                                    <div className="flex items-center space-x-2 mt-2">
                                      <Badge variant="outline" size="sm">
                                        {program.type}
                                      </Badge>
                                      <Badge variant="outline" size="sm">
                                        {program.participationType}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    {isAlreadyRegistered ? (
                                      <CheckCircle className="h-6 w-6 text-green-500" />
                                    ) : isSelected ? (
                                      <div className="w-6 h-6 bg-blue-500 rounded border-2 border-blue-500 flex items-center justify-center">
                                        <Check className="h-4 w-4 text-white" />
                                      </div>
                                    ) : (
                                      <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 rounded"></div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Selected Programs Summary */}
                    {selectedPrograms.length > 0 && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                        <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-3">Selected Programs ({selectedPrograms.length})</h4>
                        <div className="space-y-2">
                          {selectedPrograms.map(programId => {
                            const program = programs.find(p => p.id === programId);
                            return program ? (
                              <div key={programId} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{program.name}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeProgram(programId)}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}

                    <Button 
                      onClick={handleSecondRegistration}
                      className="w-full h-12 text-base bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg"
                      disabled={selectedPrograms.length === 0 || secondRegistrationMutation.isPending}
                    >
                      {secondRegistrationMutation.isPending ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Registering...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Check className="h-5 w-5" />
                          <span>Register for Programs ({selectedPrograms.length})</span>
                        </div>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Current Registrations */}
                {selectedRegistrations.length > 0 && (
                  <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span>Your Registrations ({selectedRegistrations.length})</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedRegistrations.map((registration) => (
                          <div key={registration.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">{registration.program.name}</h4>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline" size="sm">{registration.program.type}</Badge>
                                <Badge variant="outline" size="sm">{registration.program.participationType}</Badge>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(registration.registeredAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteRegistrationMutation.mutate(registration.id)}
                              disabled={deleteRegistrationMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Success Page */}
            {currentStep === 3 && selectedParticipant && (
              <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <CheckCircle className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Registration Complete!</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-8">
                    You have successfully registered for {selectedRegistrations.length} program(s).
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <Button
                      onClick={() => {
                        if (selectedParticipant) {
                          generateIndividualReport(selectedParticipant, selectedRegistrations);
                        }
                      }}
                      className="h-12 bg-blue-600 hover:bg-blue-700"
                    >
                      <FileText className="mr-2 h-5 w-5" />
                      Download Report
                    </Button>
                    <Button
                      onClick={() => {
                        if (selectedParticipant) {
                          generateHistoryIDCard(selectedParticipant, selectedRegistrations);
                        }
                      }}
                      variant="outline"
                      className="h-12"
                    >
                      <IdCard className="mr-2 h-5 w-5" />
                      Download ID Card
                    </Button>
                  </div>

                  <Button
                    onClick={() => {
                      setCurrentStep(1);
                      setSelectedParticipant(null);
                      setSelectedRegistrations([]);
                      setSelectedPrograms([]);
                      setProgramType("");
                      setParticipationType("");
                      setExistingCode("");
                      firstForm.reset();
                      secondForm.reset();
                    }}
                    variant="outline"
                    className="w-full h-12"
                  >
                    Register Another Participant
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="border-0 shadow-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <ChartBar className="h-5 w-5 text-blue-500" />
                  <span>Quick Stats</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.totalRegistered || 0}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">Participants</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats?.totalPrograms || 0}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">Registrations</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats?.stagePrograms || 0}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">Stage</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats?.nonStagePrograms || 0}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">Non-Stage</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Management & Export */}
            <Card className="border-0 shadow-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Database className="h-5 w-5 text-green-500" />
                  <span>Data Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Search and Filter */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search participants..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-10 border-2"
                    />
                  </div>
                  
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-10 border-2">
                      <div className="flex items-center space-x-2">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <SelectValue placeholder="Filter by type" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Programs</SelectItem>
                      <SelectItem value="stage">Stage Programs</SelectItem>
                      <SelectItem value="non-stage">Non-Stage Programs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Export Buttons */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Export Data</p>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      onClick={() => exportSelectedData('pdf')}
                      variant="outline"
                      size="sm"
                      className="justify-start h-9"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Export PDF Report
                    </Button>
                    <Button
                      onClick={() => exportSelectedData('csv')}
                      variant="outline"
                      size="sm"
                      className="justify-start h-9"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV Data
                    </Button>
                    <Button
                      onClick={() => exportSelectedData('json')}
                      variant="outline"
                      size="sm"
                      className="justify-start h-9"
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Export JSON Data
                    </Button>
                  </div>
                </div>

                {/* Selected Rows Info */}
                {selectedRows.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>{selectedRows.length}</strong> rows selected
                    </p>
                    <Button
                      onClick={() => setSelectedRows([])}
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-6 text-xs text-blue-600 dark:text-blue-400"
                    >
                      Clear selection
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Help & Support */}
            <Card className="border-0 shadow-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <HelpCircle className="h-5 w-5 text-purple-500" />
                  <span>Need Help?</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <p className="text-gray-600 dark:text-gray-300">
                      <strong>Step 1:</strong> Register with your name and team to get a unique code
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-gray-600 dark:text-gray-300">
                      <strong>Step 2:</strong> Use your code to register for programs
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <p className="text-gray-600 dark:text-gray-300">
                      <strong>Step 3:</strong> Download your reports and ID card
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <Mail className="h-4 w-4" />
                    <span>support@artsfest.com</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <Phone className="h-4 w-4" />
                    <span>+1 (555) 123-4567</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Data Table Section */}
        <Card className="mt-8 border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-t-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
              <div>
                <CardTitle className="flex items-center space-x-2 text-xl">
                  <Database className="h-6 w-6 text-blue-500" />
                  <span>Registration Data</span>
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Showing {filteredRegistrations.length} of {allRegistrations.length} registrations
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/registrations"] })}
                  variant="outline"
                  size="sm"
                >
                  <Activity className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-800">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedRows.length === filteredRegistrations.length && filteredRegistrations.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="font-semibold">Participant</TableHead>
                    <TableHead className="font-semibold">Team</TableHead>
                    <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Program</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Participation</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <div className="flex flex-col items-center space-y-3">
                          <Database className="h-12 w-12 text-gray-400" />
                          <p className="text-gray-500 dark:text-gray-400">No registrations found</p>
                          <p className="text-sm text-gray-400 dark:text-gray-500">
                            {searchTerm || filterType !== "all" 
                              ? "Try adjusting your search or filter criteria" 
                              : "Start by registering participants for programs"
                            }
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRegistrations.map((registration) => (
                      <TableRow 
                        key={registration.id} 
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          selectedRows.includes(registration.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedRows.includes(registration.id)}
                            onCheckedChange={(checked) => handleSelectRow(registration.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {registration.participant.fullName.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {registration.participant.fullName}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {registration.participant.team.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {registration.participant.uniqueCode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {registration.program.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-48">
                              {registration.program.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={registration.program.type === 'stage' ? 'default' : 'secondary'}
                            className={
                              registration.program.type === 'stage' 
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }
                          >
                            {registration.program.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={
                              registration.program.participationType === 'group'
                                ? 'border-green-300 text-green-700 dark:border-green-700 dark:text-green-400'
                                : 'border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400'
                            }
                          >
                            {registration.program.participationType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-300">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(registration.registeredAt).toLocaleDateString()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                generateIndividualReport(
                                  registration.participant,
                                  [registration]
                                );
                              }}
                              className="h-7 px-2"
                            >
                              <FileText className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                generateHistoryIDCard(
                                  registration.participant,
                                  [registration]
                                );
                              }}
                              className="h-7 px-2"
                            >
                              <IdCard className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteRegistrationMutation.mutate(registration.id)}
                              disabled={deleteRegistrationMutation.isPending}
                              className="h-7 px-2"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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