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
        if (calc.empty()) {
          throw InternalError();
        }

        auto v = calc.top();
        calc.pop();
        return v;
      }

      Value getLocal(byte i) {
        if (i >= locals.size()) {
          throw InternalError();
        }

        return locals[i];
      }

      void setLocal(byte i, Value v) {
        while (i >= locals.size()) {
          locals.push_back(Value());
        }

        locals[i] = v;
      }
    };

    stack<Context> cc;

    class Decoder {
      byte* pos;

    public:
      Decoder(byte* init) { pos = init; }

      Code get() { return (Code)(*pos++); };
      byte getByte() { return *pos++; }

      Code peekBehind() { return (Code)(*(pos - 1)); }

      void prev() { pos--; }

      void skip(Code code) {
        switch (GetClass(code)) {
          case SPECIAL: {
            if (code != END) {
              throw InternalError();
            }
          }

          case TOP_TYPE: {
            switch (code) {
              case NULL_: {
                return;
              }

              case BOOL: {
                pos++;
                return;
              }

              case INT32: {
                pos += 4;
                return;
              }

              case FLOAT64: {
                pos += 8;
                return;
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

              default:
                throw InternalError();
            }
          }

          case BINARY_OPERATOR:
          case UNARY_OPERATOR: {
            return;
          }

          case SCOPE: {
            pos++;
            return;
          }

          case CONTROL: {
            switch (code) {
              case LOOP:
              case IF: {
                while (true) {
                  auto instr = get();

                  if (instr == END) {
                    return;
                  }

                  skip(instr);
                }
              }

              case CALL:
              case RETURN:
              case EMIT:
              case BREAK:
              case CONTINUE: {
                return;
              }

              default:
                throw InternalError();
            }
          }
        }
      }

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

          default:
            throw InternalError();
      }
    }
  };

  public:
    Decoder run(Decoder pos) {
      Context& ctx = cc.top();

      while (true) {
        auto instr = pos.get();

        switch (GetClass(instr)) {
          case SPECIAL: {
            switch (instr) {
              case END:
                return pos;

              default:
                throw InternalError();
            }
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

          case SCOPE: {
            switch (instr) {
              case GET_LOCAL: {
                ctx.push(ctx.getLocal(pos.getByte()));
                break;
              }

              case SET_LOCAL: {
                ctx.setLocal(pos.getByte(), ctx.pop());
                break;
              }

              case GET_ARGUMENT:
              case GET_CAPTURE:
                throw NotImplementedError();

              default:
                throw InternalError();
            }

            break;
          }

          case UNARY_OPERATOR:
            throw NotImplementedError();

          case CONTROL: {
            switch (instr) {
              case RETURN: {
                return pos;
              }

              case IF: {
                auto cond = ctx.pop();

                if (cond.type != BOOL) {
                  throw TypeError();
                }

                if (cond.data.BOOL) {
                  pos = run(pos);

                  switch (pos.peekBehind()) {
                    case RETURN:
                    case BREAK:
                    case CONTINUE: {
                      return pos;
                    }

                    case END: {
                      break;
                    }

                    default:
                      throw InternalError();
                  }
                } else {
                  pos.skip(IF);
                }

                break;
              }

              case LOOP: {
                while (true) {
                  auto nextPos = run(pos);

                  switch (nextPos.peekBehind()) {
                    case CONTINUE:
                    case END: {
                      continue;
                    }

                    case BREAK: {
                      pos.skip(LOOP);
                      break;
                    }

                    case RETURN: {
                      return nextPos;
                    }

                    default:
                      throw InternalError();
                  }

                  break;
                }

                break;
              }

              case BREAK:
              case CONTINUE: {
                return pos;
              }

              case CALL:
              case EMIT:
                throw NotImplementedError();

              default:
                throw InternalError();
            }

            break;
          }
        }
      }
    }

    Value eval(byte* code) {
      auto prevSize = cc.size();

      cc.push(Context());
      auto pos = Decoder(code);
      pos = run(pos);

      auto instr = pos.peekBehind();

      if (instr != RETURN) {
        throw InternalError();
      }

      auto& ctx = cc.top();
      auto res = ctx.pop();

      if (ctx.calc.size() != 0) {
        throw InternalError();
      }

      cc.pop();

      if (cc.size() != prevSize)  {
        throw InternalError();
      }

      return res;
    }
  };
}
