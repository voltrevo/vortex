#include <iostream>
#include <vector>

#include "Machine.hpp"
using namespace Vortex;

int main() {
  vector<byte> code = {
    /*
    // sum := 3 * 5 + 1; return sum + sum + sum;
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

    /*
    // x := 30;
    // if (7 < 10) {
    //   x = x + 20;
    // }
    // return x;
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
    RETURN, // 50
    */

    /*
    // sum := 0;
    // i := 1;
    // for {
    //   sum += i;
    //   if (i == 4) {
    //     break;
    //   }
    //   i += 1;
    // }
    // return sum;
    INT32, 0, 0, 0, 0,
    SET_LOCAL, 0,

    INT32, 1, 0, 0, 0,
    SET_LOCAL, 1,

    LOOP,
      GET_LOCAL, 0,
      GET_LOCAL, 1,
      PLUS,
      SET_LOCAL, 0,

      GET_LOCAL, 1,
      INT32, 4, 0, 0, 0,
      EQUAL,
      IF,
        BREAK,
      END,

      GET_LOCAL, 1,
      INT32, 1, 0, 0, 0,
      PLUS,
      SET_LOCAL, 1,
    END,

    GET_LOCAL, 0,
    RETURN,
    */

    //sum := 0;
    //for (i := 1; i < 1000; i++) {
    //  if (i % 3 == 0 || i % 5 == 0) {
    //    sum += i;
    //  }
    //}
    //return sum;

    INT32, 0, 0, 0, 0,
    SET_LOCAL, 0,

    INT32, 1, 0, 0, 0,
    SET_LOCAL, 1,

    LOOP,
      GET_LOCAL, 1,
      INT32, 3, 0, 0, 0,
      MODULUS,
      INT32, 0, 0, 0, 0,
      EQUAL,
      GET_LOCAL, 1,
      INT32, 5, 0, 0, 0,
      MODULUS,
      INT32, 0, 0, 0, 0,
      EQUAL,
      OR,
      IF,
        GET_LOCAL, 0,
        GET_LOCAL, 1,
        PLUS,
        SET_LOCAL, 0,
      END,

      GET_LOCAL, 1,
      INT32, 1, 0, 0, 0,
      PLUS,
      SET_LOCAL, 1,

      GET_LOCAL, 1,
      INT32, 0xe8, 3, 0, 0,
      EQUAL,
      IF,
        GET_LOCAL, 0,
        RETURN,
      END,
    END,
  };

  auto machine = Machine();
  Value result = machine.eval(code.data());

  std::cout << result.data.INT32 << std::endl;

  return 0;
}
