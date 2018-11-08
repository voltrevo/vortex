#include <iostream>
#include <vector>

#include "Machine.hpp"
using namespace Vortex;

int main() {
  vector<byte> code = {
    /*
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
    RETURN, // 48
    */

    INT32, 30, 0, 0, 0,
    SET_LOCAL, 0,

    INT32, 7, 0, 0, 0,
    INT32, 10, 0, 0, 0,
    LESS,
    IF,
      GET_LOCAL, 0,
      INT32, 20, 0, 0, 0,
      PLUS,
      SET_LOCAL, 0,
    END,

    GET_LOCAL, 0,
    RETURN,
  };

  auto machine = Machine();
  Value result = machine.eval(code.data());

  std::cout << result.data.INT32 << std::endl;

  return 0;
}
