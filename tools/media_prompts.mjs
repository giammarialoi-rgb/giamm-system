// The exercises that still have no picture, each with what the two panels must show, and the master prompt to give to
// the image generator once. It writes docs/PROMPT_IMMAGINI_ESERCIZI.md.
//
//   node tools/media_prompts.mjs            write the document
//   node tools/media_prompts.mjs --check    exit 1 when the list does not match the library (an exercise without a
//                                           picture that is not here, or here with a picture already)
//
// Every entry: [file name (the picture's name, ASCII), name in the library, English name, equipment, view,
//               START panel, END panel, muscles in red]
// The file name must derive to the id of the library name (canonicalExerciseId): checked below.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { canonicalExerciseId } from '../server/media/canonical-id.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const MAT = 'dark-grey exercise mat';

export const SECTIONS = [
  { title: 'Pilates (da rifare in due pannelli) e due esercizi con attrezzo', items: [
    ['Roll over', 'Roll over', 'Pilates Roll Over', MAT, 'side view', 'lying flat on the back, arms along the body palms down, legs straight together on the mat', 'legs lifted and carried OVER THE HEAD, straight legs parallel to the floor above the head with toes pointing towards the floor behind the head, hips lifted off the mat, weight on the shoulders and upper back (not the neck), arms pressing flat on the mat', 'abdominals, hip flexors, lower back'],
    ['Single leg stretch', 'Single leg stretch', 'Pilates Single Leg Stretch', MAT, 'side view', 'lying on the back, head and shoulders curled off the mat, RIGHT knee pulled to the chest with both hands holding the right shin, LEFT leg stretched straight out at about 45 degrees above the mat', 'the legs SWITCHED: LEFT knee pulled to the chest with both hands on the left shin, RIGHT leg stretched straight out at 45 degrees. Head and shoulders stay curled up', 'abdominals, hip flexors'],
    ['Scissors', 'Scissors', 'Pilates Single Straight Leg Stretch', MAT, 'side view', 'lying on the back, head and shoulders curled up, both legs straight: the RIGHT leg pointing up towards the ceiling with both hands holding behind the right calf, the LEFT leg lowered straight out at about 30 degrees above the mat', 'the legs SWITCHED: LEFT leg straight up with both hands holding behind the left calf, RIGHT leg lowered straight at 30 degrees. Head and shoulders stay curled up', 'abdominals, hip flexors, hamstrings'],
    ['Neck pull', 'Neck pull', 'Pilates Neck Pull', MAT, 'side view', 'lying flat on the back, legs straight together, hands interlaced behind the head, elbows wide', 'sitting upright then folded forward over the straight legs, spine rounded in a C-curve, hands still interlaced behind the head, elbows wide, head down towards the knees', 'abdominals, lower back'],
    ['Jackknife', 'Jackknife', 'Pilates Jackknife', MAT, 'side view', 'lying flat on the back, legs straight together lifted vertical towards the ceiling, arms along the body pressing on the mat', 'hips and legs pushed up in one vertical straight line towards the ceiling (like a shoulder stand), weight on the shoulder blades, arms pressing on the mat, feet pointing up', 'abdominals, glutes, hip flexors'],
    ['Shoulder bridge', 'Shoulder bridge', 'Pilates Shoulder Bridge', MAT, 'side view', 'lying on the back, knees bent, both feet flat on the mat, arms along the body', 'hips lifted high in a bridge (shoulders, hips and knee in a straight line), the RIGHT leg extended straight up towards the ceiling, left foot flat on the mat, arms pressing on the mat', 'glutes, hamstrings, abdominals'],
    ['Spine twist', 'Spine twist', 'Pilates Spine Twist', MAT, 'front view, slightly from the side', 'sitting tall on the mat, legs straight together, arms stretched out to the sides at shoulder height, torso facing forward', 'torso rotated about 60 degrees to the right, arms still at shoulder height and level, head following the rotation, legs and hips still', 'obliques, abdominals'],
    ['Side kick series', 'Side kick series', 'Pilates Side Kick Series', MAT, 'side view', 'lying on the left side, head resting on the lower hand, legs stacked and slightly forward, the top (right) leg lifted straight to hip height and held there', 'the same position, the top leg swung forward in a front kick, straight, foot flexed, at hip height, torso still', 'glutes (outer hip), hip flexors, obliques'],
    ['Teaser', 'Teaser', 'Pilates Teaser', MAT, 'side view', 'lying flat on the back, legs straight together, arms stretched overhead along the ears', 'balancing on the sitting bones in a V: torso and straight legs both lifted, arms reaching forward parallel to the legs towards the toes', 'abdominals, hip flexors'],
    ['Hip circles', 'Hip circles', 'Pilates Hip Circles', MAT, 'side view from the front-left', 'sitting leaning back on straight arms (hands on the mat behind the hips), legs together lifted straight in front at about 45 degrees', 'the same position with the legs together swung to the right side of the body, still lifted, one curved circular arrow showing the legs drawing a big circle', 'abdominals, hip flexors, obliques'],
    ['Swimming', 'Swimming', 'Pilates Swimming', MAT, 'side view', 'lying face down, arms stretched forward, legs straight, resting on the mat', 'face down with the RIGHT arm and the LEFT leg lifted off the mat at the same time, chest slightly lifted, the other arm and leg staying low', 'lower back, glutes, shoulders'],
    ['Leg pull front', 'Leg pull front', 'Pilates Leg Pull Front', MAT, 'side view', 'high plank: hands under the shoulders, arms straight, body in one straight line from head to heels', 'high plank with the RIGHT leg lifted straight behind to hip height, heel up, body still in a straight line, hips level', 'abdominals, shoulders, glutes'],
    ['Leg pull back', 'Leg pull back', 'Pilates Leg Pull', MAT, 'side view', 'reverse plank: sitting with hands on the mat behind the hips, arms straight, hips lifted so the body is a straight line facing up, feet on the mat', 'reverse plank with the RIGHT leg lifted straight up towards the ceiling, foot pointed, hips high and level', 'glutes, hamstrings, abdominals, triceps'],
    ['Kneeling side kick', 'Kneeling side kick', 'Pilates Kneeling Side Kick', MAT, 'front view', 'kneeling on the left knee with the left hand flat on the mat, the right hand behind the head, the right leg stretched out to the right side at hip height', 'the right leg kicked forward in front of the body, still at hip height, straight, torso upright and still', 'glutes, hip flexors, obliques'],
    ['Mermaid', 'Mermaid', 'Pilates Mermaid', MAT, 'front view', 'sitting tall in a cross-legged position, the right hand on the mat at the side, the left arm relaxed along the body', 'torso bent to the right in a side stretch, the left arm reaching overhead and over to the right, ribs bending towards the hand on the mat', 'obliques'],
    ['Boomerang', 'Boomerang', 'Pilates Boomerang', MAT, 'side view', 'sitting leaning back slightly, legs stretched forward crossed at the ankles, arms reaching forward along the legs', 'rolled back with the crossed legs carried over the head (toes towards the floor behind the head), hips lifted, arms pressing flat on the mat', 'abdominals, hip flexors'],
    ['Seal', 'Seal', 'Pilates Seal', MAT, 'side view', 'balancing on the sitting bones in a round C-curve, knees wide open, feet together, hands holding the feet from the inside, head tucked', 'rolled back onto the shoulder blades, same shape (knees open, feet together, hands on the feet), feet in the air, head tucked', 'abdominals'],
    ['Control balance', 'Control balance', 'Pilates Control Balance', MAT, 'side view', 'rolled over: hips lifted, legs pointing straight up (shoulder-stand-like), one hand holding the right ankle, the left arm pressing on the mat', 'the LEFT leg lowered straight down towards the floor in front of the body at about 45 degrees while the right leg stays vertical held by the hand', 'abdominals, hip flexors, glutes'],
    ['Pilates push-up', 'Pilates push-up', 'Pilates Push Up', MAT, 'side view', 'high plank: arms straight under the shoulders, body in one line from head to heels', 'bottom of the push-up: chest lowered to a fist from the mat, elbows bent backwards close to the ribs, body still in a straight line', 'chest, triceps, shoulders, abdominals'],
    ['Pulldown neutro', 'Pulldown neutro', 'Neutral Grip Lat Pulldown', 'lat pulldown machine with a thigh pad and a neutral-grip (parallel handles) V bar', 'side view', 'seated at the lat pulldown machine, knees under the thigh pad, arms fully extended overhead holding the neutral-grip handle, slight lean back', 'the handle pulled down to the upper chest, elbows down along the sides, chest up', 'lats, biceps, rear shoulders'],
    ['Towel row', 'Towel row', 'Towel Row (door)', 'a rolled towel looped around a door handle, a door', 'side view', 'leaning back with straight arms holding both ends of the towel, feet near the door, body in a straight line inclined backwards', 'pulled in towards the door: elbows bent behind the torso, hands at the chest, body still straight and inclined', 'lats, rhomboids, biceps']
  ] },
  { title: 'Mobilità e stretching', items: [
    ['Cat-cow', 'Cat-cow', 'Cat Cow Stretch', MAT, 'side view', 'on all fours, back arched down (cow), chest and head lifted, tailbone up', 'on all fours, spine rounded up towards the ceiling (cat), head down, tailbone tucked', 'spine, abdominals'],
    ['World s greatest stretch', 'World’s greatest stretch', 'World\'s Greatest Stretch', MAT, 'side view', 'deep lunge, RIGHT foot forward, both hands on the mat inside the front foot, back leg straight', 'the same lunge with the torso rotated to the right and the right arm reaching up to the ceiling, eyes following the hand', 'hip flexors, glutes, spine rotators'],
    ['Stretch 90 90 anche', 'Stretch 90/90 anche', '90/90 Hip Stretch', MAT, 'front view', 'sitting on the mat with both knees bent at 90 degrees: front leg shin parallel to the front, back leg to the side, torso upright', 'the torso folded forward over the front shin, hands reaching on the mat, back straight', 'glutes, hip rotators'],
    ['Stretch flessori dell anca', 'Stretch flessori dell’anca', 'Half Kneeling Hip Flexor Stretch', MAT, 'side view', 'half kneeling (left knee on the mat, right foot forward), torso upright, hands on the front thigh', 'pelvis pushed forward with the back glute squeezed, both arms reaching overhead, torso tall', 'hip flexors, front thigh'],
    ['Posizione del bambino', 'Posizione del bambino', 'Child\'s Pose', MAT, 'side view', 'kneeling upright sitting on the heels, hands on the thighs, torso tall', 'folded forward, forehead on the mat, arms stretched out in front, hips back on the heels', 'lower back, lats'],
    ['Cane a testa in giu', 'Cane a testa in giù', 'Downward Dog', MAT, 'side view', 'on all fours in a table position, hands under the shoulders, knees under the hips', 'inverted V: hips high, arms and legs straight, heels towards the mat, head between the arms', 'hamstrings, calves, shoulders'],
    ['Cobra', 'Cobra', 'Cobra Stretch', MAT, 'side view', 'lying face down, hands flat under the shoulders, forehead on the mat', 'chest lifted by pressing on the hands, arms almost straight, pelvis and legs on the mat, head up', 'abdominals (stretch), lower back'],
    ['Rotazioni toraciche in quadrupedia', 'Rotazioni toraciche in quadrupedia', 'Quadruped Thoracic Rotation', MAT, 'front view, slightly from the side', 'on all fours, the right hand behind the head, elbow pointing down towards the left arm', 'the right elbow rotated up towards the ceiling, chest opened, eyes following the elbow', 'upper back, obliques'],
    ['Thread the needle', 'Thread the needle', 'Thread the Needle Stretch', MAT, 'front view, slightly from the side', 'on all fours, the right arm reaching up to the ceiling with the chest open', 'the right arm threaded under the chest to the left, right shoulder and cheek resting on the mat, hips high', 'shoulders, upper back'],
    ['Squat profondo tenuto', 'Squat profondo tenuto', 'Deep Squat Hold', 'none', 'front view', 'standing with the feet slightly wider than the shoulders, toes turned out, hands together at the chest', 'the deepest squat, heels flat, torso upright, hands in prayer position with the elbows pushing the knees out', 'hips, adductors, ankles'],
    ['Stretch ischiocrurali supino', 'Stretch ischiocrurali supino', 'Supine Hamstring Stretch', MAT, 'side view', 'lying on the back with one leg flat on the mat and the other knee bent', 'the RIGHT leg straight up towards the ceiling held with both hands behind the thigh, the left leg flat on the mat', 'hamstrings'],
    ['Stretch del piccione', 'Stretch del piccione', 'Pigeon Stretch', MAT, 'side view', 'on all fours', 'pigeon pose: the right shin across the mat in front, the left leg extended straight behind, torso upright with hands on the mat', 'glutes, hip rotators'],
    ['Stretch a rana', 'Stretch a rana', 'Frog Stretch', MAT, 'side view and slightly from above', 'on all fours with the knees close together', 'frog position: knees wide apart, feet turned out, hips pushed back, forearms on the mat', 'adductors'],
    ['Stretch polpacci al muro', 'Stretch polpacci al muro', 'Wall Calf Stretch', 'a wall', 'side view', 'standing facing a wall, hands on the wall at shoulder height, feet together a step from the wall', 'the right leg stepped back and straight with the heel flat on the floor, the left knee bent, leaning into the wall', 'calves'],
    ['Stretch pettorali al muro', 'Stretch pettorali al muro', 'Wall Pec Stretch', 'a wall', 'front view', 'standing sideways next to a wall, the forearm on the wall with the elbow bent at 90 degrees at shoulder height', 'the torso rotated away from the wall, chest open, the forearm still on the wall', 'chest, front shoulder'],
    ['Cerchi controllati della spalla', 'Cerchi controllati della spalla', 'Shoulder CARs', 'none', 'front view', 'standing tall, the right arm hanging along the body, the left hand on the hip', 'the right arm raised overhead, straight, tracing a large slow circle, a circular arrow around the shoulder', 'shoulder'],
    ['Cerchi controllati dell anca', 'Cerchi controllati dell’anca', 'Hip CARs', MAT, 'side view', 'on all fours, the right knee under the hip', 'the right knee lifted and drawn out to the side in a big circle, a circular arrow around the hip', 'hip, glutes'],
    ['Stretch quadricipite in piedi', 'Stretch quadricipite in piedi', 'Standing Quad Stretch', 'none', 'side view', 'standing on the left leg, the right leg relaxed, one hand free', 'the right heel pulled to the glute held with the right hand, knees together, pelvis pushed slightly forward, torso tall', 'front thigh'],
    ['Torsione supina', 'Torsione supina', 'Supine Spinal Twist', MAT, 'front view from above-side', 'lying on the back, arms out to the sides in a T, knees bent and together lifted over the hips', 'both knees dropped to the right side on the mat, both shoulders flat, head turned to the left', 'spine rotators, glutes'],
    ['Stretch dorsali in ginocchio', 'Stretch dorsali in ginocchio', 'Kneeling Lat Stretch', 'a bench', 'side view', 'kneeling in front of a bench, hands resting on the bench, torso upright', 'hips pushed back, chest dropping between the arms, arms stretched forward on the bench, head between the arms', 'lats, shoulders'],
    ['Stretch a farfalla', 'Stretch a farfalla', 'Butterfly Stretch', MAT, 'front view', 'sitting tall, the soles of the feet together, knees out to the sides', 'folded forward over the feet, back long, knees dropping towards the mat', 'adductors, hips'],
    ['Stretch laterale del collo', 'Stretch laterale del collo', 'Lateral Neck Stretch', 'none', 'front view', 'sitting tall with the head neutral, shoulders relaxed', 'the head tilted to the right ear towards the right shoulder, the right hand resting lightly on the head, the left shoulder down', 'side of the neck'],
    ['Scivolamenti al muro', 'Scivolamenti al muro', 'Wall Slides', 'a wall', 'side view', 'standing with the back and the head against the wall, forearms against the wall with the elbows bent at 90 degrees', 'the arms slid up overhead keeping forearms and hands in contact with the wall, back still against the wall', 'shoulders, upper back'],
    ['Estensione toracica a terra', 'Estensione toracica a terra', 'Thoracic Extension Stretch', 'a bench', 'side view', 'kneeling in front of a bench with the elbows on it, hands behind the head, spine neutral', 'the chest dropped towards the floor, the upper back arched, elbows still on the bench, hips over the knees', 'upper back, lats'],
    ['Jefferson curl a corpo libero', 'Jefferson curl a corpo libero', 'Bodyweight Jefferson Curl', 'none', 'side view', 'standing tall, feet hip-width, arms overhead', 'rolled down one vertebra at a time with straight knees, the arms hanging towards the floor, back fully rounded', 'spine, hamstrings']
  ] },
  { title: 'Allenarsi a casa: corpo libero e elastici', items: [
    ['Push-up inclinato', 'Push-up inclinato', 'Incline Push-Up', 'a bench', 'side view', 'hands on the edge of a bench, arms straight, body in one line from head to heels, feet on the floor', 'chest lowered to the bench, elbows at 45 degrees, body still in a straight line', 'chest, triceps, shoulders'],
    ['Handstand push-up al muro', 'Handstand push-up al muro', 'Wall Handstand Push-Up', 'a wall', 'side view', 'handstand with the heels against the wall, arms straight, body in a straight vertical line', 'head lowered to a fist from the floor, elbows bent at 45 degrees, heels against the wall', 'shoulders, triceps'],
    ['Dip su sedia', 'Dip su sedia', 'Chair Dip', 'a sturdy chair', 'side view', 'hands on the edge of a chair behind the body, arms straight, legs extended with the heels on the floor, hips off the chair', 'elbows bent to 90 degrees, hips lowered close to the chair, shoulders away from the ears', 'triceps, chest, front shoulders'],
    ['Dead hang', 'Dead hang', 'Dead Hang', 'a pull-up bar', 'front view', 'hanging from the bar with straight arms, shoulders relaxed up by the ears (passive hang)', 'hanging from the bar with straight arms, shoulders pulled down and back (active hang), chest slightly out', 'lats, forearms, shoulder stabilisers'],
    ['Trazioni negative', 'Trazioni negative', 'Negative Pull-Up', 'a pull-up bar', 'front view', 'chin above the bar, arms bent (top position)', 'arms fully extended hanging from the bar after the slow lowering, a downward arrow', 'lats, biceps'],
    ['Reverse snow angel', 'Reverse snow angel', 'Reverse Snow Angel', MAT, 'side view', 'lying face down, arms along the body lifted slightly off the mat, palms facing down, forehead off the mat', 'lying face down, the arms swept in an arc overhead and lifted, thumbs up, chest lifted', 'upper back, rear shoulders'],
    ['Affondi a corpo libero', 'Affondi a corpo libero', 'Bodyweight Reverse Lunge', 'none', 'side view', 'standing tall, feet together, hands on the hips', 'reverse lunge: the right leg stepped back, the back knee a fist from the floor, front knee at 90 degrees, torso upright', 'quads, glutes'],
    ['L-sit raccolto', 'L-sit raccolto', 'Tuck L-Sit', 'two parallettes or two blocks', 'side view', 'sitting with straight arms pressing on two blocks beside the hips, legs on the floor', 'body lifted off the floor on the straight arms, knees tucked to the chest, shoulders pushed down', 'abdominals, hip flexors, triceps'],
    ['Arch hold', 'Arch hold', 'Superman Arch Hold', MAT, 'side view', 'lying face down, arms along the body palms up, legs together on the mat', 'chest and straight legs lifted off the mat at the same time, arms lifted along the body, neck neutral', 'lower back, glutes'],
    ['Superman', 'Superman', 'Superman', MAT, 'side view', 'lying face down, arms stretched forward, legs straight', 'arms and legs lifted off the mat at the same time, arms reaching forward, looking at the floor', 'lower back, glutes, rear shoulders'],
    ['Inverted row facilitato', 'Inverted row facilitato', 'Easier Inverted Row', 'a sturdy table or a low bar', 'side view', 'lying under a low bar (or table edge), knees bent with the feet flat on the floor, arms straight holding the bar, hips lifted', 'chest pulled up to the bar, elbows bent, body still in a line from shoulders to knees', 'lats, rhomboids, biceps'],
    ['Wall sit', 'Wall sit', 'Wall Sit', 'a wall', 'side view', 'standing with the back against the wall, feet a step in front, arms along the body', 'sitting against the wall with the thighs parallel to the floor and the knees at 90 degrees, back flat on the wall, arms crossed or hanging', 'quads, glutes'],
    ['Calf raise a corpo libero', 'Calf raise a corpo libero', 'Bodyweight Calf Raise', 'a step', 'side view', 'standing on the edge of a step on the balls of the feet, heels lowered below the step, hands on a wall for balance', 'heels lifted as high as possible, on the toes, legs straight', 'calves'],
    ['Affondi saltati', 'Affondi saltati', 'Jumping Lunge', 'none', 'side view', 'in a lunge, the right leg forward, the left knee near the floor', 'in mid-air switching legs: the legs crossing in the air, arms driving, a vertical arrow', 'quads, glutes, calves'],
    ['Plank jack', 'Plank jack', 'Plank Jack', MAT, 'front view slightly from the side', 'high plank with the feet together, arms straight', 'high plank with the feet jumped wide apart, body and arms unchanged', 'abdominals, shoulders, adductors'],
    ['Bear crawl', 'Bear crawl', 'Bear Crawl', 'none', 'side view', 'on hands and toes with the knees bent and lifted just off the floor, back flat', 'moving forward: the right hand and the left foot advanced at the same time, knees still hovering off the floor, a forward arrow', 'shoulders, abdominals, quads'],
    ['Squat con elastico', 'Squat con elastico', 'Banded Squat', 'a loop resistance band above the knees', 'front view', 'standing with the feet shoulder-width, a resistance band around the legs just above the knees, arms in front', 'the squat at parallel with the knees pushed out against the band, torso upright', 'quads, glutes'],
    ['Chest press elastico', 'Chest press elastico', 'Band Chest Press', 'a long resistance band around the back', 'side view', 'standing in a split stance, the band around the upper back with the handles in the hands at the chest, elbows bent', 'the arms pressed forward until straight at chest height against the band', 'chest, triceps, front shoulders'],
    ['Pull-apart elastico', 'Pull-apart elastico', 'Band Pull-Apart', 'a resistance band', 'front view', 'standing, arms straight in front at shoulder height holding the band with the hands shoulder-width apart', 'the arms pulled apart to the sides until in a T, the band stretched across the chest, shoulder blades squeezed', 'rear shoulders, upper back']
  ] },
  { title: 'Nuovi dal PDF Booty By Bret: glutei', items: [
    ['Hip thrust manubrio', 'Hip thrust manubrio', 'Dumbbell Hip Thrust', 'a flat bench and one dumbbell', 'side view', 'the upper back resting on the edge of the bench, knees bent with the feet flat, one dumbbell on the hips held with both hands, hips lowered close to the floor', 'hips thrust up until the torso and thighs are parallel to the floor, shins vertical, chin tucked, dumbbell on the hips', 'glutes, hamstrings'],
    ['Hip thrust piedi rialzati', 'Hip thrust piedi rialzati', 'Feet-Elevated Hip Thrust', 'a flat bench, a low box and a barbell', 'side view', 'the upper back on the bench, the feet on a low box in front, a barbell over the hips, hips lowered', 'hips thrust up to a flat torso, shins about vertical, barbell on the hips', 'glutes, hamstrings'],
    ['B-stance hip thrust', 'B-stance hip thrust', 'B-Stance Hip Thrust', 'a flat bench and one dumbbell', 'side view', 'the upper back on the bench, the RIGHT foot flat as the working foot and the LEFT foot a step behind it touching the floor only with the toes, a dumbbell on the hips, hips lowered', 'hips thrust up to a flat torso, the work done by the right leg, the left foot only touching with the toes', 'glutes (working side), hamstrings'],
    ['Hip thrust con elastico', 'Hip thrust con elastico', 'Banded Hip Thrust', 'a flat bench, a barbell and a loop band above the knees', 'side view and slightly from the front', 'the upper back on the bench, a loop band around the legs just above the knees, a barbell over the hips, hips lowered', 'hips thrust up to a flat torso with the knees pushed out against the band', 'glutes, outer hips'],
    ['Glute bridge con elastico', 'Glute bridge con elastico', 'Banded Glute Bridge', MAT, 'side view', 'lying on the back, knees bent, a loop band around the legs just above the knees, feet flat, hips on the mat', 'hips lifted into a bridge with the knees pushed apart against the band', 'glutes, outer hips'],
    ['Glute bridge bilanciere', 'Glute bridge bilanciere', 'Barbell Glute Bridge', 'a barbell with plates over the hips', 'side view', 'lying on the back on the floor, knees bent, a barbell over the hips held with both hands, hips on the floor', 'hips lifted into a bridge with the barbell on the hips, shoulders on the floor', 'glutes, hamstrings'],
    ['Glute bridge manubrio', 'Glute bridge manubrio', 'Dumbbell Glute Bridge', 'one dumbbell', 'side view', 'lying on the back on the mat, knees bent, a dumbbell on the hips held with both hands, hips down', 'hips lifted into a bridge with the dumbbell on the hips', 'glutes, hamstrings'],
    ['Glute bridge piedi rialzati', 'Glute bridge piedi rialzati', 'Feet-Elevated Glute Bridge', 'a bench or box for the feet', 'side view', 'lying on the back, the feet on a bench, knees bent, hips on the mat, arms along the body', 'hips lifted high into a bridge with the feet still on the bench', 'glutes, hamstrings'],
    ['Reverse hyper', 'Reverse hyper', 'Reverse Hyperextension', 'a reverse hyperextension machine with a padded platform', 'side view', 'lying face down on the padded platform with the hips at the edge, the legs hanging down under the platform, hands holding the handles', 'the legs swung up and back until in line with the torso, legs straight, glutes squeezed', 'glutes, hamstrings, lower back'],
    ['Reverse hyper su panca', 'Reverse hyper su panca', 'Bench Reverse Hyperextension', 'a flat bench', 'side view', 'lying face down on a bench with the hips at the end edge, hands holding the bench, the legs hanging down', 'the legs raised straight until in line with the torso, glutes squeezed', 'glutes, hamstrings, lower back'],
    ['Iperestensione 45 glutei', 'Iperestensione 45° glutei', 'Glute-Focus 45-Degree Back Extension', 'a 45-degree hyperextension bench', 'side view', 'on the 45-degree bench, hips on the pad, feet locked under the rollers, torso hanging down with a rounded upper back, arms crossed on the chest', 'torso raised until in line with the legs, hips fully extended, the upper back staying rounded', 'glutes, hamstrings'],
    ['Kickback cavo in ginocchio', 'Kickback cavo in ginocchio', 'Kneeling Cable Glute Kickback', 'a low cable pulley with an ankle strap', 'side view', 'on all fours on the mat facing the cable machine, the ankle strap on the right ankle, the right knee bent under the hip', 'the right leg kicked straight back and up in line with the torso, back flat, cable taut', 'glutes'],
    ['Donkey kick', 'Donkey kick', 'Donkey Kick', MAT, 'side view', 'on all fours, the right knee bent at 90 degrees under the hip, back flat', 'the right knee still bent at 90 degrees, the thigh lifted until the sole of the foot points to the ceiling, hips level', 'glutes'],
    ['Fire hydrant', 'Fire hydrant', 'Fire Hydrant', MAT, 'rear view from slightly above', 'on all fours, knees under the hips, back flat', 'the right knee bent at 90 degrees lifted out to the side to hip height, hips level', 'glutes (outer hip)'],
    ['Clam shell', 'Clam shell', 'Side-Lying Clam', MAT, 'front view', 'lying on the left side, head on the lower arm, hips and knees bent, the feet together and the knees together', 'the feet staying together while the top knee opens up like a shell, hips not rolling back', 'glutes (outer hip)'],
    ['Abduzione sdraiata sul fianco', 'Abduzione sdraiata sul fianco', 'Side-Lying Hip Abduction', MAT, 'front view', 'lying on the left side, legs straight and stacked, head on the lower arm', 'the top leg lifted straight to about 45 degrees with the toes pointing forward, torso still', 'glutes (outer hip)'],
    ['Abduzione in piedi con elastico', 'Abduzione in piedi con elastico', 'Standing Band Hip Abduction', 'a loop band around the ankles', 'front view', 'standing tall with a loop band around the ankles, feet together, hands on the hips or a support', 'the right leg lifted out to the side against the band, straight, torso upright', 'glutes (outer hip)'],
    ['Abduzione ai cavi in piedi', 'Abduzione ai cavi in piedi', 'Standing Cable Hip Abduction', 'a low cable pulley with an ankle strap', 'front view', 'standing sideways to the cable machine, the ankle strap on the outer ankle, the cable crossing in front of the body, holding the machine for support', 'the outer leg lifted out to the side, straight, against the cable, torso upright', 'glutes (outer hip)'],
    ['Abduzione seduta con elastico', 'Abduzione seduta con elastico', 'Seated Band Hip Abduction', 'a loop band above the knees and a bench', 'front view', 'sitting on a bench, a loop band above the knees, the knees together, torso leaning slightly forward', 'the knees pushed apart against the band, the feet in place', 'glutes (outer hip)'],
    ['Lateral band walk', 'Lateral band walk', 'Lateral Band Walk', 'a loop band above the knees', 'front view', 'half squat with a loop band above the knees, the feet shoulder-width, hands in front', 'a wide step to the right, the band taut, still in the half squat, the weight on the left leg', 'glutes (outer hip)'],
    ['Monster walk', 'Monster walk', 'Monster Walk', 'a loop band above the knees', 'front view', 'half squat with a loop band above the knees, the feet shoulder-width, arms in front', 'a diagonal step forward and out with the right foot, the band taut, torso upright', 'glutes (outer hip)'],
    ['Hip hike', 'Hip hike', 'Hip Hike', 'a step or a low box', 'rear view', 'standing on the edge of a step on the left leg, the right leg hanging down beside the step, pelvis level, a hand on a wall', 'the pelvis dropped on the right side (the right foot lowered below the step) then ready to hike up: the hips clearly tilted with the right side lower than the left', 'glutes (outer hip), obliques']
  ] },
  { title: 'Nuovi dal PDF Booty By Bret: gambe, femorali, core', items: [
    ['Sumo squat', 'Sumo squat', 'Dumbbell Sumo Squat', 'one dumbbell', 'front view', 'standing with the feet very wide and the toes turned out, one dumbbell held in both hands hanging in front, torso upright', 'the deep sumo squat, thighs parallel or lower, knees over the toes, dumbbell between the legs, torso upright', 'inner thighs, glutes, quads'],
    ['Front squat manubri', 'Front squat manubri', 'Dumbbell Front Squat', 'two dumbbells', 'side view', 'standing with the feet shoulder-width, two dumbbells resting on the front shoulders with the elbows up', 'the squat at parallel, torso upright, elbows high, dumbbells on the shoulders', 'quads, glutes'],
    ['Curtsy lunge', 'Curtsy lunge', 'Curtsy Lunge', 'two dumbbells at the sides', 'front view', 'standing tall with the feet together, a dumbbell in each hand', 'the right leg crossed behind the left in a curtsy, both knees bent, the back knee close to the floor, torso upright', 'glutes, quads, adductors'],
    ['Lateral lunge', 'Lateral lunge', 'Lateral Lunge', 'one dumbbell at the chest', 'front view', 'standing tall with the feet together, a dumbbell held at the chest', 'a wide step to the right, the right knee bent and the hips back, the left leg straight, both feet flat, torso leaning slightly forward', 'glutes, quads, adductors'],
    ['Affondi bilanciere', 'Affondi bilanciere', 'Barbell Lunge', 'a barbell across the upper back', 'side view', 'standing tall with a barbell on the upper back, feet together', 'reverse lunge: the right leg stepped back, the back knee a fist from the floor, front knee at 90 degrees, barbell stable', 'quads, glutes'],
    ['High step-up', 'High step-up', 'High Step-Up', 'a high box and two dumbbells', 'side view', 'standing in front of a high box (knee-height or higher) with the right foot on it, a dumbbell in each hand', 'standing tall on the box on the right leg with the left knee lifted, the dumbbells hanging', 'glutes, quads'],
    ['Skater squat', 'Skater squat', 'Skater Squat', 'none', 'side view', 'standing on the left leg with the right knee bent and the right foot behind, arms in front for balance', 'the left leg bent in a deep single-leg squat, the right knee a fist from the floor behind, torso leaning forward, arms forward', 'quads, glutes'],
    ['Single-leg box squat', 'Single-leg box squat', 'Single-Leg Box Squat', 'a box', 'side view', 'standing in front of a box on the left leg, the right leg extended forward, arms forward', 'sitting down on the box on one leg with the right leg straight out in front, torso leaning forward, arms forward', 'quads, glutes'],
    ['Stacco rumeno manubri', 'Stacco rumeno manubri', 'Dumbbell Romanian Deadlift', 'two dumbbells', 'side view', 'standing tall with a dumbbell in each hand in front of the thighs, knees slightly bent', 'the hips pushed back, torso inclined to about parallel, back flat, the dumbbells sliding down the legs to mid-shin', 'hamstrings, glutes, lower back'],
    ['B-stance RDL', 'B-stance RDL', 'B-Stance Romanian Deadlift', 'two dumbbells', 'side view', 'standing with the right foot flat as the working leg and the left foot a step behind touching only with the toes, a dumbbell in each hand in front of the thighs', 'the hips pushed back and the torso inclined to about parallel on the right leg, the left toes only touching, dumbbells to mid-shin', 'hamstrings, glutes (working side)'],
    ['Leg curl con slider', 'Leg curl con slider', 'Slider Leg Curl', 'a towel or two sliders under the heels', 'side view', 'lying on the back, the heels on towels on a smooth floor, legs straight, hips lifted in a bridge', 'the heels slid in towards the glutes with the knees bent, hips still lifted in the bridge', 'hamstrings, glutes'],
    ['Leg curl con fitball', 'Leg curl con fitball', 'Stability Ball Leg Curl', 'a stability ball', 'side view', 'lying on the back, the heels on a stability ball, legs straight, hips lifted in a bridge', 'the ball rolled in towards the glutes with the knees bent, hips still lifted in the bridge', 'hamstrings, glutes'],
    ['Leg curl manubrio', 'Leg curl manubrio', 'Dumbbell Lying Leg Curl', 'a flat bench and one dumbbell', 'side view', 'lying face down on a bench, a dumbbell held between the feet, legs straight', 'the knees bent to 90 degrees or more bringing the dumbbell up towards the glutes, hips on the bench', 'hamstrings'],
    ['RKC plank', 'RKC plank', 'RKC Plank', MAT, 'side view', 'a forearm plank with the elbows under the shoulders, body in one line from head to heels', 'the same plank with maximal full-body tension: fists clenched, glutes and thighs squeezed, pelvis slightly tucked, a small tension arrow pointing forward at the elbows and one pointing back at the feet', 'abdominals, glutes, thighs']
  ] }
];

export const MASTER_PROMPT = `You are an illustrator for a fitness app. Each message I send describes ONE exercise. You answer with ONE image and nothing else (no text, no questions: if something is ambiguous, choose the most standard version of the exercise).

THE IMAGE
- One single image, 1536 x 1024 pixels (landscape 3:2), pure white background.
- EXACTLY TWO PANELS side by side, separated by a thin vertical black line.
- At the top of each panel a rounded black label bar with white bold capital letters: the left one says "START", the right one says "END". These are the ONLY words in the image. No title, no numbers, no captions, no extra panels, no grid, no steps, no watermark, no logo.
- The same figure, the same size and the same camera angle in both panels, centred, filling about 70% of the panel width. The two poses must be clearly DIFFERENT: START is the starting position, END is the end of the movement (or the other side/limb when the movement alternates).
- In the END panel only: one or two simple dark-grey curved arrows showing the direction of the movement. No text on the arrows.

THE FIGURE (never change it)
- A realistic 3D anatomical mannequin, adult male athletic build, completely BALD, smooth light-grey skin, no hair, no beard, neutral calm face.
- Black athletic shorts, black running shoes with white soles. Never barefoot, never other colours, no logos, no tops.
- The muscles that do the work are highlighted in translucent RED (soft gradient); every other muscle stays grey. The muscles to highlight are listed in each description.
- Exercises on the floor are done on a dark-grey rectangular exercise mat. Any other equipment named in the description is drawn realistically in black or dark grey. If the description says "none", draw no equipment and no floor.
- Soft light, a faint contact shadow on the floor, high detail, sharp, photo-real 3D render. No illustration style, no cartoon, no line art.

COMMON MISTAKES TO AVOID
- Never more than two panels. Never a numbered sequence. Never the same pose in START and END.
- Never a second person. Never hair, beard or skin colours other than light grey. Never bare feet.
- Never anything cut off: the whole body and the whole equipment must be inside each panel.
- Do the movement exactly as described, with the correct left/right and the correct equipment. If the description says "legs switched", the START and END legs are the opposite ones.

When I send "EXERCISE: ...", draw exactly that. Answer with the image only.`;

function render() {
  const lines = [];
  lines.push('# Prompt per generare le immagini degli esercizi');
  lines.push('');
  lines.push('Generato da `node tools/media_prompts.mjs` — non modificare a mano, modifica `tools/media_prompts.mjs` e rilancialo.');
  lines.push('');
  lines.push('## Come si usa (3 passi)');
  lines.push('');
  lines.push('1. **Apri una chat nuova** con il generatore di immagini e incolla **una volta sola** il «Prompt principale» qui sotto. Se la chat diventa lunga o l\'immagine comincia a sbagliare stile, apri una chat nuova e incollalo di nuovo.');
  lines.push('2. Per ogni esercizio incolla **un solo blocco «EXERCISE: …»** della lista (uno per messaggio, mai due insieme). Salva l\'immagine con **esattamente** il nome indicato in «File» (con `.png`).');
  lines.push('3. Metti i file in `media-source/_nuove` e scrivimi «importa le immagini»: le controllo una per una (due pannelli, pose diverse, esercizio giusto), le scarto con il motivo se serve, e le metto direttamente nell\'app (`node tools/import_media_local.mjs --apply`, niente cloud). Le vedi dopo la prossima build.');
  lines.push('');
  lines.push('Controllo veloce prima di salvare un\'immagine: **(a)** due soli pannelli START / END; **(b)** le due pose sono diverse; **(c)** un solo manichino per pannello, pelato, grigio, scarpe nere; **(d)** muscoli rossi solo dove lavorano; **(e)** niente testo oltre a START / END; **(f)** tutto il corpo e l\'attrezzo dentro il pannello. Se manca anche solo una di queste, rigenera: non correggere a mano.');
  lines.push('');
  lines.push('## Prompt principale (da incollare una volta)');
  lines.push('');
  lines.push('```');
  lines.push(MASTER_PROMPT);
  lines.push('```');
  lines.push('');
  let n = 0;
  for (const sec of SECTIONS) {
    lines.push('## ' + sec.title + ' (' + sec.items.length + ')');
    lines.push('');
    for (const [file, name, en, equip, view, start, end, red] of sec.items) {
      n += 1;
      lines.push('### ' + n + '. ' + name);
      lines.push('File: `' + file + '.png`');
      lines.push('');
      lines.push('```');
      lines.push('EXERCISE: ' + en);
      lines.push('Equipment: ' + equip);
      lines.push('Camera: ' + view);
      lines.push('START panel: ' + start);
      lines.push('END panel: ' + end);
      lines.push('Muscles in red: ' + red);
      lines.push('```');
      lines.push('');
    }
  }
  return lines.join('\n');
}

function loadMissing() {
  const ctx = { self: null }; ctx.self = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'web/exercise-catalog-extra.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'web/exercise-taxonomy.js'), 'utf8'), ctx);
  const idx = JSON.parse(fs.readFileSync(path.join(root, 'web/media/index.json'), 'utf8'));
  const links = ctx.WEB_EXERCISE_NAME_LINKS || {};
  const same = (ctx.NURVAN_EXERCISE_TAXONOMY && ctx.NURVAN_EXERCISE_TAXONOMY.SAME_AS) || {};
  const has = (id) => idx['exercise:' + id] && idx['exercise:' + id].hasMedia;
  const covered = (name) => {
    if (has(canonicalExerciseId(name))) return true;
    for (const [k, v] of Object.entries(links)) if (v === name && has(k)) return true;
    for (const [k, v] of Object.entries(same)) if (v === name && has(canonicalExerciseId(k))) return true;
    return false;
  };
  return ctx.WEB_EXERCISE_CATALOG.filter((e) => !covered(e.name)).map((e) => e.name);
}

const listed = SECTIONS.flatMap((s) => s.items);
const problems = [];
for (const [file, name] of listed) {
  if (canonicalExerciseId(file) !== canonicalExerciseId(name)) problems.push('the file name "' + file + '" does not derive to the id of "' + name + '"');
  if (!/^[A-Za-z0-9 \-]+$/.test(file)) problems.push('file name with characters that a generator may mangle: ' + file);
}
const missing = loadMissing();
const listedNames = new Set(listed.map((x) => x[1]));
missing.filter((n) => !listedNames.has(n)).forEach((n) => problems.push('no picture and not in the list: ' + n));
listed.filter((x) => !missing.includes(x[1])).forEach((x) => problems.push('already has a picture, remove from the list: ' + x[1]));

if (process.argv.includes('--check')) {
  if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
  console.log('The list of pictures to make matches the library: ' + listed.length + ' exercises.');
} else {
  if (problems.length) console.log('WARNING:\n' + problems.join('\n') + '\n');
  fs.writeFileSync(path.join(root, 'docs/PROMPT_IMMAGINI_ESERCIZI.md'), render() + '\n');
  console.log('docs/PROMPT_IMMAGINI_ESERCIZI.md written: ' + listed.length + ' exercises.');
}
