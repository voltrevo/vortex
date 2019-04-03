#include <iostream>
#include <fstream>
#include <sstream>

#include <immer/flex_vector_transient.hpp>

#include "assemble.hpp"
#include "Machine.hpp"

int usage() {
  std::cerr << "Usage: vxvm [eval|lines] [...]" << std::endl;
  return 1;
}

int eval() {
  auto oss = std::ostringstream();
  Vortex::assemble(std::cin, oss);
  std::string s = oss.str();

  auto codeBlock = Vortex::Func{
    .def = decltype(Vortex::Func().def)(s.begin(), s.end())
  };

  auto machine = Vortex::Machine();
  Vortex::Value result = machine.eval(codeBlock);
  std::cout << result << std::endl;

  if (machine.calc.size() != 0) {
    throw Vortex::InternalError("Excess values left on stack");
  }

  return 0;
}

int lines(int argc, char** argv) {
  if (argc != 2) {
    std::cerr << "Usage: vxvm lines <program.vx>" << std::endl;
    return 1;
  }

  std::ifstream ifs(argv[1]);

  auto oss = std::ostringstream();
  Vortex::assemble(ifs, oss);
  std::string s = oss.str();

  auto codeBlock = Vortex::Func{
    .def = decltype(Vortex::Func().def)(s.begin(), s.end())
  };

  auto machine = Vortex::Machine();
  Vortex::Value program = machine.eval(codeBlock);

  if (machine.calc.size() != 0) {
    throw Vortex::InternalError("Excess values left on stack");
  }

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

  if (machine.calc.size() != 0) {
    throw Vortex::InternalError("Excess values left on stack");
  }

  if (result.type == Vortex::STRING) {
    for (char c: *result.data.STRING) {
      std::cout << c;
    }
  } else {
    std::cout << result << std::endl;
  }

  return 0;
}

int main(int argc, char** argv) {
  if (argc < 2) {
    return usage();
  }

  if (std::string(argv[1]) == "eval") {
    return eval();
  }

  if (std::string(argv[1]) == "lines") {
    return lines(argc - 1, argv + 1);
  }

  return usage();
}