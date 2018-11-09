#pragma once

#include <istream>
#include <map>
#include <optional>
#include <string>
using namespace std;

#include "Codes.hpp"
#include "Exceptions.hpp"

namespace Vortex {
  string getWord(istream& in) {
    string res;
    in >> res;
    return res;
  }

  using byte = unsigned char;

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
    //{"", SET},
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
    {"get-local", GET_LOCAL},
    {"set-local", SET_LOCAL},
    {"get-argument", GET_ARGUMENT},
    {"get-capture", GET_CAPTURE},

    // CONTROL
    {"call", CALL},
    {"return", RETURN},
    {"emit", EMIT},
    {"if", IF},
    {"loop", LOOP},
    {"break", BREAK},
    {"continue", CONTINUE},
  };

  optional<Code> lookup(string word) {
    auto pos = codeMap.find(word);

    if (pos == codeMap.end()) {
      return nullopt;
    }

    return pos->second;
  }

  int parseInt(string word) {
    int res = 0;

    for (auto c: word) {
      int digit = c - '0';

      if (digit < 0 || digit > 9) {
        throw SyntaxError();
      }

      res *= 10;
      res += digit;
    }

    return res;
  }

  byte parseByteNumber(string word) {
    int res = parseInt(word);

    if (res > 255) {
      throw BadIndexError();
    }

    return res;
  }

  void assemble(istream& in, ostream& out) {
    auto get = [&]() { return getWord(in); };

    while (true) {
      auto word = get();

      if (in.eof()) {
        break;
      }

      auto code = lookup(word);

      if (code) {
        out.put(*code);

        switch (*code) {
          case LOOP:
          case IF: {
            auto next = get();

            if (next != "{") {
              throw new SyntaxError();
            }

            break;
          }

          case GET_LOCAL:
          case SET_LOCAL:
          case GET_ARGUMENT:
          case GET_CAPTURE: {
            byte b = parseByteNumber(get());
            out.put(b);
            break;
          }

          default:
            break;
        }
      } else {
        if ('0' <= word[0] && word[0] <= '9') {
          int num = parseInt(word);
          out.put(INT32);
          out.write((char*)&num, 4);
        }
      }
    }
  }
}
