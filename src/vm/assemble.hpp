#pragma once

#include <map>
#include <string>

#include "Codes.hpp"
#include "Value.hpp"

namespace Vortex {
  std::map<std::string, Code> codeMap = {
    // SPECIAL
    {"}", END},
    //{"", PROGRAM},
    {"gfunc", GFUNC},
    //{"", INVALID},
    {"dup", DUP},
    {"swap", SWAP},
    {"assert", ASSERT},

    // TOP_TYPE
    //{"", NULL_},
    //{"", BOOL},

    //{"", UINT8},
    //{"", UINT16},
    //{"", UINT32},
    //{"", UINT64},

    //{"", INT8},
    //{"", INT16},
    //{"", INT32},
    //{"", INT64},

    //{"", FLOAT8},
    //{"", FLOAT16},
    //{"", FLOAT32},
    //{"", FLOAT64},

    //{"", STRING},
    //{"", ARRAY},
    //{"", OBJECT},
    //{"", VSET},
    {"func", FUNC},

    // TERNARY_OPERATOR
    {"update", UPDATE},
    {"insert", INSERT},

    // BINARY_OPERATOR
    {"==", EQUAL},
    {"!=", NOT_EQUAL},
    {"&&", AND},
    {"||", OR},

    {"<", LESS},
    {">", GREATER},
    {"<=", LESS_EQ},
    {">=", GREATER_EQ},

    {"+", PLUS},
    {"-", MINUS},
    {"*", MULTIPLY},
    {"/", DIVIDE},
    {"%", MODULUS},
    {"**", POWER},

    {"<<", LEFT_SHIFT},
    {">>", RIGHT_SHIFT},

    {"&", INTERSECT},
    {"^", EX_UNION},
    {"|", UNION},

    {"++", CONCAT},
    {"pushBack", PUSH_BACK},
    {"pushFront", PUSH_FRONT},

    {"at", AT},
    {"hasIndex", HAS_INDEX},

    {"capture", CAPTURE},

    // UNARY_OPERATOR
    {"negate", NEGATE},
    {"~", BIT_NEGATE},
    {"!", NOT},
    {"inc", INC},
    {"dec", DEC},
    {"length", LENGTH},

    // SCOPE
    {"get", GET},
    {"set", SET},

    // CONTROL
    {"gcall", GCALL},
    {"call", CALL},
    {"return", RETURN},
    {"emit", EMIT},
    {"if", IF},
    {"else", ELSE},
    {"loop", LOOP},
    {"break", BREAK},
    {"continue", CONTINUE},
  };

  int parseInt(std::istream& in) {
    int res = 0;
    bool negative = false;

    char c = in.peek();

    if (c == '-') {
      negative = true;
      in.get();
    }

    while (true) {
      c = in.peek();

      if (in.eof()) {
        break;
      }

      int digit = c - '0';

      if (digit < 0 || digit > 9) {
        break;
      }

      res *= 10;
      res += digit;
      in.get();
    }

    if (negative) {
      res = -res;
    }

    return res;
  }

  byte parseByteNumber(std::istream& in) {
    int res = parseInt(in);

    if (res > 255) {
      throw BadIndexError("Parsed byte greater than 255");
    }

    return res;
  }

  void skipWhitespace(std::istream& in) {
    while (true) {
      char c = in.peek();

      if (in.eof()) {
        return;
      }

      if (c == ' ' || c == '\n' || c == '\t' || c == '\r') {
        in.get();
        continue;
      }

      break;
    }
  }

  void parse(std::istream& in, std::ostream& out) {
    skipWhitespace(in);
    char c = in.peek();

    if (in.eof()) {
      return;
    }

    if (('0' <= c && c <= '9') || c == '-') {
      bool negative = (c == '-');
      int res;

      if (negative) {
        in.get();

        c = in.peek();

        if ('0' <= c && c <= '9') {
          res = -parseInt(in);
        } else {
          out.put(MINUS);
          return;
        }
      } else {
        res = parseInt(in);
      }

      c = in.peek();

      if (c == 'i' || c == 'u') {
        bool isSigned = (c == 'i');
        in.get();
        c = in.peek();

        // TODO: Syntax error for out of range literals
        if (c == '8') {
          in.get();
          out.put(isSigned ? INT8 : UINT8);
          out.write((char*)&res, 1);
          return;
        }

        if (c == '1') {
          in.get();

          if (in.get() != '6') {
            throw SyntaxError("6 expected");
          }

          out.put(isSigned ? INT16 : UINT16);
          out.write((char*)&res, 2);
          return;
        }

        if (c == '3') {
          in.get();

          if (in.get() != '2') {
            throw SyntaxError("2 expected");
          }

          out.put(isSigned ? INT32 : UINT32);
          out.write((char*)&res, 4);
          return;
        }

        if (c == '6') {
          in.get();

          // TODO: Currently can only handle 64 bit literals in i32 range
          if (in.get() != '4') {
            throw SyntaxError("4 expected");
          }

          out.put(isSigned ? INT64 : UINT64);
          long resl = res;
          out.write((char*)&resl, 8);
          return;
        }

        if (isSigned) {
          throw SyntaxError("8, 3, or 6 expected");
        }

        out.put(UINT32);
        out.write((char*)&res, 4);
        return;
      } else if (c == 'f') {
        // TODO: Currently only handling float literals in i32 range
        in.get();
        c = in.get();

        if (c == '3') {
          if (in.get() != '2') {
            throw SyntaxError("2 expected");
          }

          out.put(FLOAT32);
          float resf = res;
          out.write((char*)&resf, 4);
          return;
        }

        if (c == '6') {
          if (in.get() != '4') {
            throw SyntaxError("4 expected");
          }

          out.put(FLOAT64);
          double resd = res;
          out.write((char*)&resd, 8);
          return;
        }
      } else if (c == '.') {
        in.get();
        c = in.peek();

        double resd = res;
        double mul = negative ? -0.1 : 0.1;

        if (!('0' <= c && c <= '9')) {
          throw SyntaxError("0-9 expected");
        }

        while ('0' <= c && c <= '9') {
          resd += mul * (c - '0');
          mul /= 10;
          in.get();
          c = in.peek();
        }

        if (c == 'f') {
          in.get();

          if (in.get() == '3') {
            if (in.get() != '2') {
              throw SyntaxError("2 expected");
            }

            float resf = resd;
            out.put(FLOAT32);
            out.write((char*)&resf, 4);
            return;
          }

          if (in.get() == '6') {
            if (in.get() != '4') {
              throw SyntaxError("4 expected");
            }

            out.put(FLOAT64);
            out.write((char*)&resd, 8);
            return;
          }

          throw SyntaxError("3 or 6 expected");
        }

        out.put(FLOAT64);
        out.write((char*)&resd, 8);
        return;
      }

      out.put(INT32);
      out.write((char*)&res, 4);
      return;
    }

    if (c == '[') {
      out.put(ARRAY);
      in.get();

      while (true) {
        skipWhitespace(in);

        c = in.peek();

        if (c == ']') {
          in.get();
          break;
        }

        parse(in, out);

        skipWhitespace(in);
        c = in.peek();

        if (c == ',') {
          in.get();
          continue;
        }

        if (c == ']') {
          continue;
        }

        throw SyntaxError(", or ] expected");
      }

      out.put(END);
      return;
    }

    if (c == '\'') {
      out.put(STRING);
      in.get();

      while (true) {
        c = in.get();

        if (c == '\'') {
          break;
        }

        if (c == '\\') {
          c = in.get();

          if (c != '\'') {
            throw SyntaxError("' expected");
          }
        }

        out.put(c);
      }

      out.put(END);
      return;
    }

    if (c == '{') {
      out.put(OBJECT);
      in.get();

      while (true) {
        skipWhitespace(in);

        c = in.peek();

        if (c == '}') {
          in.get();
          break;
        }

        if (c != '\'') {
          // TODO: Actually, need to preferentially parse identifiers here
          throw SyntaxError("' expected");
        }

        parse(in, out);

        skipWhitespace(in);
        c = in.get();

        if (c != ':') {
          throw SyntaxError(": expected");
        }

        parse(in, out);

        c = in.peek();

        if (c == ',') {
          in.get();
          continue;
        }

        if (c == '}') {
          continue;
        }

        throw SyntaxError(", or } expected");
      }

      out.put(END);
      return;
    }

    if (c == '}') {
      out.put(END);
      in.get();
      return;
    }

    skipWhitespace(in);
    std::string word;

    while (
      c != ']' && c != '}' && c != ',' &&
      c != ' ' && c != '\n' && c != '\r' && c != '\t'
    ) {
      word += in.get();
      c = in.peek();
    }

    if (word == "true") {
      out.put(BOOL);
      out.put(1);
      return;
    }

    if (word == "false") {
      out.put(BOOL);
      out.put(0);
      return;
    }

    if (word == "null") {
      out.put(NULL_);
      return;
    }

    auto pos = codeMap.find(word);

    if (pos == codeMap.end()) {
      throw SyntaxError("Unrecognized word");
    }

    Code code = pos->second;
    out.put(code);

    switch (code) {
      case FUNC:
      case LOOP:
      case IF:
      case ELSE: {
        skipWhitespace(in);

        if (in.get() != '{') {
          throw SyntaxError("{ expected");
        }

        break;
      }

      case GFUNC: {
        skipWhitespace(in);

        byte b = parseByteNumber(in);
        out.put(b);

        skipWhitespace(in);

        if (in.get() != '{') {
          throw SyntaxError("{ expected");
        }

        break;
      }

      case GCALL:
      case GET:
      case SET: {
        skipWhitespace(in);
        byte b = parseByteNumber(in);
        out.put(b);
        break;
      }

      default:
        break;
    }
  }

  void assemble(std::istream& in, std::ostream& out) {
    while (true) {
      parse(in, out);

      if (in.eof()) {
        return;
      }
    }
  }
}
