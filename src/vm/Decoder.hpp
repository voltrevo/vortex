#pragma once

#include <ostream>
#include <string>

#include <immer/flex_vector.hpp>
#include <immer/flex_vector_transient.hpp>

#include "Value.hpp"

namespace Vortex {
  class Decoder {
  private:
    Func func;
    Func::iterator pos;

  public:
    Decoder(Func init) {
      func = init;
      pos = func.begin();
    }

    Code get() { return (Code)(*pos++); };
    byte getByte() { return *pos++; }

    int location() { return pos - func.begin(); }

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

            case UINT8:
            case INT8: {
              pos += 1;
              return;
            }

            case UINT16:
            case INT16: {
              pos += 2;
              return;
            }

            case UINT32:
            case INT32:
            case FLOAT32: {
              pos += 4;
              return;
            }

            case UINT64:
            case INT64:
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

            case FLOAT8:
            case FLOAT16:

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

        case UINT8: {
          return Value(getByte());
        }

        case UINT16: {
          unsigned short v;
          byte* vaddr = (byte*)&v;
          *vaddr++ = *pos++;
          *vaddr++ = *pos++;
          return Value(v);
        }

        case UINT32: {
          unsigned int v;
          byte* vaddr = (byte*)&v;
          *vaddr++ = *pos++;
          *vaddr++ = *pos++;
          *vaddr++ = *pos++;
          *vaddr++ = *pos++;
          return Value(v);
        }

        case UINT64: {
          unsigned long v;
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

        case INT8: {
          return Value((char)getByte());
        }

        case INT16: {
          short v;
          byte* vaddr = (byte*)&v;
          *vaddr++ = *pos++;
          *vaddr++ = *pos++;
          return Value(v);
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

        case INT64: {
          long v;
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

        case FLOAT32: {
          float v;
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
          auto items = Array().transient();

          while (true) {
            auto itemType = get();

            switch (itemType) {
              case END: {
                return Value(new Array(items.persistent()));
              }

              default: {
                items.push_back(getValue(itemType));
                continue;
              }
            }
          }
        }

        case OBJECT: {
          auto items = new Value::Object();

          while (true) {
            auto keyType = get();

            switch (keyType) {
              case END: {
                return Value(items);
              }

              case STRING: {
                Value key = getValue(STRING);
                items->insert(std::make_pair(*key.data.STRING, getValue(get())));
                continue;
              }

              default: {
                throw TypeError();
              }
            }
          }
        }

        case STRING: {
          auto start = pos;

          while (*pos != END) {
            pos++;
          }

          auto res = Value(new String(start, pos));
          pos++;

          return res;
        }

        case FLOAT8:
        case FLOAT16:

        case VSET:
          throw NotImplementedError();

        case FUNC: {
          auto start = pos;

          while (true) {
            auto instr = get();

            if (instr == END) {
              auto startIdx = start - func.begin();
              auto len = pos - start;
              return Value(new Func(func.drop(startIdx).take(len)));
            }

            skip(instr);
          }
        }

        default:
          throw InternalError();
      }
    }

    void disassemble(std::ostream& os, std::string indent, Code code) {
      switch (GetClass(code)) {
        case SPECIAL: {
          if (code == GFUNC) {
            // TODO: Deduplicate with loop, if
            // TODO: Move disassemble to its own file
            os << "gfunc " << (int)get() << " {" << std::endl;

            std::string nextIndent = indent + "  ";

            while (true) {
              auto instr = get();

              if (instr == END) {
                break;
              }

              disassemble(os, nextIndent, instr);
            }

            os << indent << "}" << std::endl;
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
            os << "func {" << std::endl;

            std::string nextIndent = indent + "  ";

            while (true) {
              auto instr = get();

              if (instr == END) {
                break;
              }

              disassemble(os, nextIndent, instr);
            }

            os << indent << "}" << std::endl;
          } else {
            auto v = getValue(code);
            os << indent << v << std::endl;
          }

          return;
        }

        case BINARY_OPERATOR: {
          os << indent;

          switch (code) {
            case EQUAL: os << "==" << std::endl; return;
            case NOT_EQUAL: os << "!=" << std::endl; return;
            case AND: os << "&&" << std::endl; return;
            case OR: os << "||" << std::endl; return;

            case LESS: os << "<" << std::endl; return;
            case GREATER: os << ">" << std::endl; return;
            case LESS_EQ: os << "<=" << std::endl; return;
            case GREATER_EQ: os << ">=" << std::endl; return;

            case PLUS: os << "+" << std::endl; return;
            case MINUS: os << "-" << std::endl; return;
            case MULTIPLY: os << "*" << std::endl; return;
            case DIVIDE: os << "/" << std::endl; return;
            case MODULUS: os << "%" << std::endl; return;
            case POWER: os << "**" << std::endl; return;

            case LEFT_SHIFT: os << "<<" << std::endl; return;
            case RIGHT_SHIFT: os << ">>" << std::endl; return;

            case INTERSECT: os << "&" << std::endl; return;
            case EX_UNION: os << "^" << std::endl; return;
            case UNION: os << "|" << std::endl; return;

            case CONCAT: os << "++" << std::endl; return;
            case PUSH_BACK: os << "push-back" << std::endl; return;
            case PUSH_FRONT: os << "push-front" << std::endl; return;

            case INDEX: os << "index" << std::endl; return;
            case HAS_INDEX: os << "has-index" << std::endl; return;

            case CAPTURE: os << "capture" << std::endl; return;

            default: throw InternalError();
          }
        }

        case UNARY_OPERATOR: {
          os << indent;

          switch (code) {
            case NEGATE: os << "negate" << std::endl; return;
            case BIT_NEGATE: os << "~" << std::endl; return;
            case NOT: os << "!" << std::endl; return;
            case INC: os << "inc" << std::endl; return;
            case DEC: os << "dec" << std::endl; return;
            case LENGTH: os << "length" << std::endl; return;

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

          os << (int)getByte() << std::endl;
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

              os << std::endl;

              std::string nextIndent = indent + "  ";

              while (true) {
                auto instr = get();

                if (instr == END) {
                  break;
                }

                disassemble(os, nextIndent, instr);
              }

              os << indent << "}" << std::endl;
              return;
            }

            case GCALL: os << "gcall" << std::endl; return;
            case CALL: os << "call" << std::endl; return;
            case RETURN: os << "return" << std::endl; return;
            case EMIT: os << "emit" << std::endl; return;
            case BREAK: os << "break" << std::endl; return;
            case CONTINUE: os << "continue" << std::endl; return;

            default:
              throw InternalError();
          }
        }
      }
    }
  };
}
