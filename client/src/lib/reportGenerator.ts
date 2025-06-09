import jsPDF from 'jspdf';
import type { RegistrationWithDetails, ParticipantWithTeam } from '@shared/schema';

export function generateIndividualReport(
  participant: ParticipantWithTeam,
  registrations: RegistrationWithDetails[]
): void {
  const doc = new jsPDF();
  
  // Modern header with gradient effect
  doc.setFillColor(59, 130, 246); // Blue gradient start
  doc.rect(0, 0, 210, 45, 'F');
  
  // White header text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text('مهرجان الفنون', 105, 20, { align: 'center' });
  doc.setFontSize(16);
  doc.text('Arts Festival Registration Report', 105, 30, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`تقرير التسجيل الفردي`, 105, 40, { align: 'center' });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Participant Info Card
  doc.setFillColor(248, 250, 252); // Light gray background
  doc.roundedRect(15, 55, 180, 45, 5, 5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.roundedRect(15, 55, 180, 45, 5, 5, 'S');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text('معلومات المشارك | Participant Information', 25, 70);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  
  // Modern info layout with icons (represented as bullets)
  doc.text('●', 25, 82);
  doc.text(`الاسم | Name: ${participant.fullName}`, 32, 82);
  doc.text('●', 25, 90);
  doc.text(`الفريق | Team: ${participant.team.name}`, 32, 90);
  doc.text('●', 25, 98);
  doc.text(`الرمز | Code: ${participant.uniqueCode}`, 32, 98);
  
  // Programs section with modern styling
  let yPosition = 120;
  
  // Programs header
  doc.setFillColor(34, 197, 94); // Green background
  doc.rect(15, yPosition - 5, 180, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`البرامج المسجلة | Registered Programs (${registrations.length})`, 25, yPosition + 7);
  
  yPosition += 25;
  doc.setTextColor(0, 0, 0);
  
  registrations.forEach((registration, index) => {
    // Check for new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 30;
    }
    
    // Program card background
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(20, yPosition - 5, 170, 30, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(20, yPosition - 5, 170, 30, 3, 3, 'S');
    
    // Program number badge
    doc.setFillColor(99, 102, 241);
    doc.circle(30, yPosition + 5, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text((index + 1).toString(), 30, yPosition + 7, { align: 'center' });
    
    // Program details
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(registration.program.name, 40, yPosition + 2);
    
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(registration.program.description || '', 40, yPosition + 10);
    
    // Type badges
    const typeColor = registration.program.type === 'stage' ? [147, 51, 234] : [34, 197, 94];
    doc.setFillColor(typeColor[0], typeColor[1], typeColor[2]);
    doc.roundedRect(40, yPosition + 15, 25, 6, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(registration.program.type, 52.5, yPosition + 18.5, { align: 'center' });
    
    const participationColor = registration.program.participationType === 'group' ? [34, 197, 94] : [251, 146, 60];
    doc.setFillColor(participationColor[0], participationColor[1], participationColor[2]);
    doc.roundedRect(70, yPosition + 15, 30, 6, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(registration.program.participationType, 85, yPosition + 18.5, { align: 'center' });
    
    // Date
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(8);
    doc.text(`تاريخ التسجيل: ${new Date(registration.registeredAt).toLocaleDateString('ar-SA')}`, 150, yPosition + 18.5);
    
    yPosition += 40;
  });
  
  // Modern footer
  const footerY = doc.internal.pageSize.height - 25;
  doc.setFillColor(30, 41, 59);
  doc.rect(0, footerY, 210, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`تم إنشاء التقرير في: ${new Date().toLocaleDateString('ar-SA')}`, 20, footerY + 10);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, footerY + 18);
  doc.text('Arts Festival Registration System', 190, footerY + 14, { align: 'right' });
  
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
