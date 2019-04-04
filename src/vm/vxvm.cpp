#include <iostream>
#include <fstream>
#include <sstream>

#include <immer/flex_vector_transient.hpp>

#include "assemble.hpp"
#include "Decoder.hpp"
#include "frontendUtil.hpp"
#include "Machine.hpp"

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

  return usage();
}

int usage() {
  std::cerr << "Usage: vxvm [eval|lines|asm|dasm|args] [...]" << std::endl;
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

  std::ifstream ifs(argv[1]);
  auto codeBlock = assembleCodeBlock(ifs);

  auto machine = Vortex::Machine();
  Vortex::Value program = machine.eval(codeBlock);

  if (program.type != Vortex::FUNC) {
    std::cerr << "Function expected from initial eval" << std::endl;
    return 1;
  }

  immer::flex_vector_transient<Vortex::Value> lines;
  immer::flex_vector_transient<char> line;

  while (true) {
    char c = std::cin.get();

    if (std::cin.eof()) {
      if (line.size() > 0u) {
        lines.push_back(Vortex::Value(new immer::flex_vector<char>(line.persistent())));
        line = immer::flex_vector_transient<char>();
      }

      break;
    }

    if (c == '\n') {
      lines.push_back(Vortex::Value(new immer::flex_vector<char>(line.persistent())));
      line = immer::flex_vector_transient<char>();
    } else {
      line.push_back(c);
    }
  }

  machine.push(Vortex::Value(new Vortex::Array{.values = std::move(lines)}));

  Vortex::Value result = machine.eval(*program.data.FUNC);

  if (result.type == Vortex::STRING) {
    for (char c: *result.data.STRING) {
      std::cout << c;
    }
  } else {
    std::cout << result << std::endl;
  }

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

  std::ifstream ifs(argv[1]);
  auto codeBlock = assembleCodeBlock(ifs);

  auto machine = Vortex::Machine();
  Vortex::Value program = machine.eval(codeBlock);

  if (program.type != Vortex::FUNC) {
    std::cerr << "Function expected from initial eval" << std::endl;
    return 1;
  }

  immer::flex_vector_transient<Vortex::Value> args;

  for (int i = 2; i < argc; i++) {
    immer::flex_vector_transient<char> arg;

    char* p = argv[i];

    while (*p != '\0') {
      arg.push_back(*p);
      p++;
    }

    args.push_back(Vortex::Value(new immer::flex_vector<char>(arg.persistent())));
  }

  machine.push(Vortex::Value(new Vortex::Array{.values = std::move(args)}));

  Vortex::Value result = machine.eval(*program.data.FUNC);

  if (result.type == Vortex::STRING) {
    for (char c: *result.data.STRING) {
      std::cout << c;
    }
  } else {
    std::cout << result << std::endl;
  }

  return 0;
}
