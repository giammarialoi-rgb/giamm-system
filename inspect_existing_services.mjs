import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');

// Check what services currently exist in LAYER 2 & LAYER 5
const services = ['ProgramService', 'WorkoutService', 'NutritionService', 'SupplementService', 'TherapyService', 'ExamService', 'ImportService', 'AIService', 'NotificationService', 'CalendarService', 'GoogleService', 'AppleService', 'FoodDatabaseService', 'SupplementDatabaseService', 'MedicationDatabaseService', 'ExerciseDatabaseService'];

services.forEach(s => {
  const match = html.match(new RegExp(`(?:const|var|let)\\s+${s}\\s*=\\s*\\{([\\s\\S]*?)\\n\\};`));
  if (match) {
    console.log(`Service ${s} found (length: ${match[0].length})`);
  } else {
    console.log(`Service ${s} NOT FOUND`);
  }
});
