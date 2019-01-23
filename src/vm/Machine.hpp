#pragma once

#include <cassert>
#include <deque>
#include <iostream>
#include <vector>

#include "Codes.hpp"
#include "Decoder.hpp"
#include "Exceptions.hpp"
#include "runBuiltInMethod.hpp"
#include "Value.hpp"

namespace Vortex {
  struct Machine {
    struct Context {
      std::vector<Value> locals;
      Value location = Value(Value::null());

      Value getLocal(byte i) {
        if (i >= locals.size()) {
          throw InternalError("Local variable does not exist");
        }

        return locals[i];
      }

      void setLocal(byte i, Value v) {
        while (i >= locals.size()) {
          locals.emplace_back();
        }

        locals[i] = std::move(v);
      }
    };

    struct MFunc {
      Decoder code;
      bool entered = false;
      bool completed = false;

      // TODO: Should be able to default construct Value, but this is a
      // workaround because MFunc gets copied and I don't know why yet
      Value result = Value(Value::null());
    };

    std::deque<Value> calc;
    std::vector<Decoder> gfuncs;
    std::vector<MFunc> mfuncs;

    Decoder getGFunc(byte i) {
      if (i >= gfuncs.size()) {
        throw InternalError("Global function does not exist");
      }

      return gfuncs[i];
    }

    void setGFunc(byte i, Decoder decoder) {
      while (i > gfuncs.size()) {
        gfuncs.emplace_back(Func());
      }

      if (i < gfuncs.size()) {
        gfuncs[i] = std::move(decoder);
      } else {
        gfuncs.push_back(std::move(decoder));
      }
    }

    void getMFuncValue(byte i) {
      if (i >= mfuncs.size()) {
        throw InternalError("Global function does not exist");
      }

      MFunc& mfunc = mfuncs[i];
      assert(mfunc.code.func.def.size() > 0ul);

      if (mfunc.entered && !mfunc.completed) {
        throw ModuleError("Infinite mfunc loop");
      }

      if (mfunc.completed) {
        calc.push_back(mfunc.result);
        return;
      }

      mfunc.entered = true;
      callDecoder(mfunc.code);
      mfunc.completed = true;

      mfunc.result = calc.back();
    }

    void setMFunc(byte i, Decoder decoder) {
      while (i > mfuncs.size()) {
        // TODO: Why does this use MFunc copy?
        // TODO: Does emplace_back() help?
        mfuncs.push_back(MFunc());
      }

      if (i < mfuncs.size()) {
        mfuncs[i] = MFunc{.code = std::move(decoder)};
      } else {
        mfuncs.push_back(MFunc{.code = std::move(decoder)});
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

                case MFUNC: {
                  int id = pos.getByte();
                  setMFunc(id, pos);
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

                case LOG_INFO: {
                  const Value& back = calc.back();

                  std::cerr << "INFO: " << back << std::endl;

                  calc.pop_back();
                  break;
                }

                case LOCATION: {
                  ctx.location = pos.getValue(pos.get());
                  break;
                }

                case DISCARD: {
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

              TernaryOperator(
                *left,
                std::move(*middle),
                std::move(*right),
                instr
              );

              calc.pop_back();
              calc.pop_back();
              break;
            }

            case BINARY_OPERATOR: {
              auto backPair = BackPair();
              BinaryOperator(*backPair.first, std::move(*backPair.second), instr);
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
                  call(pop());
                  break;
                }

                case GCALL: {
                  int id = pos.getByte();

                  auto funcDecoder = getGFunc(id);
                  // TODO: Just make context a parameter of run?
                  // TODO: Use a shared stack for locals and use an offset?
                  cc.emplace_back();
                  run(funcDecoder);
                  cc.pop_back();

                  break;
                }

                case MCALL: {
                  int id = pos.getByte();
                  getMFuncValue(id);
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
          std::cerr << "Threw exception at location " << location;

          if (ctx.location.type != NULL_) {
            std::cerr << " " << ctx.location << std::endl;
          }

          std::cerr << std::endl;

          throw;
        }
      }
    }

    void call(const Value& func) {
      callValue(func);
    }

    void callValue(const Value& func) {
      if (func.type != FUNC) {
        throw TypeError("Attempt to call non-function");
      }

      callFunc(*func.data.FUNC);
    }

    void callFunc(const Func& func) {
      for (auto i = func.binds.crbegin(); i != func.binds.crend(); ++i) {
        calc.push_back(*i);
      }

      if (func.method != BuiltInMethod::NONE) {
        runBuiltInMethod(*this, func.method);
        return;
      }

      callDecoder(Decoder(func));
    }

    void callDecoder(Decoder decoder) {
      // TODO: Just make context a parameter of run?
      // TODO: Use a shared stack for locals and use an offset?
      // TODO: Check number of arguments?
      cc.emplace_back();
      run(decoder); // TODO: Why can't I use std::move here?
      cc.pop_back();
    }

    Value eval(Func code) {
      auto prevSize = cc.size();

      cc.emplace_back();
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
