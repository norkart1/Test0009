import jsPDF from 'jspdf';
import type { RegistrationWithDetails, ParticipantWithTeam } from '@shared/schema';

export function generateIndividualReport(
  participant: ParticipantWithTeam,
  registrations: RegistrationWithDetails[]
): void {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Arts Fest Registration Report', 20, 30);
  
  // Participant Info
  doc.setFontSize(14);
  doc.text('Participant Information', 20, 50);
  doc.setFontSize(12);
  doc.text(`Name: ${participant.fullName}`, 20, 65);
  doc.text(`Team: ${participant.team.name}`, 20, 75);
  doc.text(`Code: ${participant.uniqueCode}`, 20, 85);
  
  // Programs
  doc.setFontSize(14);
  doc.text('Registered Programs', 20, 105);
  
  let yPosition = 120;
  registrations.forEach((registration, index) => {
    doc.setFontSize(12);
    doc.text(`${index + 1}. ${registration.program.name}`, 25, yPosition);
    doc.setFontSize(10);
    doc.text(`   Type: ${registration.program.type} | Participation: ${registration.program.participationType}`, 25, yPosition + 10);
    doc.text(`   Registered: ${new Date(registration.registeredAt).toLocaleDateString()}`, 25, yPosition + 20);
    yPosition += 35;
    
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 30;
    }
  });
  
  // Footer
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, doc.internal.pageSize.height - 20);
  
  doc.save(`${participant.fullName}_Arts_Fest_Report.pdf`);
}

export function generateHistoryIDCard(
  participant: ParticipantWithTeam,
  registrations: RegistrationWithDetails[]
): void {
  const doc = new jsPDF('l', 'mm', [85.6, 53.98]); // Credit card size
  
  // Background
  doc.setFillColor(99, 102, 241); // Primary color
  doc.rect(0, 0, 85.6, 53.98, 'F');
  
  // White content area
  doc.setFillColor(255, 255, 255);
  doc.rect(2, 2, 81.6, 49.98, 'F');
  
  // Header
  doc.setTextColor(99, 102, 241);
  doc.setFontSize(8);
  doc.text('ARTS FEST PARTICIPANT', 5, 8);
  
  // Name
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(participant.fullName, 5, 16);
  
  // Team and Code
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(`Team: ${participant.team.name}`, 5, 22);
  doc.text(`Code: ${participant.uniqueCode}`, 5, 27);
  
  // Programs count
  doc.text(`Programs: ${registrations.length}`, 5, 32);
  
  // QR Code placeholder (in a real app, you'd generate an actual QR code)
  doc.setFillColor(0, 0, 0);
  doc.rect(65, 10, 15, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);
  doc.text('QR', 70, 19);
  
  // Footer
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(6);
  doc.text('Arts Fest Registration Portal', 5, 47);
  doc.text(new Date().getFullYear().toString(), 70, 47);
  
  doc.save(`${participant.fullName}_ID_Card.pdf`);
}

export function generateBatchReport(registrations: RegistrationWithDetails[]): void {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Arts Fest - All Registrations Report', 20, 30);
  
  // Summary
  doc.setFontSize(14);
  doc.text('Summary', 20, 50);
  doc.setFontSize(12);
  doc.text(`Total Registrations: ${registrations.length}`, 20, 65);
  
  const uniqueParticipants = new Set(registrations.map(r => r.participant.id));
  doc.text(`Unique Participants: ${uniqueParticipants.size}`, 20, 75);
  
  const stagePrograms = registrations.filter(r => r.program.type === 'stage').length;
  const nonStagePrograms = registrations.filter(r => r.program.type === 'non-stage').length;
  
  doc.text(`Stage Programs: ${stagePrograms}`, 20, 85);
  doc.text(`Non-Stage Programs: ${nonStagePrograms}`, 20, 95);
  
  // Detailed list
  doc.setFontSize(14);
  doc.text('Detailed Registrations', 20, 115);
  
  let yPosition = 130;
  registrations.forEach((registration, index) => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 30;
    }
    
    doc.setFontSize(10);
    doc.text(`${index + 1}. ${registration.participant.fullName} (${registration.participant.uniqueCode})`, 20, yPosition);
    doc.text(`   Program: ${registration.program.name}`, 20, yPosition + 8);
    doc.text(`   Team: ${registration.participant.team.name} | Type: ${registration.program.type}`, 20, yPosition + 16);
    yPosition += 25;
  });
  
  // Footer
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, doc.internal.pageSize.height - 20);
  
  doc.save(`Arts_Fest_All_Registrations_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportToCSV(registrations: RegistrationWithDetails[]): void {
  const headers = [
    'Participant Name',
    'Team',
    'Unique Code',
    'Program Name',
    'Program Type',
    'Participation Type',
    'Registration Date'
  ];
  
  const csvContent = [
    headers.join(','),
    ...registrations.map(reg => [
      `"${reg.participant.fullName}"`,
      `"${reg.participant.team.name}"`,
      reg.participant.uniqueCode,
      `"${reg.program.name}"`,
      reg.program.type,
      reg.program.participationType,
      new Date(reg.registeredAt).toLocaleDateString()
    ].join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `Arts_Fest_Data_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJSON(registrations: RegistrationWithDetails[]): void {
  const data = {
    exportDate: new Date().toISOString(),
    totalRegistrations: registrations.length,
    registrations: registrations.map(reg => ({
      participant: {
        name: reg.participant.fullName,
        team: reg.participant.team.name,
        code: reg.participant.uniqueCode
      },
      program: {
        name: reg.program.name,
        type: reg.program.type,
        participationType: reg.program.participationType,
        description: reg.program.description
      },
      registrationDate: reg.registeredAt
    }))
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `Arts_Fest_Data_${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
