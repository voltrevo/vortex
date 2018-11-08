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

      void push(Value v) { calc.push(v); }

      Value pop() {
        auto v = calc.top();
        calc.pop();
        return v;
      }
    };

    stack<Context> cc;

    class Decoder {
      byte* pos;

    public:
      Decoder(byte* init) { pos = init; }

      Code get() { return (Code)(*pos++); };
      byte getByte() { return *pos++; }

      Value getValue(Code type) {
        switch (type) {
          case NULL_: {
            return Value();
          }

          case BOOL: {
            switch (getByte()) {
              case byte(0): {
                return Value(false);
              }

              case byte(1): {
                return Value(true);
              }

              default: throw InternalError();
            }
          }

          case INT32: {
            auto v = *(int*)(pos);
            pos += 4;
            return Value(v);
          }

          case FLOAT64: {
            auto v = *(double*)(pos);
            pos += 8;
            return Value(v);
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
    }
  };

  public:
    Machine() {
      cc.push(Context());
    }

    void process(byte* code) {
      auto pos = Decoder(code);
      Context& ctx = cc.top();

      while (true) {
        auto instr = pos.get();

        switch (GetClass(instr)) {
          case SPECIAL: {
            if (instr == END) {
              return;
            }

            throw InternalError();
          }

          case TOP_TYPE: {
            ctx.calc.push(pos.getValue(instr));
            break;
          }

          case BINARY_OPERATOR: {
            Value right = ctx.pop();
            Value left = ctx.pop();

            Value res = BinaryOperator(left, right, instr);

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
