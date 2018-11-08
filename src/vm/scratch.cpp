#include <iostream>
#include <vector>

#include "Machine.hpp"
using namespace Vortex;

int main() {
  vector<byte> code = {
    INT32, 3, 0, 0, 0,
    INT32, 5, 0, 0, 0,
    MULTIPLY,
    INT32, 1, 0, 0, 0,
    PLUS,
    SET_LOCAL, 0,
    GET_LOCAL, 0,
    GET_LOCAL, 0,
    GET_LOCAL, 0,
    PLUS,
    PLUS,
    RETURN,
  };

  auto machine = Machine();
  Value result = machine.process(code.data());

  std::cout << result.data.INT32 << std::endl;

  return 0;
}
