#include <iostream>
#include <vector>

#include "Decoder.hpp"
#include "Machine.hpp"

int main() {
  using namespace Vortex;

  std::vector<std::pair<std::string, std::deque<byte>>> programs = {
    {"basic-arithmetic", {
      // sum := 3 * 5 + 1;
      // return sum + sum + sum;
      INT32, 3, 0, 0, 0,
      INT32, 5, 0, 0, 0,
      MULTIPLY,
      INT32, 1, 0, 0, 0,
      PLUS,
      SET, 0,
      GET, 0,
      GET, 0,
      GET, 0,
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
      SET, 0,

      INT32, 7, 0, 0, 0,
      INT32, 10, 0, 0, 0,
      LESS,
      IF,
        GET, 0,
        INT32, 20, 0, 0, 0,
        PLUS,
        SET, 0,
      END,

      GET, 0,
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
      SET, 0,

      INT32, 1, 0, 0, 0,
      SET, 1,

      LOOP,
        GET, 0,
        GET, 1,
        PLUS,
        SET, 0,

        GET, 1,
        INT32, 4, 0, 0, 0,
        EQUAL,
        IF,
          BREAK,
        END,

        GET, 1,
        INT32, 1, 0, 0, 0,
        PLUS,
        SET, 1,
      END,

      GET, 0,
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
      SET, 0,

      INT32, 1, 0, 0, 0,
      SET, 1,

      LOOP,
        GET, 1,
        INT32, 3, 0, 0, 0,
        MODULUS,
        INT32, 0, 0, 0, 0,
        EQUAL,
        GET, 1,
        INT32, 5, 0, 0, 0,
        MODULUS,
        INT32, 0, 0, 0, 0,
        EQUAL,
        OR,
        IF,
          GET, 0,
          GET, 1,
          PLUS,
          SET, 0,
        END,

        GET, 1,
        INT32, 1, 0, 0, 0,
        PLUS,
        SET, 1,

        GET, 1,
        INT32, 232, 3, 0, 0,
        EQUAL,
        IF,
          GET, 0,
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
        97, 98, 99, 100, 101,
      END,
      LENGTH,
      PLUS,
      RETURN,
    }},
    {"index", {
      ARRAY,
        INT32, 3, 0, 0, 0,
        INT32, 1, 0, 0, 0,
        INT32, 4, 0, 0, 0,
      END,
      INT32, 2, 0, 0, 0,
      INDEX,
      STRING,
        97, 98, 99, 100, 101,
      END,
      INT32, 3, 0, 0, 0,
      INDEX,
      PLUS,
      RETURN,
    }},
    {"has-index", {
      ARRAY,
        INT32, 3, 0, 0, 0,
        INT32, 1, 0, 0, 0,
        INT32, 4, 0, 0, 0,
      END,
      SET, 0,

      ARRAY, END,

      GET, 0,
      INT32, 0, 0, 0, 0,
      HAS_INDEX,
      PUSH_BACK,

      GET, 0,
      INT32, 1, 0, 0, 0,
      HAS_INDEX,
      PUSH_BACK,

      GET, 0,
      INT32, 2, 0, 0, 0,
      HAS_INDEX,
      PUSH_BACK,

      GET, 0,
      INT32, 3, 0, 0, 0,
      HAS_INDEX,
      PUSH_BACK,

      GET, 0,
      INT32, 4, 0, 0, 0,
      HAS_INDEX,
      PUSH_BACK,

      GET, 0,
      INT32, 255, 255, 255, 255,
      HAS_INDEX,
      PUSH_BACK,

      RETURN,
    }},
    {"objects", {
      ARRAY, END,

      OBJECT,
        STRING, END, BOOL, 1,
        STRING, 97, END, INT32, 0, 1, 0, 0,
        STRING, 98, END, ARRAY,
          BOOL, 0,
          BOOL, 1,
          BOOL, 0,
        END,
      END,
      SET, 0,

      GET, 0,
      STRING, END,
      INDEX,
      PUSH_BACK,

      GET, 0,
      PUSH_BACK,

      GET, 0,
      STRING, 98, END,
      INDEX,
      PUSH_BACK,

      RETURN,
    }},
  };

  for (auto& [name, program]: programs) {
    try {
      std::cout << name << ":" << std::endl;

      auto decoder = Decoder(program.begin());
      decoder.disassemble(std::cout, "  ", PROGRAM);
      std::cout << std::endl;

      auto machine = Machine();
      Value result = machine.eval(program.begin());
      std::cout << "  output: " << result << std::endl;
    } catch (const std::exception& e) {
      std::cout << name << " threw " << e.what() << std::endl;
    } catch (...) {
      std::cout << name << " threw... huh?" << std::endl;
    }

    std::cout << std::endl << std::endl;
  }

  return 0;
}
