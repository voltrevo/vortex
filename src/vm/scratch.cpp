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
    INT32, 10, 0, 0, 0,
    GREATER,
    BOOL, 1,
    AND,
    END,
  };

  auto machine = Machine();
  machine.process(code.data());

  std::cout << machine.top().data.BOOL << std::endl;

  return 0;
}
