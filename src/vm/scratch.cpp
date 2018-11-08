#include <iostream>

#include "Value.hpp"
using namespace Vortex;

int main() {
  auto calc = BinaryOperator(
    Value(3),
    Value(4),
    POWER
  );

  std::cout << calc.data.INT32 << std::endl;

  return 0;
}
