import { SupabaseService } from './services/SupabaseService';

async function run() {
  try {
    console.log("Fetching profs...");
    const profs = await SupabaseService.getSupportProfessionals();
    console.log("Profs length:", profs.length);
  } catch (e) {
    console.error("Profs Error:", e);
  }

  try {
    console.log("Fetching students...");
    const students = await SupabaseService.getStudents();
    console.log("Students length:", students.length);
  } catch (e) {
    console.error("Students Error:", e);
  }
}

run();
