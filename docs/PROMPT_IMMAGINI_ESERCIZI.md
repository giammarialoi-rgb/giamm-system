# Prompt per generare le immagini degli esercizi

Generato da `node tools/media_prompts.mjs` — non modificare a mano, modifica `tools/media_prompts.mjs` e rilancialo.

## Come si usa

**Perché il metodo precedente sbagliava:** senza immagini di riferimento il generatore inventa il layout (formato verticale, figure piccole, barre START/END minuscole). Con 3 immagini di riferimento allegate nello stesso messaggio del prompt principale copia il layout esatto e cambia solo la posa.

1. Apri una **chat nuova**. Allega le 3 immagini della cartella `media-source/_riferimenti/` (sono immagini già approvate e importate nell’app) e, **nello stesso messaggio**, incolla il «Prompt principale» qui sotto. Aspetta la risposta «OK».
2. Poi **un messaggio per esercizio**: incolla un solo blocco «EXERCISE: …» (non due insieme). Salva l’immagine con **esattamente** il nome indicato in «File» (con `.png`).
3. Se l’immagine è quasi giusta, non rigenerare da zero: scrivi `FIX: …` con una sola correzione (esempi sotto). Se dopo 2 correzioni è ancora sbagliata, apri una chat nuova (con le 3 immagini) e riparti.
4. Chat lunga = deriva dello stile: **ogni 15-20 immagini apri una chat nuova** e riallega le 3 immagini con il prompt principale.
5. Metti i file in `media-source/_nuove` e scrivimi «importa le immagini»: le controllo una per una, scarto con il motivo quelle sbagliate, e importo le buone direttamente nell’app (`node tools/import_media_local.mjs --apply`, niente cloud). Le vedi dopo la prossima build.

**Controllo prima di salvare:** (a) formato orizzontale, due soli pannelli START / END con barre nere larghe; (b) le due pose sono diverse; (c) un solo manichino per pannello, grande, pelato, grigio, scarpe nere; (d) muscoli rossi solo dove lavorano; (e) nessun altro testo; (f) corpo e attrezzo interi dentro il pannello. Se manca anche una sola di queste, correggi con FIX o rigenera.

## Correzioni rapide (da incollare dopo l’immagine sbagliata)

- Formato: `FIX: make it a wide landscape 3:2 image like the references, two tall panels side by side, same layout as the references.`
- Figura piccola: `FIX: same image but the mannequin must be much bigger: the whole body spans at least 80% of the panel width, like in the references.`
- Barre: `FIX: the START and END label bars must span almost the full panel width and be centred, like in the references.`
- Pose uguali: `FIX: START and END are too similar. END must clearly show: <descrizione dell’END del blocco>.`
- Lato/arto sbagliato: `FIX: in the END panel the legs (or arms) must be the opposite ones of the START panel.`
- Piedi nudi / capelli / altro colore: `FIX: bald, light-grey skin, black running shoes with white soles, like the references.`
- Testo in più: `FIX: remove every text except the words START and END.`

## Prompt principale (allegando le 3 immagini di riferimento)

```
I am attaching 3 REFERENCE IMAGES. They are the approved style of my fitness app. From now on every image you make must look like them: same layout, same mannequin, same label bars, same mat, same colours, same size of the figure. Only the exercise changes.

WHAT TO COPY FROM THE REFERENCES (do not change anything of this)
1. CANVAS: one WIDE LANDSCAPE image, 3:2 (1536 x 1024), wider than tall, white background. Never portrait, never square.
2. TWO PANELS side by side, each one a tall rectangle filling half the canvas, divided by one thin vertical black line.
3. LABEL BARS: at the very top of each panel a black rounded bar that spans almost the full width of the panel, with the word START (left panel) or END (right panel) in big white bold capitals centred in it. No other text anywhere.
4. FIGURE: the same realistic 3D anatomical mannequin as in the references: adult male athletic build, completely BALD, smooth light-grey skin, black shorts, black running shoes with white soles (never barefoot). It is BIG: the whole body spans at least 80% of the width of its panel, centred, with white space only above and below it. Same size and same camera angle in both panels.
5. MUSCLES: only the muscles that work are translucent RED with a soft gradient; all other muscles stay grey.
6. FLOOR: exercises on the floor stand on the same dark-grey rectangular mat as in the references, long enough to hold the whole body. Standing exercises have no mat. Equipment is drawn realistically in black or dark grey.
7. ARROWS: in the END panel only, one or two plain dark-grey curved arrows for the direction of the movement.
8. PHOTO-REAL 3D RENDER like the references: soft light, faint contact shadow, sharp. No cartoon, no line art, no flat colours.

THE TWO POSES
- START = the starting position. END = the end of the movement. They must be clearly DIFFERENT. When the movement alternates sides or limbs, END shows the OTHER side / the switched limbs.
- The whole body and all the equipment must be fully inside the panel, nothing cut off.

NEVER
- more than 2 panels, numbered steps, a title, captions, a grid, watermarks, extra text;
- a second person, hair, beard, other skin colours, bare feet, tops or logos;
- a portrait or square image; a figure smaller than described; label bars that are small or not centred.

HOW WE WORK
I will send messages that start with "EXERCISE:". Answer each one with ONE image only, no text, no questions. If something is ambiguous, choose the most standard version of the exercise. If I answer "FIX: ..." change only what I say and keep everything else identical.
Reply "OK" now if you have understood; then wait for the first EXERCISE.
```

## Pilates (da rifare in due pannelli) e due esercizi con attrezzo (21)

### 1. Roll over
File: `Roll over.png`

```
EXERCISE: Pilates Roll Over (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: lying flat on the back, arms along the body palms down, legs straight together on the mat
END panel: the PLOUGH position: the hips lifted high and the straight legs carried back over the head, the body folded in half with the torso almost vertical resting on the shoulders and upper back (not the neck), the toes reaching towards the mat BEHIND the head, the arms pressing flat on the mat along the body
Muscles in red: abdominals, hip flexors, lower back
```

### 2. Single leg stretch
File: `Single leg stretch.png`

```
EXERCISE: Pilates Single Leg Stretch (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: lying on the back, head and shoulders curled off the mat, RIGHT knee pulled to the chest with both hands holding the right shin, LEFT leg stretched straight out at about 45 degrees above the mat
END panel: the legs SWITCHED: LEFT knee pulled to the chest with both hands on the left shin, RIGHT leg stretched straight out at 45 degrees. Head and shoulders stay curled up
Muscles in red: abdominals, hip flexors
```

### 3. Scissors
File: `Scissors.png`

```
EXERCISE: Pilates Single Straight Leg Stretch (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: lying on the back, head and shoulders curled up, both legs straight: the RIGHT leg pointing up towards the ceiling with both hands holding behind the right calf, the LEFT leg lowered straight out at about 30 degrees above the mat
END panel: the legs SWITCHED: LEFT leg straight up with both hands holding behind the left calf, RIGHT leg lowered straight at 30 degrees. Head and shoulders stay curled up
Muscles in red: abdominals, hip flexors, hamstrings
```

### 4. Neck pull
File: `Neck pull.png`

```
EXERCISE: Pilates Neck Pull (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: lying flat on the back, legs straight together, hands interlaced behind the head, elbows wide
END panel: sitting upright then folded forward over the straight legs, spine rounded in a C-curve, hands still interlaced behind the head, elbows wide, head down towards the knees
Muscles in red: abdominals, lower back
```

### 5. Jackknife
File: `Jackknife.png`

```
EXERCISE: Pilates Jackknife (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: lying flat on the back, legs straight together lifted vertical towards the ceiling, arms along the body pressing on the mat
END panel: hips and legs pushed up in one vertical straight line towards the ceiling (like a shoulder stand), weight on the shoulder blades, arms pressing on the mat, feet pointing up
Muscles in red: abdominals, glutes, hip flexors
```

### 6. Shoulder bridge
File: `Shoulder bridge.png`

```
EXERCISE: Pilates Shoulder Bridge (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: lying on the back, knees bent, both feet flat on the mat, arms along the body
END panel: hips lifted high in a bridge (shoulders, hips and knee in a straight line), the RIGHT leg extended straight up towards the ceiling, left foot flat on the mat, arms pressing on the mat
Muscles in red: glutes, hamstrings, abdominals
```

### 7. Spine twist
File: `Spine twist.png`

```
EXERCISE: Pilates Spine Twist (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: front view, slightly from the side
START panel: sitting tall on the mat, legs straight together, arms stretched out to the sides at shoulder height, torso facing forward
END panel: torso rotated about 60 degrees to the right, arms still at shoulder height and level, head following the rotation, legs and hips still
Muscles in red: obliques, abdominals
```

### 8. Side kick series
File: `Side kick series.png`

```
EXERCISE: Pilates Side Kick Series (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: lying on the left side, head resting on the lower hand, legs stacked and slightly forward, the top (right) leg lifted straight to hip height and held there
END panel: the same position, the top leg swung forward in a front kick, straight, foot flexed, at hip height, torso still
Muscles in red: glutes (outer hip), hip flexors, obliques
```

### 9. Teaser
File: `Teaser.png`

```
EXERCISE: Pilates Teaser (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: lying flat on the back, legs straight together, arms stretched overhead along the ears
END panel: balancing on the sitting bones in a V: torso and straight legs both lifted, arms reaching forward parallel to the legs towards the toes
Muscles in red: abdominals, hip flexors
```

### 10. Hip circles
File: `Hip circles.png`

```
EXERCISE: Pilates Hip Circles (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view from the front-left
START panel: sitting leaning back on straight arms (hands on the mat behind the hips), legs together lifted straight in front at about 45 degrees
END panel: the same position with the legs together swung to the right side of the body, still lifted, one curved circular arrow showing the legs drawing a big circle
Muscles in red: abdominals, hip flexors, obliques
```

### 11. Swimming
File: `Swimming.png`

```
EXERCISE: Pilates Swimming (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: lying face down, arms stretched forward, legs straight, resting on the mat
END panel: face down with the RIGHT arm and the LEFT leg lifted off the mat at the same time, chest slightly lifted, the other arm and leg staying low
Muscles in red: lower back, glutes, shoulders
```

### 12. Leg pull front
File: `Leg pull front.png`

```
EXERCISE: Pilates Leg Pull Front (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: high plank: hands under the shoulders, arms straight, body in one straight line from head to heels
END panel: high plank with the RIGHT leg lifted straight behind to hip height, heel up, body still in a straight line, hips level
Muscles in red: abdominals, shoulders, glutes
```

### 13. Leg pull back
File: `Leg pull back.png`

```
EXERCISE: Pilates Leg Pull (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: reverse plank: sitting with hands on the mat behind the hips, arms straight, hips lifted so the body is a straight line facing up, feet on the mat
END panel: reverse plank with the RIGHT leg lifted straight up towards the ceiling, foot pointed, hips high and level
Muscles in red: glutes, hamstrings, abdominals, triceps
```

### 14. Kneeling side kick
File: `Kneeling side kick.png`

```
EXERCISE: Pilates Kneeling Side Kick (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: front view
START panel: kneeling on the left knee with the left hand flat on the mat, the right hand behind the head, the right leg stretched out to the right side at hip height
END panel: the right leg kicked forward in front of the body, still at hip height, straight, torso upright and still
Muscles in red: glutes, hip flexors, obliques
```

### 15. Mermaid
File: `Mermaid.png`

```
EXERCISE: Pilates Mermaid (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: front view
START panel: sitting tall in a cross-legged position, the right hand on the mat at the side, the left arm relaxed along the body
END panel: torso bent to the right in a side stretch, the left arm reaching overhead and over to the right, ribs bending towards the hand on the mat
Muscles in red: obliques
```

### 16. Boomerang
File: `Boomerang.png`

```
EXERCISE: Pilates Boomerang (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: sitting leaning back slightly, legs stretched forward crossed at the ankles, arms reaching forward along the legs
END panel: rolled back with the crossed legs carried over the head (toes towards the floor behind the head), hips lifted, arms pressing flat on the mat
Muscles in red: abdominals, hip flexors
```

### 17. Seal
File: `Seal.png`

```
EXERCISE: Pilates Seal (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: balancing on the sitting bones in a round C-curve, knees wide open, feet together, hands holding the feet from the inside, head tucked
END panel: rolled back onto the shoulder blades, same shape (knees open, feet together, hands on the feet), feet in the air, head tucked
Muscles in red: abdominals
```

### 18. Control balance
File: `Control balance.png`

```
EXERCISE: Pilates Control Balance (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: rolled over: hips lifted, legs pointing straight up (shoulder-stand-like), one hand holding the right ankle, the left arm pressing on the mat
END panel: the LEFT leg lowered straight down towards the floor in front of the body at about 45 degrees while the right leg stays vertical held by the hand
Muscles in red: abdominals, hip flexors, glutes
```

### 19. Pilates push-up
File: `Pilates push-up.png`

```
EXERCISE: Pilates Push Up (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: high plank: arms straight under the shoulders, body in one line from head to heels
END panel: bottom of the push-up: chest lowered to a fist from the mat, elbows bent backwards close to the ribs, body still in a straight line
Muscles in red: chest, triceps, shoulders, abdominals
```

### 20. Pulldown neutro
File: `Pulldown neutro.png`

```
EXERCISE: Neutral Grip Lat Pulldown (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: lat pulldown machine with a thigh pad and a neutral-grip (parallel handles) V bar
Camera: side view
START panel: seated at the lat pulldown machine, knees under the thigh pad, arms fully extended overhead holding the neutral-grip handle, slight lean back
END panel: the handle pulled down to the upper chest, elbows down along the sides, chest up
Muscles in red: lats, biceps, rear shoulders
```

### 21. Towel row
File: `Towel row.png`

```
EXERCISE: Towel Row (door) (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a rolled towel looped around a door handle, a door
Camera: side view
START panel: leaning back with straight arms holding both ends of the towel, feet near the door, body in a straight line inclined backwards
END panel: pulled in towards the door: elbows bent behind the torso, hands at the chest, body still straight and inclined
Muscles in red: lats, rhomboids, biceps
```

## Mobilità e stretching (25)

### 22. Cat-cow
File: `Cat-cow.png`

```
EXERCISE: Cat Cow Stretch (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: on all fours, back arched down (cow), chest and head lifted, tailbone up
END panel: on all fours, spine rounded up towards the ceiling (cat), head down, tailbone tucked
Muscles in red: spine, abdominals
```

### 23. World’s greatest stretch
File: `World s greatest stretch.png`

```
EXERCISE: World's Greatest Stretch (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: deep lunge, RIGHT foot forward, both hands on the mat inside the front foot, back leg straight
END panel: the same lunge with the torso rotated to the right and the right arm reaching up to the ceiling, eyes following the hand
Muscles in red: hip flexors, glutes, spine rotators
```

### 24. Stretch 90/90 anche
File: `Stretch 90 90 anche.png`

```
EXERCISE: 90/90 Hip Stretch (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: front view
START panel: sitting on the mat with both knees bent at 90 degrees: front leg shin parallel to the front, back leg to the side, torso upright
END panel: the torso folded forward over the front shin, hands reaching on the mat, back straight
Muscles in red: glutes, hip rotators
```

### 25. Stretch flessori dell’anca
File: `Stretch flessori dell anca.png`

```
EXERCISE: Half Kneeling Hip Flexor Stretch (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: half kneeling (left knee on the mat, right foot forward), torso upright, hands on the front thigh
END panel: pelvis pushed forward with the back glute squeezed, both arms reaching overhead, torso tall
Muscles in red: hip flexors, front thigh
```

### 26. Posizione del bambino
File: `Posizione del bambino.png`

```
EXERCISE: Child's Pose (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: kneeling upright sitting on the heels, hands on the thighs, torso tall
END panel: folded forward, forehead on the mat, arms stretched out in front, hips back on the heels
Muscles in red: lower back, lats
```

### 27. Cane a testa in giù
File: `Cane a testa in giu.png`

```
EXERCISE: Downward Dog (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: on all fours in a table position, hands under the shoulders, knees under the hips
END panel: inverted V: hips high, arms and legs straight, heels towards the mat, head between the arms
Muscles in red: hamstrings, calves, shoulders
```

### 28. Cobra
File: `Cobra.png`

```
EXERCISE: Cobra Stretch (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: lying face down, hands flat under the shoulders, forehead on the mat
END panel: chest lifted by pressing on the hands, arms almost straight, pelvis and legs on the mat, head up
Muscles in red: abdominals (stretch), lower back
```

### 29. Rotazioni toraciche in quadrupedia
File: `Rotazioni toraciche in quadrupedia.png`

```
EXERCISE: Quadruped Thoracic Rotation (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: front view, slightly from the side
START panel: on all fours, the right hand behind the head, elbow pointing down towards the left arm
END panel: the right elbow rotated up towards the ceiling, chest opened, eyes following the elbow
Muscles in red: upper back, obliques
```

### 30. Thread the needle
File: `Thread the needle.png`

```
EXERCISE: Thread the Needle Stretch (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: front view, slightly from the side
START panel: on all fours, the right arm reaching up to the ceiling with the chest open
END panel: the right arm threaded under the chest to the left, right shoulder and cheek resting on the mat, hips high
Muscles in red: shoulders, upper back
```

### 31. Squat profondo tenuto
File: `Squat profondo tenuto.png`

```
EXERCISE: Deep Squat Hold (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: none
Camera: front view
START panel: standing with the feet slightly wider than the shoulders, toes turned out, hands together at the chest
END panel: the deepest squat, heels flat, torso upright, hands in prayer position with the elbows pushing the knees out
Muscles in red: hips, adductors, ankles
```

### 32. Stretch ischiocrurali supino
File: `Stretch ischiocrurali supino.png`

```
EXERCISE: Supine Hamstring Stretch (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: lying on the back with one leg flat on the mat and the other knee bent
END panel: the RIGHT leg straight up towards the ceiling held with both hands behind the thigh, the left leg flat on the mat
Muscles in red: hamstrings
```

### 33. Stretch del piccione
File: `Stretch del piccione.png`

```
EXERCISE: Pigeon Stretch (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: on all fours
END panel: pigeon pose: the right shin across the mat in front, the left leg extended straight behind, torso upright with hands on the mat
Muscles in red: glutes, hip rotators
```

### 34. Stretch a rana
File: `Stretch a rana.png`

```
EXERCISE: Frog Stretch (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view and slightly from above
START panel: on all fours with the knees close together
END panel: frog position: knees wide apart, feet turned out, hips pushed back, forearms on the mat
Muscles in red: adductors
```

### 35. Stretch polpacci al muro
File: `Stretch polpacci al muro.png`

```
EXERCISE: Wall Calf Stretch (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a wall
Camera: side view
START panel: standing facing a wall, hands on the wall at shoulder height, feet together a step from the wall
END panel: the right leg stepped back and straight with the heel flat on the floor, the left knee bent, leaning into the wall
Muscles in red: calves
```

### 36. Stretch pettorali al muro
File: `Stretch pettorali al muro.png`

```
EXERCISE: Wall Pec Stretch (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a wall
Camera: front view
START panel: standing sideways next to a wall, the forearm on the wall with the elbow bent at 90 degrees at shoulder height
END panel: the torso rotated away from the wall, chest open, the forearm still on the wall
Muscles in red: chest, front shoulder
```

### 37. Cerchi controllati della spalla
File: `Cerchi controllati della spalla.png`

```
EXERCISE: Shoulder CARs (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: none
Camera: front view
START panel: standing tall, the right arm hanging along the body, the left hand on the hip
END panel: the right arm raised overhead, straight, tracing a large slow circle, a circular arrow around the shoulder
Muscles in red: shoulder
```

### 38. Cerchi controllati dell’anca
File: `Cerchi controllati dell anca.png`

```
EXERCISE: Hip CARs (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: on all fours, the right knee under the hip
END panel: the right knee lifted and drawn out to the side in a big circle, a circular arrow around the hip
Muscles in red: hip, glutes
```

### 39. Stretch quadricipite in piedi
File: `Stretch quadricipite in piedi.png`

```
EXERCISE: Standing Quad Stretch (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: none
Camera: side view
START panel: standing on the left leg, the right leg relaxed, one hand free
END panel: the right heel pulled to the glute held with the right hand, knees together, pelvis pushed slightly forward, torso tall
Muscles in red: front thigh
```

### 40. Torsione supina
File: `Torsione supina.png`

```
EXERCISE: Supine Spinal Twist (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: front view from above-side
START panel: lying on the back, arms out to the sides in a T, knees bent and together lifted over the hips
END panel: both knees dropped to the right side on the mat, both shoulders flat, head turned to the left
Muscles in red: spine rotators, glutes
```

### 41. Stretch dorsali in ginocchio
File: `Stretch dorsali in ginocchio.png`

```
EXERCISE: Kneeling Lat Stretch (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a bench
Camera: side view
START panel: kneeling in front of a bench, hands resting on the bench, torso upright
END panel: hips pushed back, chest dropping between the arms, arms stretched forward on the bench, head between the arms
Muscles in red: lats, shoulders
```

### 42. Stretch a farfalla
File: `Stretch a farfalla.png`

```
EXERCISE: Butterfly Stretch (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: front view
START panel: sitting tall, the soles of the feet together, knees out to the sides
END panel: folded forward over the feet, back long, knees dropping towards the mat
Muscles in red: adductors, hips
```

### 43. Stretch laterale del collo
File: `Stretch laterale del collo.png`

```
EXERCISE: Lateral Neck Stretch (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: none
Camera: front view
START panel: sitting tall with the head neutral, shoulders relaxed
END panel: the head tilted to the right ear towards the right shoulder, the right hand resting lightly on the head, the left shoulder down
Muscles in red: side of the neck
```

### 44. Scivolamenti al muro
File: `Scivolamenti al muro.png`

```
EXERCISE: Wall Slides (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a wall
Camera: side view
START panel: standing with the back and the head against the wall, forearms against the wall with the elbows bent at 90 degrees
END panel: the arms slid up overhead keeping forearms and hands in contact with the wall, back still against the wall
Muscles in red: shoulders, upper back
```

### 45. Estensione toracica a terra
File: `Estensione toracica a terra.png`

```
EXERCISE: Thoracic Extension Stretch (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a bench
Camera: side view
START panel: kneeling in front of a bench with the elbows on it, hands behind the head, spine neutral
END panel: the chest dropped towards the floor, the upper back arched, elbows still on the bench, hips over the knees
Muscles in red: upper back, lats
```

### 46. Jefferson curl a corpo libero
File: `Jefferson curl a corpo libero.png`

```
EXERCISE: Bodyweight Jefferson Curl (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: none
Camera: side view
START panel: standing tall, feet hip-width, arms overhead
END panel: rolled down one vertebra at a time with straight knees, the arms hanging towards the floor, back fully rounded
Muscles in red: spine, hamstrings
```

## Allenarsi a casa: corpo libero e elastici (19)

### 47. Push-up inclinato
File: `Push-up inclinato.png`

```
EXERCISE: Incline Push-Up (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a bench
Camera: side view
START panel: hands on the edge of a bench, arms straight, body in one line from head to heels, feet on the floor
END panel: chest lowered to the bench, elbows at 45 degrees, body still in a straight line
Muscles in red: chest, triceps, shoulders
```

### 48. Handstand push-up al muro
File: `Handstand push-up al muro.png`

```
EXERCISE: Wall Handstand Push-Up (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a wall
Camera: side view
START panel: handstand with the heels against the wall, arms straight, body in a straight vertical line
END panel: head lowered to a fist from the floor, elbows bent at 45 degrees, heels against the wall
Muscles in red: shoulders, triceps
```

### 49. Dip su sedia
File: `Dip su sedia.png`

```
EXERCISE: Chair Dip (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a sturdy chair
Camera: side view
START panel: hands on the edge of a chair behind the body, arms straight, legs extended with the heels on the floor, hips off the chair
END panel: elbows bent to 90 degrees, hips lowered close to the chair, shoulders away from the ears
Muscles in red: triceps, chest, front shoulders
```

### 50. Dead hang
File: `Dead hang.png`

```
EXERCISE: Dead Hang (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a pull-up bar
Camera: front view
START panel: hanging from the bar with straight arms, shoulders relaxed up by the ears (passive hang)
END panel: hanging from the bar with straight arms, shoulders pulled down and back (active hang), chest slightly out
Muscles in red: lats, forearms, shoulder stabilisers
```

### 51. Trazioni negative
File: `Trazioni negative.png`

```
EXERCISE: Negative Pull-Up (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a pull-up bar
Camera: front view
START panel: chin above the bar, arms bent (top position)
END panel: arms fully extended hanging from the bar after the slow lowering, a downward arrow
Muscles in red: lats, biceps
```

### 52. Reverse snow angel
File: `Reverse snow angel.png`

```
EXERCISE: Reverse Snow Angel (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: lying face down, arms along the body lifted slightly off the mat, palms facing down, forehead off the mat
END panel: lying face down, the arms swept in an arc overhead and lifted, thumbs up, chest lifted
Muscles in red: upper back, rear shoulders
```

### 53. Affondi a corpo libero
File: `Affondi a corpo libero.png`

```
EXERCISE: Bodyweight Reverse Lunge (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: none
Camera: side view
START panel: standing tall, feet together, hands on the hips
END panel: reverse lunge: the right leg stepped back, the back knee a fist from the floor, front knee at 90 degrees, torso upright
Muscles in red: quads, glutes
```

### 54. L-sit raccolto
File: `L-sit raccolto.png`

```
EXERCISE: Tuck L-Sit (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: two parallettes or two blocks
Camera: side view
START panel: sitting with straight arms pressing on two blocks beside the hips, legs on the floor
END panel: body lifted off the floor on the straight arms, knees tucked to the chest, shoulders pushed down
Muscles in red: abdominals, hip flexors, triceps
```

### 55. Arch hold
File: `Arch hold.png`

```
EXERCISE: Superman Arch Hold (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: lying face down, arms along the body palms up, legs together on the mat
END panel: chest and straight legs lifted off the mat at the same time, arms lifted along the body, neck neutral
Muscles in red: lower back, glutes
```

### 56. Superman
File: `Superman.png`

```
EXERCISE: Superman (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: lying face down, arms stretched forward, legs straight
END panel: arms and legs lifted off the mat at the same time, arms reaching forward, looking at the floor
Muscles in red: lower back, glutes, rear shoulders
```

### 57. Inverted row facilitato
File: `Inverted row facilitato.png`

```
EXERCISE: Easier Inverted Row (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a sturdy table or a low bar
Camera: side view
START panel: lying under a low bar (or table edge), knees bent with the feet flat on the floor, arms straight holding the bar, hips lifted
END panel: chest pulled up to the bar, elbows bent, body still in a line from shoulders to knees
Muscles in red: lats, rhomboids, biceps
```

### 58. Wall sit
File: `Wall sit.png`

```
EXERCISE: Wall Sit (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a wall
Camera: side view
START panel: standing with the back against the wall, feet a step in front, arms along the body
END panel: sitting against the wall with the thighs parallel to the floor and the knees at 90 degrees, back flat on the wall, arms crossed or hanging
Muscles in red: quads, glutes
```

### 59. Calf raise a corpo libero
File: `Calf raise a corpo libero.png`

```
EXERCISE: Bodyweight Calf Raise (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a step
Camera: side view
START panel: standing on the edge of a step on the balls of the feet, heels lowered below the step, hands on a wall for balance
END panel: heels lifted as high as possible, on the toes, legs straight
Muscles in red: calves
```

### 60. Affondi saltati
File: `Affondi saltati.png`

```
EXERCISE: Jumping Lunge (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: none
Camera: side view
START panel: in a lunge, the right leg forward, the left knee near the floor
END panel: in mid-air switching legs: the legs crossing in the air, arms driving, a vertical arrow
Muscles in red: quads, glutes, calves
```

### 61. Plank jack
File: `Plank jack.png`

```
EXERCISE: Plank Jack (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: front view slightly from the side
START panel: high plank with the feet together, arms straight
END panel: high plank with the feet jumped wide apart, body and arms unchanged
Muscles in red: abdominals, shoulders, adductors
```

### 62. Bear crawl
File: `Bear crawl.png`

```
EXERCISE: Bear Crawl (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: none
Camera: side view
START panel: on hands and toes with the knees bent and lifted just off the floor, back flat
END panel: moving forward: the right hand and the left foot advanced at the same time, knees still hovering off the floor, a forward arrow
Muscles in red: shoulders, abdominals, quads
```

### 63. Squat con elastico
File: `Squat con elastico.png`

```
EXERCISE: Banded Squat (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a loop resistance band above the knees
Camera: front view
START panel: standing with the feet shoulder-width, a resistance band around the legs just above the knees, arms in front
END panel: the squat at parallel with the knees pushed out against the band, torso upright
Muscles in red: quads, glutes
```

### 64. Chest press elastico
File: `Chest press elastico.png`

```
EXERCISE: Band Chest Press (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a long resistance band around the back
Camera: side view
START panel: standing in a split stance, the band around the upper back with the handles in the hands at the chest, elbows bent
END panel: the arms pressed forward until straight at chest height against the band
Muscles in red: chest, triceps, front shoulders
```

### 65. Pull-apart elastico
File: `Pull-apart elastico.png`

```
EXERCISE: Band Pull-Apart (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a resistance band
Camera: front view
START panel: standing, arms straight in front at shoulder height holding the band with the hands shoulder-width apart
END panel: the arms pulled apart to the sides until in a T, the band stretched across the chest, shoulder blades squeezed
Muscles in red: rear shoulders, upper back
```

## Nuovi dal PDF Booty By Bret: glutei (22)

### 66. Hip thrust manubrio
File: `Hip thrust manubrio.png`

```
EXERCISE: Dumbbell Hip Thrust (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a flat bench and one dumbbell
Camera: side view
START panel: the upper back resting on the edge of the bench, knees bent with the feet flat, one dumbbell on the hips held with both hands, hips lowered close to the floor
END panel: hips thrust up until the torso and thighs are parallel to the floor, shins vertical, chin tucked, dumbbell on the hips
Muscles in red: glutes, hamstrings
```

### 67. Hip thrust piedi rialzati
File: `Hip thrust piedi rialzati.png`

```
EXERCISE: Feet-Elevated Hip Thrust (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a flat bench, a low box and a barbell
Camera: side view
START panel: the upper back on the bench, the feet on a low box in front, a barbell over the hips, hips lowered
END panel: hips thrust up to a flat torso, shins about vertical, barbell on the hips
Muscles in red: glutes, hamstrings
```

### 68. B-stance hip thrust
File: `B-stance hip thrust.png`

```
EXERCISE: B-Stance Hip Thrust (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a flat bench and one dumbbell
Camera: side view
START panel: the upper back on the bench, the RIGHT foot flat as the working foot and the LEFT foot a step behind it touching the floor only with the toes, a dumbbell on the hips, hips lowered
END panel: hips thrust up to a flat torso, the work done by the right leg, the left foot only touching with the toes
Muscles in red: glutes (working side), hamstrings
```

### 69. Hip thrust con elastico
File: `Hip thrust con elastico.png`

```
EXERCISE: Banded Hip Thrust (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a flat bench, a barbell and a loop band above the knees
Camera: side view and slightly from the front
START panel: the upper back on the bench, a loop band around the legs just above the knees, a barbell over the hips, hips lowered
END panel: hips thrust up to a flat torso with the knees pushed out against the band
Muscles in red: glutes, outer hips
```

### 70. Glute bridge con elastico
File: `Glute bridge con elastico.png`

```
EXERCISE: Banded Glute Bridge (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: lying on the back, knees bent, a loop band around the legs just above the knees, feet flat, hips on the mat
END panel: hips lifted into a bridge with the knees pushed apart against the band
Muscles in red: glutes, outer hips
```

### 71. Glute bridge bilanciere
File: `Glute bridge bilanciere.png`

```
EXERCISE: Barbell Glute Bridge (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a barbell with plates over the hips
Camera: side view
START panel: lying on the back on the floor, knees bent, a barbell over the hips held with both hands, hips on the floor
END panel: hips lifted into a bridge with the barbell on the hips, shoulders on the floor
Muscles in red: glutes, hamstrings
```

### 72. Glute bridge manubrio
File: `Glute bridge manubrio.png`

```
EXERCISE: Dumbbell Glute Bridge (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: one dumbbell
Camera: side view
START panel: lying on the back on the mat, knees bent, a dumbbell on the hips held with both hands, hips down
END panel: hips lifted into a bridge with the dumbbell on the hips
Muscles in red: glutes, hamstrings
```

### 73. Glute bridge piedi rialzati
File: `Glute bridge piedi rialzati.png`

```
EXERCISE: Feet-Elevated Glute Bridge (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a bench or box for the feet
Camera: side view
START panel: lying on the back, the feet on a bench, knees bent, hips on the mat, arms along the body
END panel: hips lifted high into a bridge with the feet still on the bench
Muscles in red: glutes, hamstrings
```

### 74. Reverse hyper
File: `Reverse hyper.png`

```
EXERCISE: Reverse Hyperextension (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a reverse hyperextension machine with a padded platform
Camera: side view
START panel: lying face down on the padded platform with the hips at the edge, the legs hanging down under the platform, hands holding the handles
END panel: the legs swung up and back until in line with the torso, legs straight, glutes squeezed
Muscles in red: glutes, hamstrings, lower back
```

### 75. Reverse hyper su panca
File: `Reverse hyper su panca.png`

```
EXERCISE: Bench Reverse Hyperextension (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a flat bench
Camera: side view
START panel: lying face down on a bench with the hips at the end edge, hands holding the bench, the legs hanging down
END panel: the legs raised straight until in line with the torso, glutes squeezed
Muscles in red: glutes, hamstrings, lower back
```

### 76. Iperestensione 45° glutei
File: `Iperestensione 45 glutei.png`

```
EXERCISE: Glute-Focus 45-Degree Back Extension (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a 45-degree hyperextension bench
Camera: side view
START panel: on the 45-degree bench, hips on the pad, feet locked under the rollers, torso hanging down with a rounded upper back, arms crossed on the chest
END panel: torso raised until in line with the legs, hips fully extended, the upper back staying rounded
Muscles in red: glutes, hamstrings
```

### 77. Kickback cavo in ginocchio
File: `Kickback cavo in ginocchio.png`

```
EXERCISE: Kneeling Cable Glute Kickback (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a low cable pulley with an ankle strap
Camera: side view
START panel: on all fours on the mat facing the cable machine, the ankle strap on the right ankle, the right knee bent under the hip
END panel: the right leg kicked straight back and up in line with the torso, back flat, cable taut
Muscles in red: glutes
```

### 78. Donkey kick
File: `Donkey kick.png`

```
EXERCISE: Donkey Kick (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: on all fours, the right knee bent at 90 degrees under the hip, back flat
END panel: the right knee still bent at 90 degrees, the thigh lifted until the sole of the foot points to the ceiling, hips level
Muscles in red: glutes
```

### 79. Fire hydrant
File: `Fire hydrant.png`

```
EXERCISE: Fire Hydrant (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: rear view from slightly above
START panel: on all fours, knees under the hips, back flat
END panel: the right knee bent at 90 degrees lifted out to the side to hip height, hips level
Muscles in red: glutes (outer hip)
```

### 80. Clam shell
File: `Clam shell.png`

```
EXERCISE: Side-Lying Clam (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: front view
START panel: lying on the left side, head on the lower arm, hips and knees bent, the feet together and the knees together
END panel: the feet staying together while the top knee opens up like a shell, hips not rolling back
Muscles in red: glutes (outer hip)
```

### 81. Abduzione sdraiata sul fianco
File: `Abduzione sdraiata sul fianco.png`

```
EXERCISE: Side-Lying Hip Abduction (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: front view
START panel: lying on the left side, legs straight and stacked, head on the lower arm
END panel: the top leg lifted straight to about 45 degrees with the toes pointing forward, torso still
Muscles in red: glutes (outer hip)
```

### 82. Abduzione in piedi con elastico
File: `Abduzione in piedi con elastico.png`

```
EXERCISE: Standing Band Hip Abduction (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a loop band around the ankles
Camera: front view
START panel: standing tall with a loop band around the ankles, feet together, hands on the hips or a support
END panel: the right leg lifted out to the side against the band, straight, torso upright
Muscles in red: glutes (outer hip)
```

### 83. Abduzione ai cavi in piedi
File: `Abduzione ai cavi in piedi.png`

```
EXERCISE: Standing Cable Hip Abduction (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a low cable pulley with an ankle strap
Camera: front view
START panel: standing sideways to the cable machine, the ankle strap on the outer ankle, the cable crossing in front of the body, holding the machine for support
END panel: the outer leg lifted out to the side, straight, against the cable, torso upright
Muscles in red: glutes (outer hip)
```

### 84. Abduzione seduta con elastico
File: `Abduzione seduta con elastico.png`

```
EXERCISE: Seated Band Hip Abduction (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a loop band above the knees and a bench
Camera: front view
START panel: sitting on a bench, a loop band above the knees, the knees together, torso leaning slightly forward
END panel: the knees pushed apart against the band, the feet in place
Muscles in red: glutes (outer hip)
```

### 85. Lateral band walk
File: `Lateral band walk.png`

```
EXERCISE: Lateral Band Walk (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a loop band above the knees
Camera: front view
START panel: half squat with a loop band above the knees, the feet shoulder-width, hands in front
END panel: a wide step to the right, the band taut, still in the half squat, the weight on the left leg
Muscles in red: glutes (outer hip)
```

### 86. Monster walk
File: `Monster walk.png`

```
EXERCISE: Monster Walk (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a loop band above the knees
Camera: front view
START panel: half squat with a loop band above the knees, the feet shoulder-width, arms in front
END panel: a diagonal step forward and out with the right foot, the band taut, torso upright
Muscles in red: glutes (outer hip)
```

### 87. Hip hike
File: `Hip hike.png`

```
EXERCISE: Hip Hike (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a step or a low box
Camera: rear view
START panel: standing on the edge of a step on the left leg, the right leg hanging down beside the step, pelvis level, a hand on a wall
END panel: the pelvis dropped on the right side (the right foot lowered below the step) then ready to hike up: the hips clearly tilted with the right side lower than the left
Muscles in red: glutes (outer hip), obliques
```

## Nuovi dal PDF Booty By Bret: gambe, femorali, core (14)

### 88. Sumo squat
File: `Sumo squat.png`

```
EXERCISE: Dumbbell Sumo Squat (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: one dumbbell
Camera: front view
START panel: standing with the feet very wide and the toes turned out, one dumbbell held in both hands hanging in front, torso upright
END panel: the deep sumo squat, thighs parallel or lower, knees over the toes, dumbbell between the legs, torso upright
Muscles in red: inner thighs, glutes, quads
```

### 89. Front squat manubri
File: `Front squat manubri.png`

```
EXERCISE: Dumbbell Front Squat (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: two dumbbells
Camera: side view
START panel: standing with the feet shoulder-width, two dumbbells resting on the front shoulders with the elbows up
END panel: the squat at parallel, torso upright, elbows high, dumbbells on the shoulders
Muscles in red: quads, glutes
```

### 90. Curtsy lunge
File: `Curtsy lunge.png`

```
EXERCISE: Curtsy Lunge (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: two dumbbells at the sides
Camera: front view
START panel: standing tall with the feet together, a dumbbell in each hand
END panel: the right leg crossed behind the left in a curtsy, both knees bent, the back knee close to the floor, torso upright
Muscles in red: glutes, quads, adductors
```

### 91. Lateral lunge
File: `Lateral lunge.png`

```
EXERCISE: Lateral Lunge (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: one dumbbell at the chest
Camera: front view
START panel: standing tall with the feet together, a dumbbell held at the chest
END panel: a wide step to the right, the right knee bent and the hips back, the left leg straight, both feet flat, torso leaning slightly forward
Muscles in red: glutes, quads, adductors
```

### 92. Affondi bilanciere
File: `Affondi bilanciere.png`

```
EXERCISE: Barbell Lunge (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a barbell across the upper back
Camera: side view
START panel: standing tall with a barbell on the upper back, feet together
END panel: reverse lunge: the right leg stepped back, the back knee a fist from the floor, front knee at 90 degrees, barbell stable
Muscles in red: quads, glutes
```

### 93. High step-up
File: `High step-up.png`

```
EXERCISE: High Step-Up (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a high box and two dumbbells
Camera: side view
START panel: standing in front of a high box (knee-height or higher) with the right foot on it, a dumbbell in each hand
END panel: standing tall on the box on the right leg with the left knee lifted, the dumbbells hanging
Muscles in red: glutes, quads
```

### 94. Skater squat
File: `Skater squat.png`

```
EXERCISE: Skater Squat (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: none
Camera: side view
START panel: standing on the left leg with the right knee bent and the right foot behind, arms in front for balance
END panel: the left leg bent in a deep single-leg squat, the right knee a fist from the floor behind, torso leaning forward, arms forward
Muscles in red: quads, glutes
```

### 95. Single-leg box squat
File: `Single-leg box squat.png`

```
EXERCISE: Single-Leg Box Squat (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a box
Camera: side view
START panel: standing in front of a box on the left leg, the right leg extended forward, arms forward
END panel: sitting down on the box on one leg with the right leg straight out in front, torso leaning forward, arms forward
Muscles in red: quads, glutes
```

### 96. Stacco rumeno manubri
File: `Stacco rumeno manubri.png`

```
EXERCISE: Dumbbell Romanian Deadlift (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: two dumbbells
Camera: side view
START panel: standing tall with a dumbbell in each hand in front of the thighs, knees slightly bent
END panel: the hips pushed back, torso inclined to about parallel, back flat, the dumbbells sliding down the legs to mid-shin
Muscles in red: hamstrings, glutes, lower back
```

### 97. B-stance RDL
File: `B-stance RDL.png`

```
EXERCISE: B-Stance Romanian Deadlift (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: two dumbbells
Camera: side view
START panel: standing with the right foot flat as the working leg and the left foot a step behind touching only with the toes, a dumbbell in each hand in front of the thighs
END panel: the hips pushed back and the torso inclined to about parallel on the right leg, the left toes only touching, dumbbells to mid-shin
Muscles in red: hamstrings, glutes (working side)
```

### 98. Leg curl con slider
File: `Leg curl con slider.png`

```
EXERCISE: Slider Leg Curl (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a towel or two sliders under the heels
Camera: side view
START panel: lying on the back, the heels on towels on a smooth floor, legs straight, hips lifted in a bridge
END panel: the heels slid in towards the glutes with the knees bent, hips still lifted in the bridge
Muscles in red: hamstrings, glutes
```

### 99. Leg curl con fitball
File: `Leg curl con fitball.png`

```
EXERCISE: Stability Ball Leg Curl (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a stability ball
Camera: side view
START panel: lying on the back, the heels on a stability ball, legs straight, hips lifted in a bridge
END panel: the ball rolled in towards the glutes with the knees bent, hips still lifted in the bridge
Muscles in red: hamstrings, glutes
```

### 100. Leg curl manubrio
File: `Leg curl manubrio.png`

```
EXERCISE: Dumbbell Lying Leg Curl (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: a flat bench and one dumbbell
Camera: side view
START panel: lying face down on a bench, a dumbbell held between the feet, legs straight
END panel: the knees bent to 90 degrees or more bringing the dumbbell up towards the glutes, hips on the bench
Muscles in red: hamstrings
```

### 101. RKC plank
File: `RKC plank.png`

```
EXERCISE: RKC Plank (wide landscape 3:2, two panels START / END, same style as the references)
Equipment: dark-grey exercise mat
Camera: side view
START panel: a forearm plank with the elbows under the shoulders, body in one line from head to heels
END panel: the same plank with maximal full-body tension: fists clenched, glutes and thighs squeezed, pelvis slightly tucked, a small tension arrow pointing forward at the elbows and one pointing back at the feet
Muscles in red: abdominals, glutes, thighs
```

