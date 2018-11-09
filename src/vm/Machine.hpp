#include <cassert>
#include <deque>
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
      deque<Value> calc;

      void push(Value v) { calc.push_back(move(v)); }

      Value pop() {
        assert(!calc.empty());
        auto v = move(calc.back());
        calc.pop_back();
        return v;
      }

      pair<Value*, Value*> BackPair() {
        assert(calc.size() >= 2);
        auto iter = calc.end();
        Value* right = &*(--iter);
        Value* left = &*(--iter);
        return make_pair(left, right);
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

        locals[i] = move(v);
      }
    };

    deque<Context> cc;

  public:
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

              case ARRAY:
              case OBJECT: {
                // TODO: Deduplicate with IF, LOOP
                while (true) {
                  auto instr = get();

                  if (instr == END) {
                    return;
                  }

                  skip(instr);
                }
              }

              case STRING: {
                while (true) {
                  auto b = getByte();

                  if (b == 0) {
                    return;
                  }
                }
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
            return Value(Value::null());
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

          case ARRAY: {
            auto items = new deque<Value>();

            while (true) {
              auto itemType = get();

              switch (itemType) {
                case END: {
                  return Value(items);
                }

                default: {
                  items->push_back(getValue(itemType));
                  continue;
                }
              }
            }
          }

          case OBJECT: {
            auto items = new map<deque<char>, Value>();

            while (true) {
              auto keyType = get();

              switch (keyType) {
                case END: {
                  return Value(items);
                }

                case STRING: {
                  Value key = getValue(STRING);
                  items->insert(make_pair(*key.data.STRING, getValue(get())));
                  continue;
                }

                default: {
                  throw TypeError();
                }
              }
            }
          }

          case STRING: {
            auto items = new deque<char>();

            while (true) {
              auto b = getByte();

              switch (b) {
                case 0: {
                  return Value(items);
                }

                default: {
                  items->push_back(b);
                  continue;
                }
              }
            }
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

          case SET:
          case FUNC:
            throw NotImplementedError();

          default:
            throw InternalError();
        }
      }

      void disassemble(ostream& os, string indent, Code code) {
        switch (GetClass(code)) {
          case SPECIAL: {
            if (code != PROGRAM) {
              throw InternalError();
            }

            while (true) {
              auto instr = get();

              if (instr == END) {
                return;
              }

              disassemble(os, indent, instr);
            }
          }

          case TOP_TYPE: {
            auto v = getValue(code);
            os << indent << v << endl;
            return;
          }

          case BINARY_OPERATOR: {
            os << indent;

            switch (code) {
              case EQUAL: os << "==" << endl; return;
              case NOT_EQUAL: os << "!=" << endl; return;
              case AND: os << "&&" << endl; return;
              case OR: os << "||" << endl; return;

              case LESS: os << "<" << endl; return;
              case GREATER: os << ">" << endl; return;
              case LESS_EQ: os << "<=" << endl; return;
              case GREATER_EQ: os << ">=" << endl; return;

              case PLUS: os << "+" << endl; return;
              case MINUS: os << "+" << endl; return;
              case MULTIPLY: os << "*" << endl; return;
              case DIVIDE: os << "/" << endl; return;
              case MODULUS: os << "%" << endl; return;
              case POWER: os << "**" << endl; return;

              case LEFT_SHIFT: os << "<<" << endl; return;
              case RIGHT_SHIFT: os << ">>" << endl; return;

              case INTERSECT: os << "&" << endl; return;
              case EX_UNION: os << "^" << endl; return;
              case UNION: os << "|" << endl; return;

              case CONCAT: os << "++" << endl; return;
              case PUSH_BACK: os << "push-back" << endl; return;
              case PUSH_FRONT: os << "push-front" << endl; return;

              case INDEX: os << "index" << endl; return;
              case HAS_INDEX: os << "has-index" << endl; return;

              default: throw InternalError();
            }
          }

          case UNARY_OPERATOR: {
            os << indent;

            switch (code) {
              case NEGATE: os << "negate" << endl; return;
              case BIT_NEGATE: os << "~" << endl; return;
              case NOT: os << "!" << endl; return;
              case INC: os << "inc" << endl; return;
              case DEC: os << "dec" << endl; return;
              case LENGTH: os << "length" << endl; return;

              default: throw InternalError();
            }
          }

          case SCOPE: {
            os << indent;

            switch (code) {
              case GET_LOCAL: os << "get-local "; break;
              case SET_LOCAL: os << "set-local "; break;
              case GET_ARGUMENT: os << "get-argument "; break;
              case GET_CAPTURE: os << "get-capture "; break;

              default: throw InternalError();
            }

            os << (int)getByte() << endl;
            return;
          }

          case CONTROL: {
            os << indent;

            switch (code) {
              case LOOP:
              case IF: {
                if (code == LOOP) {
                  os << "loop {";
                } else {
                  os << "if {";
                }

                os << endl;

                string nextIndent = indent + "  ";

                while (true) {
                  auto instr = get();

                  if (instr == END) {
                    break;
                  }

                  disassemble(os, nextIndent, instr);
                }

                os << indent << "}" << endl;
                return;
              }

              case CALL: os << "call" << endl; return;
              case RETURN: os << "return" << endl; return;
              case EMIT: os << "emit" << endl; return;
              case BREAK: os << "break" << endl; return;
              case CONTINUE: os << "continue" << endl; return;

              default:
                throw InternalError();
            }
          }
        }
      }
    };

    Decoder run(Decoder pos) {
      Context& ctx = cc.back();

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
            ctx.push(pos.getValue(instr));
            break;
          }

          case BINARY_OPERATOR: {
            auto backPair = ctx.BackPair();
            BinaryOperator(*backPair.first, *backPair.second, instr);
            ctx.calc.pop_back();
            break;
          }

          case UNARY_OPERATOR: {
            UnaryOperator(ctx.calc.back(), instr);
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

      cc.push_back(Context());
      auto pos = Decoder(code);
      pos = run(pos);

      auto instr = pos.peekBehind();

      if (instr != RETURN) {
        throw InternalError();
      }

      auto& ctx = cc.back();
      auto res = ctx.pop();

      if (ctx.calc.size() != 0) {
        throw InternalError();
      }

      cc.pop_back();

      if (cc.size() != prevSize)  {
        throw InternalError();
      }

      return res;
    }
  };
}
