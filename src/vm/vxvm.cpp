#include <iostream>

#include <immer/flex_vector_transient.hpp>

#include "assemble.hpp"
#include "Decoder.hpp"
#include "frontendUtil.hpp"
#include "Machine.hpp"
#include "readfs.hpp"

int usage();

int eval();
int lines(int argc, char** argv);
int asm_();
int dasm();
int args_(int argc, char** argv);

int main(int argc, char** argv) {
  if (argc < 2) {
    return usage();
  }

  std::string prog(argv[1]);

  if (prog == "eval") { return eval(); }
  if (prog == "lines") { return lines(argc - 1, argv + 1); }
  if (prog == "asm") { return asm_(); }
  if (prog == "dasm") { return dasm(); }
  if (prog == "args") { return args_(argc - 1, argv + 1); }
  if (prog == "readfs") { return readfs(argc - 1, argv + 1); }

  return usage();
}

int usage() {
  std::cerr << "Usage: vxvm [eval|lines|asm|dasm|args|readfs] [...]" << std::endl;
  return 1;
}

int eval() {
  auto codeBlock = assembleCodeBlock(std::cin);

  auto machine = Vortex::Machine();
  Vortex::Value result = machine.eval(codeBlock);
  std::cout << result << std::endl;

  return 0;
}

int lines(int argc, char** argv) {
  if (argc != 2) {
    std::cerr << "Usage: vxvm lines <program.vx>" << std::endl;
    return 1;
  }

  auto codeBlock = FileCodeBlock(argv[1]);
  auto machine = Vortex::Machine();
  Vortex::Value program = machine.eval(codeBlock);

  if (program.type != Vortex::FUNC) {
    std::cerr << "Function expected from initial eval" << std::endl;
    return 1;
  }

  machine.push(LinesFromStream(std::cin));
  Vortex::Value result = machine.eval(*program.data.FUNC);

  vxPrint(result);

  return 0;
}

int asm_() {
  Vortex::assemble(std::cin, std::cout);
  return 0;
}

int dasm() {
  auto decoder = Vortex::Decoder(CodeBlock(std::cin));
  decoder.disassemble(std::cout, "", Vortex::PROGRAM);

  return 0;
}

int args_(int argc, char** argv) {
  if (argc < 2) {
    std::cerr << "Usage: vxvm args <program.vx> [...args]" << std::endl;
    return 1;
  }

  auto codeBlock = FileCodeBlock(argv[1]);
  auto machine = Vortex::Machine();
  Vortex::Value program = machine.eval(codeBlock);

  if (program.type != Vortex::FUNC) {
    std::cerr << "Function expected from initial eval" << std::endl;
    return 1;
  }

  machine.push(VxArgs(argc - 2, argv + 2));

  Vortex::Value result = machine.eval(*program.data.FUNC);

  vxPrint(result);

  return 0;
}
