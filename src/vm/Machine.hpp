#pragma once

#include <cassert>
#include <deque>
#include <vector>

#include "Codes.hpp"
#include "Decoder.hpp"
#include "Exceptions.hpp"
#include "Value.hpp"

namespace Vortex {
  class Machine {
    struct Context {
      std::vector<Value> locals;

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

        locals[i] = std::move(v);
      }
    };

    std::deque<Value> calc;
    std::vector<Decoder> gfuncs;

    Decoder getGFunc(byte i) {
      if (i >= gfuncs.size()) {
        throw InternalError();
      }

      return gfuncs[i];
    }

    void setGFunc(byte i, Decoder decoder) {
      if (i < gfuncs.size()) {
        gfuncs[i] = decoder;
      }

      while (i + 1u < gfuncs.size()) {
        gfuncs.push_back(Decoder(Func()));
      }

      gfuncs.push_back(std::move(decoder));
    }

    void push(Value v) { calc.push_back(std::move(v)); }

    Value pop() {
      assert(!calc.empty());
      auto v = std::move(calc.back());
      calc.pop_back();
      return v;
    }

    std::pair<Value*, Value*> BackPair() {
      assert(calc.size() >= 2);
      auto iter = calc.end();
      Value* right = &*(--iter);
      Value* left = &*(--iter);
      return std::make_pair(left, right);
    }

    std::deque<Context> cc;

  public:
    Decoder run(Decoder pos) {
      Context& ctx = cc.back();

      while (true) {
        auto instr = pos.get();

        switch (GetClass(instr)) {
          case SPECIAL: {
            switch (instr) {
              case END:
                return pos;

              case GFUNC: {
                int id = pos.getByte();
                setGFunc(id, pos);
                pos.skip(FUNC);
                break;
              }

              default:
                throw InternalError();
            }

            break;
          }

          case TOP_TYPE: {
            push(pos.getValue(instr));
            break;
          }

          case BINARY_OPERATOR: {
            auto backPair = BackPair();
            BinaryOperator(*backPair.first, *backPair.second, instr);
            calc.pop_back();
            break;
          }

          case UNARY_OPERATOR: {
            UnaryOperator(calc.back(), instr);
            break;
          }

          case SCOPE: {
            switch (instr) {
              case GET: {
                push(ctx.getLocal(pos.getByte()));
                break;
              }

              case SET: {
                ctx.setLocal(pos.getByte(), pop());
                break;
              }

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
                auto cond = pop();

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

              case CALL: {
                auto func = pop();

                if (func.type != FUNC) {
                  throw TypeError();
                }

                auto funcDecoder = Decoder(*func.data.FUNC);
                // TODO: Just make context a parameter of run?
                // TODO: Use a shared stack for locals and use an offset?
                cc.push_back(Context());
                run(funcDecoder);
                cc.pop_back();

                break;
              }

              case GCALL: {
                int id = pos.getByte();

                auto funcDecoder = getGFunc(id);
                // TODO: Just make context a parameter of run?
                // TODO: Use a shared stack for locals and use an offset?
                cc.push_back(Context());
                run(funcDecoder);
                cc.pop_back();

                break;
              }

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

    Value eval(Func code) {
      auto prevSize = cc.size();

      cc.push_back(Context());
      auto pos = Decoder(code);
      pos = run(pos);

      auto instr = pos.peekBehind();

      if (instr != RETURN) {
        throw InternalError();
      }

      auto res = pop();

      if (calc.size() != 0) {
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
