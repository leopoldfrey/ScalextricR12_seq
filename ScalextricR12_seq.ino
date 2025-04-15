#include "sequence.h"

#define NMOT 2

#define OFF 0
#define FWD 1
#define BWD 2

//VAR MOTORS
int IN1[NMOT] = { 8, 10 };  //moteurs avec L298N
int IN2[NMOT] = { 5, 6 };
int ENA[NMOT] = { 9, 11 };

//controle des vitesses
float speedRatio[NMOT] = { 1, 1 };        //pour ajuster en fonction des moteurs, 1 = plein voltage
boolean revert[NMOT] = { false, false };  // pour retourner les pistes

byte sensorPin = 12;
byte ledPin = 13;

unsigned long stepStartTime = 0;
int currentStep = 0;
bool ramping = false;
unsigned long lastRampTime = 0;
int targetSpeed0 = 0, targetSpeed1 = 0;
int currentSpeed0 = 0, currentSpeed1 = 0;
int rampTime = 0;  // Une seule variable pour le temps de rampe
int stepDurationMs = 0;

bool sequenceRunning = false;
unsigned long lastStopTime = 0;  // Stocke le temps où la séquence s'est arrêtée

void startSequence() {
  Serial.println("Démarrage de la séquence !");
  sequenceRunning = true;
  currentStep = 0;
  stepStartTime = millis();
}

void stopSequence() {
  Serial.println("Arrêt de la séquence !");
  sequenceRunning = false;
  lastStopTime = millis();
}

void setup() {
  //Serial
  Serial.begin(9600);
  for (int i = 0; i < NMOT; i++) {
    pinMode(IN1[i], OUTPUT);
    pinMode(IN2[i], OUTPUT);
    pinMode(ENA[i], OUTPUT);
  }

  pinMode(ledPin, OUTPUT);
  pinMode(sensorPin, INPUT);
  randomSeed(analogRead(0));
}

int scaleSpeed(int motor, int inputSpeed) {
    // Utiliser les constantes spécifiques au moteur
    if (motor == 0) {
        return map(inputSpeed, 0, 255, SPEED1_MIN, SPEED1_MAX);
    } else if (motor == 1) {
        return map(inputSpeed, 0, 255, SPEED2_MIN, SPEED2_MAX);
    }
    return 0; // Valeur par défaut si le moteur n'est pas valide
}

void motorCtrl(int motor, int speed) {
    if (speed == 0) {
        digitalWrite(IN1[motor], LOW);
        digitalWrite(IN2[motor], LOW);
        analogWrite(ENA[motor], 0);
    } else if (speed > 0) {
        if (revert[motor]) {
            digitalWrite(IN1[motor], LOW);
            digitalWrite(IN2[motor], HIGH);
        } else {
            digitalWrite(IN1[motor], HIGH);
            digitalWrite(IN2[motor], LOW);
        }
        int scaledSpeed = scaleSpeed(motor, abs(speed) * speedRatio[motor]);
        analogWrite(ENA[motor], scaledSpeed);
    } else if (speed < 0) {
        if (revert[motor]) {
            digitalWrite(IN1[motor], HIGH);
            digitalWrite(IN2[motor], LOW);
        } else {
            digitalWrite(IN1[motor], LOW);
            digitalWrite(IN2[motor], HIGH);
        }
        int scaledSpeed = scaleSpeed(motor, abs(speed) * speedRatio[motor]);
        analogWrite(ENA[motor], scaledSpeed);
    }
}

void loop() {
  byte state = digitalRead(sensorPin);
  digitalWrite(ledPin, sequenceRunning);
  
  unsigned long currentTime = millis();

  // Vérifier si la séquence doit démarrer
  if (!sequenceRunning) {
    if (state == HIGH || (currentTime - lastStopTime >= (TIMEOUT_MN * 60000))) {  // 3 minutes
      startSequence();
    } else {
      motorCtrl(0, 0);
      motorCtrl(1, 0);
      return;  // Ne rien faire tant que la séquence est arrêtée
    }
  }

  // Exécution de la séquence
  if (currentStep < stepCount) {
    Step step = sequence[currentStep];

    if (!ramping) {
        targetSpeed0 = step.speed0.getValue();
        targetSpeed1 = step.speed1.getValue();
        rampTime = step.ramp * 1000;
        stepDurationMs = step.duration * 1000;

        Serial.print("Step ");
        Serial.print(currentStep);
        Serial.print(" - dur ");
        Serial.print(step.duration);
        Serial.print(" - Moteur 0: ");
        Serial.print(targetSpeed0);
        Serial.print(" | Moteur 1: ");
        Serial.print(targetSpeed1);
        Serial.print(" (ramp: ");
        Serial.print(rampTime / 1000.0);
        Serial.println("s)");

        lastRampTime = millis();
        ramping = true;
    }

    // Appliquer directement les vitesses cibles sans ramping
    motorCtrl(0, targetSpeed0);
    motorCtrl(1, targetSpeed1);

    // Ancien code de gestion du ramping (désactivé)
    /*
    if (ramping) {
        // Calculer le facteur de ramping
        float factor = min(1.0, (float)(millis() - lastRampTime) / rampTime);

        // Appliquer le ramping aux deux moteurs
        currentSpeed0 = targetSpeed0 * factor;
        motorCtrl(0, currentSpeed0);

        currentSpeed1 = targetSpeed1 * factor;
        motorCtrl(1, currentSpeed1);

        // Vérifier si le ramping est terminé
        if (millis() - lastRampTime >= rampTime) {
            ramping = false;
        }
    } else {
        // Maintenir la vitesse actuelle jusqu'à ce que la nouvelle étape commence
        motorCtrl(0, currentSpeed0);
        motorCtrl(1, currentSpeed1);
    }
    */

    // Vérifier si la durée de l'étape est écoulée
    if (currentTime - stepStartTime >= stepDurationMs) {
        currentStep++;
        stepStartTime = currentTime;
        ramping = false; // Préparer le ramping pour la nouvelle étape
    }
  } else {
    stopSequence();  // Arrêt de la séquence à la fin
  }
}
