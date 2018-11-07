#include <iostream>

#include "Value.hpp"

int main() {
  Vortex::Value left(27);
  Vortex::Value right(10);

  Vortex::Value sum = Vortex::plus(left, right);

  std::cout << sum.data._Int32 << std::endl;

  return 0;
}
