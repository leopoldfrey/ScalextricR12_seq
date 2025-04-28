#ifndef SEQUENCE_H
#define SEQUENCE_H

#include <Arduino.h>

#define TIMEOUT_MN 3
#define SPEED1_MIN 88
#define SPEED1_MAX 109
#define SPEED2_MIN 115
#define SPEED2_MAX 120

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
  {5, {15, 30}, {15, 30}, 0},
  {5, {40, 100}, {40, 100}, 0},
  {5, {90, 120}, {90, 120}, 0},
  {1, {75, 120}, {75, 120}, 0},
  {10, {1, 20}, {1, 20}, 0},
  {10, {5, 50}, {5, 50}, 0},
  {10, {50, 100}, {50, 100}, 0},
  {5, {20, 50}, {20, 50}, 0},
  {3, {199, 255}, {207, 255}, 0},
  {10, {1, 25}, {1, 25}, 0},
  {8, {20, 100}, {20, 100}, 0},
  {8, {25, 150}, {25, 150}, 0},
  {8, {50, 130}, {50, 130}, 0},
  {3, {199, 255}, {207, 255}, 0},
  {10, {1, 20}, {1, 20}, 0},
  {10, {30, 50}, {30, 50}, 0},
  {1, {0, 0}, {0, 0}, 0},
};

const int stepCount = sizeof(sequence) / sizeof(sequence[0]);

#endif
