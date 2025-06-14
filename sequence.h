#ifndef SEQUENCE_H
#define SEQUENCE_H

#include <Arduino.h>

#define TIMEOUT_MN 1.5
#define SPEED1_MIN 68
#define SPEED1_MAX 99
#define SPEED2_MIN 87
#define SPEED2_MAX 93

struct Value {
  float valMin;
  float valMax;

  Value(float v) : valMin(v), valMax(v) {}  // Valeur fixe
  Value(float v1, float v2) : valMin(v1), valMax(v2) {}  // Plage aléatoire

  int getValueMs() {
    return (valMin == valMax) ? valMin * 1000 : random(valMin * 1000, valMax * 1000 + 1);
  }

  int getValue() {
    return (valMin == valMax) ? valMin : random(valMin, valMax + 1);
  }
};

struct Step {
  float duration;  // En secondes
  Value speed0, speed1;  // Vitesse des moteurs
  float ramp;            // Temps de rampe unique pour les deux moteurs
};

const Step sequence[] = {
  {60, {255, 255}, {255, 255}, 0},
  {1, {0, 0}, {0, 0}, 0},
};

const int stepCount = sizeof(sequence) / sizeof(sequence[0]);

#endif
