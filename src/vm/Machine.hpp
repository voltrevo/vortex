#pragma once

#include <cassert>
#include <deque>
#include <iostream>
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
          throw InternalError("Local variable does not exist");
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
        throw InternalError("Global function does not exist");
      }

      return gfuncs[i];
    }

    void setGFunc(byte i, Decoder decoder) {
      while (i > gfuncs.size()) {
        gfuncs.push_back(Decoder(Func()));
      }

      if (i < gfuncs.size()) {
        gfuncs[i] = std::move(decoder);
      } else {
        gfuncs.push_back(std::move(decoder));
      }
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
        int location = pos.location();
        auto instr = pos.get();

        try {
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

                case DUP: {
                  calc.push_back(calc.back());
                  break;
                }

                case SWAP: {
                  auto backPair = BackPair();
                  swap(*backPair.first, *backPair.second);
                  break;
                }

                case ASSERT: {
                  const Value& back = calc.back();

                  if (back.type != BOOL) {
                    throw TypeError("Asserted non-bool");
                  }

                  if (back.data.BOOL == false) {
                    // TODO: Should this be internal error?
                    throw InternalError("Asserted false");
                  }

                  calc.pop_back();
                  break;
                }

                default:
                  throw InternalError("Unrecognized SPECIAL instruction");
              }

              break;
            }

            case TOP_TYPE: {
              push(pos.getValue(instr));
              break;
            }

            case TERNARY_OPERATOR: {
              assert(calc.size() >= 3);
              auto iter = calc.end();
              Value* right = &*(--iter);
              Value* middle = &*(--iter);
              Value* left = &*(--iter);

              TernaryOperator(*left, *middle, *right, instr);

              calc.pop_back();
              calc.pop_back();
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
                  throw InternalError("Unrecognized SCOPE instruction");
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
                    throw TypeError("Non-bool condition");
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
                        throw InternalError("Unexpected instruction before if exit");
                    }
                  } else {
                    pos.skip(IF);

                    if (pos.peek() == ELSE) {
                      pos.get();
                      pos = run(pos);

                      // TODO: Dedupe with if
                      switch (pos.peekBehind()) {
                        case RETURN:
                        case BREAK:
                        case CONTINUE: {
                          return pos;
                        }

                        case END: {
                          break;
                        }

                        default: {
                          throw InternalError(
                            "Unexpected instruction before else exit"
                          );
                        }
                      }
                    }
                  }

                  break;
                }

                case ELSE: {
                  pos.skip(ELSE);
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
                        throw InternalError("Unexpected instruction before loop exit");
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
                    throw TypeError("Attempt to call non-function");
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
                  throw NotImplementedError("emit instruction");

                default:
                  throw InternalError("Unrecognized CONTROL instruction");
              }

              break;
            }
          }
        }
        catch (...) {
          std::cerr << "Threw exception at location " << location << std::endl;
          throw;
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
        throw InternalError("Unexpected instruction before eval completion");
      }

      auto res = pop();

      if (calc.size() != 0) {
        throw InternalError("Excess values left on stack");
      }

      cc.pop_back();

      if (cc.size() != prevSize)  {
        throw InternalError("Context stack length does not match eval start");
      }

      return res;
    }
  };
}
