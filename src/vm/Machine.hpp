#include <stack>
#include <vector>
using namespace std;

#include "Codes.hpp"
#include "Exceptions.hpp"
#include "Value.hpp"

namespace Vortex {
  class Machine {
    struct Context {
      vector<Value> args;
      vector<Value> closure;
      vector<Value> locals;
      stack<Value> calc;
    };

    stack<Context> cc;

  public:
    Machine() {
      cc.push(Context());
    }

    void process(byte* code) {
      Context& ctx = cc.top();

      while (true) {
        auto b = (Code)(*code++);

        switch (GetClass(b)) {
          case SPECIAL: {
            if (b == END) {
              return;
            }

            throw InternalError();
          }

          case TOP_TYPE: {
            switch (b) {
              case NULL_: {
                ctx.calc.push(Value());
                break;
              }

              case BOOL: {
                auto encoded = (Code)(*code++);

                switch (encoded) {
                  case byte(0): {
                    ctx.calc.push(Value(false));
                    break;
                  }

                  case byte(1): {
                    ctx.calc.push(Value(true));
                    break;
                  }

                  default: throw InternalError();
                }

                break;
              }

              case INT32: {
                auto v = *(int*)(code);
                code += 4;
                ctx.calc.push(Value(v));
                break;
              }

              case FLOAT64: {
                auto v = *(double*)(code);
                code += 8;
                ctx.calc.push(Value(v));
                break;
              }

              case UINT8:
              case UINT16:
              case UINT32:
              case UINT64:

              case INT8:
              case INT16:
              case INT64:

              case FLOAT8:
              case FLOAT16:
              case FLOAT32:

              case STRING:
              case ARRAY:
              case OBJECT:
              case SET:
              case FUNC:
                throw NotImplementedError();

              default: throw InternalError();
            }

            break;
          }

          case BINARY_OPERATOR: {
            Value right = ctx.calc.top();
            ctx.calc.pop();

            Value left = ctx.calc.top();
            ctx.calc.pop();

            Value res = BinaryOperator(left, right, b);
            ctx.calc.push(res);

            break;
          }

          case UNARY_OPERATOR:
          case SCOPE:
          case CONTROL:
            throw NotImplementedError();
        }
      }
    }

    Value top() {
      return cc.top().calc.top();
    }
  };
}
