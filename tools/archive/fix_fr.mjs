import fs from 'fs';

let content = fs.readFileSync('prepare_task20_js_services.mjs', 'utf8');
content = content.replace("startWorkout: \"COMMENCER L'ENTRAÎNEMENT\",", "startWorkout: \"DÉMARRER LA SÉANCE\",");
content = content.replace("startWorkout: 'COMMENCER L\\'ENTRAÎNEMENT',", "startWorkout: 'DÉMARRER LA SÉANCE',");

fs.writeFileSync('prepare_task20_js_services.mjs', content, 'utf8');
console.log('Fixed French translation successfully!');
