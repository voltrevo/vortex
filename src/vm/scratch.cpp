#include <iostream>
#include <vector>

#include "Machine.hpp"
using namespace Vortex;

int main() {
  vector<byte> code = {
    INT32, 1, 0, 0, 0,
    INT32, 1, 0, 0, 0,
    PLUS,
    END,
  };

  auto machine = Machine();
  machine.process(code.data());

  std::cout << machine.top().data.INT32 << std::endl;

  return 0;
}
