#pragma once

#include <deque>

#include "Value.hpp"

namespace Vortex {
  class Decoder {
    deque<byte>::iterator start;
    deque<byte>::iterator pos;

  public:
    Decoder(deque<byte>::iterator init) { start = pos = init; }

    Code get() { return (Code)(*pos++); };
    byte getByte() { return *pos++; }

    int location() { return pos - start; }

    Code peekBehind() { return (Code)(*(pos - 1)); }

    void prev() { pos--; }

    void skip(Code code) {
      switch (GetClass(code)) {
        case SPECIAL: {
          if (code == GFUNC) {
            get();

            // TODO: Deduplication
            while (true) {
              auto instr = get();

              if (instr == END) {
                return;
              }

              skip(instr);
            }

            break;
          }

          if (code == END) {
            break;
          }

          throw InternalError();
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

            case VSET:
              throw NotImplementedError();

            case FUNC: {
              // TODO: Deduplication
              while (true) {
                auto instr = get();

                if (instr == END) {
                  return;
                }

                skip(instr);
              }
            }

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

            case GCALL: {
              get();
              return;
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
          int v;
          byte* vaddr = (byte*)&v;
          *vaddr++ = *pos++;
          *vaddr++ = *pos++;
          *vaddr++ = *pos++;
          *vaddr++ = *pos++;
          return Value(v);
        }

        case FLOAT64: {
          double v;
          byte* vaddr = (byte*)&v;
          *vaddr++ = *pos++;
          *vaddr++ = *pos++;
          *vaddr++ = *pos++;
          *vaddr++ = *pos++;
          *vaddr++ = *pos++;
          *vaddr++ = *pos++;
          *vaddr++ = *pos++;
          *vaddr++ = *pos++;
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

        case VSET:
          throw NotImplementedError();

        case FUNC: {
          auto start = pos;

          while (true) {
            auto instr = get();

            if (instr == END) {
              return Value(new deque<byte>(start, pos));
            }

            skip(instr);
          }
        }

        default:
          throw InternalError();
      }
    }

    void disassemble(ostream& os, string indent, Code code) {
      switch (GetClass(code)) {
        case SPECIAL: {
          if (code == GFUNC) {
            // TODO: Deduplicate with loop, if
            // TODO: Move disassemble to its own file
            os << "gfunc " << (int)get() << " {" << endl;

            string nextIndent = indent + "  ";

            while (true) {
              auto instr = get();

              if (instr == END) {
                break;
              }

              disassemble(os, nextIndent, instr);
            }

            os << indent << "}" << endl;
            break;
          }

          if (code == PROGRAM) {
            while (true) {
              auto instr = get();

              if (instr == END) {
                return;
              }

              disassemble(os, indent, instr);
            }

            break;
          }

          throw InternalError();
        }

        case TOP_TYPE: {
          if (code == FUNC) {
            // TODO: Deduplicate with loop, if
            // TODO: Move disassemble to its own file
            os << "func {" << endl;

            string nextIndent = indent + "  ";

            while (true) {
              auto instr = get();

              if (instr == END) {
                break;
              }

              disassemble(os, nextIndent, instr);
            }

            os << indent << "}" << endl;
          } else {
            auto v = getValue(code);
            os << indent << v << endl;
          }

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
            case MINUS: os << "-" << endl; return;
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

            case CAPTURE: os << "capture" << endl; return;

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
            case GET: os << "get "; break;
            case SET: os << "set "; break;

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

            case GCALL: os << "gcall" << endl; return;
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
}
