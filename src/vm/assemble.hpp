#pragma once

#include "Codes.hpp"
#include "Value.hpp"

namespace Vortex {
  map<string, Code> codeMap = {
    // SPECIAL
    {"}", END},
    //{"", PROGRAM},
    //{"", INVALID},

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
    //{"", FUNC},

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
    {"push-back", PUSH_BACK},
    {"push-front", PUSH_FRONT},

    {"index", INDEX},
    {"has-index", HAS_INDEX},

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
    {"call", CALL},
    {"return", RETURN},
    {"emit", EMIT},
    {"if", IF},
    {"loop", LOOP},
    {"break", BREAK},
    {"continue", CONTINUE},
  };

  int parseInt(istream& in) {
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

  byte parseByteNumber(istream& in) {
    int res = parseInt(in);

    if (res > 255) {
      throw BadIndexError();
    }

    return res;
  }

  void skipWhitespace(istream& in) {
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

  void parse(istream& in, ostream& out) {
    skipWhitespace(in);
    char c = in.peek();

    if (in.eof()) {
      return;
    }

    if (('0' <= c && c <= '9') || c == '-') {
      int res = parseInt(in);
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

        throw SyntaxError();
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
            throw SyntaxError();
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
          throw SyntaxError();
        }

        parse(in, out);

        skipWhitespace(in);
        c = in.get();

        if (c != ':') {
          throw SyntaxError();
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

        throw SyntaxError();
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
    string word;

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
      throw SyntaxError();
    }

    Code code = pos->second;
    out.put(code);

    switch (code) {
      case LOOP:
      case IF: {
        skipWhitespace(in);

        if (in.get() != '{') {
          throw new SyntaxError();
        }

        break;
      }

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

  void assemble(istream& in, ostream& out) {
    while (true) {
      parse(in, out);

      if (in.eof()) {
        return;
      }
    }
  }
}
