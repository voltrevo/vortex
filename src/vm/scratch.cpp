#include <iostream>
#include <vector>

#include "Machine.hpp"
using namespace Vortex;

int main() {
  vector<pair<string, vector<byte>>> programs = {
    {"basic-arithmetic", {
      // sum := 3 * 5 + 1;
      // return sum + sum + sum;
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
    }},
    {"if-test", {
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
    }},
    {"sum-1-to-4", {
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
    }},
    {"project-euler-1", {
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
        INT32, 232, 3, 0, 0,
        EQUAL,
        IF,
          GET_LOCAL, 0,
          RETURN,
        END,
      END,
    }},
    {"array-literal", {
      // return [null];
      ARRAY,
        NULL_,
        NULL_,
        BOOL, 1,
        INT32, 0, 1, 0, 0,
      END,
      RETURN,
    }},
    {"array-of-arrays", {
      // return [[1, 2], [3, 4]];
      ARRAY,
        ARRAY,
          INT32, 1, 0, 0, 0,
          INT32, 2, 0, 0, 0,
        END,
        ARRAY,
          INT32, 3, 0, 0, 0,
          INT32, 4, 0, 0, 0,
        END,
      END,
      RETURN,
    }},
    {"concat", {
      // return [1, 2] ++ [3, 4];
      ARRAY,
        INT32, 1, 0, 0, 0,
        INT32, 2, 0, 0, 0,
      END,
      ARRAY,
        INT32, 3, 0, 0, 0,
        INT32, 4, 0, 0, 0,
      END,
      ARRAY,
        INT32, 5, 0, 0, 0,
        INT32, 6, 0, 0, 0,
      END,
      CONCAT,
      CONCAT,
      RETURN,
    }},
    {"more-array-stuff", {
      ARRAY,
      END,
      BOOL, 0,
      PUSH_BACK,
      ARRAY, END,
      PUSH_BACK,
      INT32, 0, 1, 0, 0,
      PUSH_FRONT,
      RETURN,
    }},
    {"hello-world", {
      STRING,
        72, 101, 108, 108, 111, 32, // 'Hello '
      END,
      STRING,
        119, 111, 114, 108, 100, 33, // 'world!'
      END,
      CONCAT,
      RETURN,
    }},
    {"length", {
      ARRAY,
        INT32, 3, 0, 0, 0,
        INT32, 1, 0, 0, 0,
        INT32, 4, 0, 0, 0,
      END,
      LENGTH,
      STRING,
        1, 2, 3, 4, 5,
      END,
      LENGTH,
      PLUS,
      RETURN,
    }},
  };

  for (auto& [name, program]: programs) {
    try {
      auto machine = Machine();
      Value result = machine.eval(program.data());
      cout << name << ": " << result << endl;
    } catch (const exception& e) {
      cout << name << " threw " << e.what() << endl;
    } catch (...) {
      cout << name << " threw... huh?" << endl;
    }
  }

  return 0;
}
