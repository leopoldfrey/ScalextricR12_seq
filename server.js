const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const exec = require('child_process').exec;

// Initialisation de l'application Express
const app = express();
const port = 3000;

// Utilisation du middleware pour parser les données JSON
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir les fichiers statiques (HTML, CSS, JS)
app.use(express.static('public'));

// Endpoint pour récupérer la séquence actuelle
app.get('/get-sequence', (req, res) => {
    const sequenceFilePath = path.join(__dirname, 'sequence.h');

    fs.readFile(sequenceFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Erreur lors de la lecture du fichier sequence.h');
        }

        // Extraire la séquence et les constantes du fichier `sequence.h`
        const { sequence, constants } = parseSequenceFile(data);
        res.json({ sequence, constants });
    });
});

// Fonction pour analyser le fichier sequence.h et extraire les données de séquence et les constantes
function parseSequenceFile(fileContent) {
    const sequence = [];
    const constants = {};
    const lines = fileContent.split('\n');

    let inSequence = false; // Indicateur pour détecter la partie séquence

    // Analyser ligne par ligne
    lines.forEach(line => {
        line = line.trim(); // Enlever les espaces de début et de fin

        // Ignorer les lignes vides ou les commentaires
        if (line === '' || line.startsWith('//')) {
            return;
        }

        // Extraire les constantes définies avec #define
        if (line.startsWith('#define')) {
            const parts = line.split(/\s+/); // Diviser par espaces multiples
            if (parts.length >= 3) {
                const key = parts[1]; // Nom de la constante
                const value = parseFloat(parts[2]); // Valeur de la constante
                constants[key] = isNaN(value) ? parts[2] : value; // Stocker la valeur (numérique ou chaîne)
            }
            return;
        }

        // Recherche d'une ligne commençant par "const Step sequence[] = {"
        if (line.startsWith('const Step sequence[] = {')) {
            inSequence = true; // Cela marque le début de la séquence
            return;
        }

        // Si on est dans la partie séquence, analyser les étapes
        if (inSequence && line.startsWith('{')) {
            // Nettoyer les guillemets et autres caractères inutiles
            line = line.replace(/[{}]/g, '').trim();
            const values = line.split(',').map(value => value.trim());

            // Vérifier le nombre de valeurs attendues
            if (values.length >= 6) { // 6 valeurs attendues si ramp n'a qu'une seule valeur
                const step = {
                    duration: parseFloat(values[0]),
                    speed0: { min: parseFloat(values[1]), max: parseFloat(values[2]) },
                    speed1: { min: parseFloat(values[3]), max: parseFloat(values[4]) },
                    ramp: parseFloat(values[5]) // Une seule valeur pour ramp
                };
                sequence.push(step);
            }
        }

        // Recherche de la ligne de fin de la séquence
        if (line.startsWith('};')) {
            inSequence = false; // Cela marque la fin de la séquence
        }
    });

    return { sequence, constants };
}

// Endpoint pour sauvegarder la séquence modifiée
app.post('/save-sequence', (req, res) => {
    const sequence = req.body.sequence;  // On reçoit les données de la séquence modifiée
    const constants = req.body.constants; // On reçoit les constantes

    // Sauvegarder la séquence dans un fichier (par exemple sequence.h)
    const sequenceFilePath = path.join(__dirname, 'sequence.h');
    
    const newSequenceContent = generateSequenceHeader(sequence, constants);  // Une fonction qui génère le contenu C++ du fichier sequence.h

    fs.writeFile(sequenceFilePath, newSequenceContent, (err) => {
        if (err) {
            return res.status(500).send('Erreur lors de la sauvegarde de la séquence');
        }
        res.send({ message: 'Séquence sauvegardée avec succès' });
    });
});

// Fonction pour générer le contenu de sequence.h à partir des données de la séquence
function generateSequenceHeader(sequence, constants) {
    const { timeout, speed1Min, speed1Max, speed2Min, speed2Max } = constants;

    let sequenceContent = '#ifndef SEQUENCE_H\n#define SEQUENCE_H\n\n#include <Arduino.h>\n\n';

    // Ajouter les constantes au début du fichier
    sequenceContent += `#define TIMEOUT_MN ${timeout}\n`;
    sequenceContent += `#define SPEED1_MIN ${speed1Min}\n`;
    sequenceContent += `#define SPEED1_MAX ${speed1Max}\n`;
    sequenceContent += `#define SPEED2_MIN ${speed2Min}\n`;
    sequenceContent += `#define SPEED2_MAX ${speed2Max}\n\n`;

    // Ajouter la structure et la séquence
    sequenceContent += 'struct Value {\n  float valMin;\n  float valMax;\n\n  Value(float v) : valMin(v), valMax(v) {}  // Valeur fixe\n  Value(float v1, float v2) : valMin(v1), valMax(v2) {}  // Plage aléatoire\n\n  int getValueMs() {\n    return (valMin == valMax) ? valMin * 1000 : random(valMin * 1000, valMax * 1000 + 1);\n  }\n\n  int getValue() {\n    return (valMin == valMax) ? valMin : random(valMin, valMax + 1);\n  }\n};\n\n';
    
    sequenceContent += 'struct Step {\n  float duration;  // En secondes\n  Value speed0, speed1;  // Vitesse des moteurs\n  float ramp;            // Temps de rampe unique pour les deux moteurs\n};\n\n';

    sequenceContent += 'const Step sequence[] = {\n';
    sequence.forEach(step => {
        sequenceContent += `  {${step.duration}, {${step.speed0.min}, ${step.speed0.max}}, {${step.speed1.min}, ${step.speed1.max}}, ${step.ramp}},\n`;
    });

    sequenceContent += '};\n\nconst int stepCount = sizeof(sequence) / sizeof(sequence[0]);\n\n#endif\n';

    return sequenceContent;
}

// Route pour compiler et téléverser le code
app.post('/compile-upload', (req, res) => {
    console.log('Requête reçue pour /compile-upload:', req.body); // Log pour vérifier le contenu de req.body

    const { port } = req.body;
    if (!port) {
        res.status(400).send('Port non spécifié');
        return;
    }

    console.log(`/compile-upload Port sélectionné : ${port}`);

    const sketchName = "ScalextricR12_seq.ino";
    const command = `arduino-cli compile --fqbn arduino:avr:uno ${sketchName}`; // Modifier le chemin vers ton fichier .ino
    const uploadCommand = `arduino-cli upload -p ${port} --fqbn arduino:avr:uno ${sketchName}`; // Modifier le port de ton Arduino

    // Compiler
    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.error(`Erreur de compilation : ${stderr}`);
            res.status(500).send('Erreur lors de la compilation');
            return;
        }
        console.log(stdout);

        // Téléverser
        exec(uploadCommand, (err, stdout, stderr) => {
            if (err) {
                console.error(`Erreur de téléversement : ${stderr}`);
                res.status(500).send('Erreur lors du téléversement');
                return;
            }
            console.log(stdout);
            res.send('Compilation et téléversement réussis');
        });
    });
});

// Route pour lister les ports série disponibles
app.get('/list-ports', (req, res) => {
    exec('arduino-cli board list', (err, stdout, stderr) => {
        if (err) {
            console.error(`Erreur de listing des ports : ${stderr}`);
            res.status(500).send('Erreur lors de la récupération des ports');
            return;
        }
        

        // Parse the output of 'arduino-cli board list' to extract ports
        const ports = [];
        const lines = stdout.split('\n');
        //console.log(lines, typeof(lines[0]));
        lines.forEach(line => {
            const match = line.match(/^(\S+)\s+(\S+)\s+(.*?)\s+(\S+)?\s+(\S+)?$/);
            if (match) {
                const port = match[1]; // Première colonne : le port
                const type = match[2]; // Deuxième colonne : le type
                const boardName = match[3] && match[3] !== 'Serial Port' ? match[3].trim() : 'Unknown'; // Troisième colonne : le nom de la carte
                const fqbn = match[4] || 'N/A'; // Quatrième colonne : FQBN (Fully Qualified Board Name)
                const core = match[5] || 'N/A'; // Cinquième colonne : Core

                if (port.startsWith('/dev/')) {
                    ports.push({ port, boardName });
                }
            }
        });
        console.log("PORTS", ports);
        res.json({ ports });
    });
});

// Démarrer le serveur
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
