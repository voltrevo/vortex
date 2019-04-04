#include <fstream>
#include <iostream>

#include <immer/flex_vector_transient.hpp>

#include "Array.hpp"
#include "assemble.hpp"
#include "frontendUtil.hpp"

Vortex::Func CodeBlock(std::istream& in) {
  auto bytes = immer::flex_vector_transient<Vortex::byte>();

  while (true) {
    Vortex::byte b = in.get();

    if (in.eof()) {
      break;
    }

    bytes.push_back(b);
  }

  return Vortex::Func{ .def = bytes.persistent() };
}

Vortex::Func assembleCodeBlock(std::istream& in) {
  auto oss = std::ostringstream();
  Vortex::assemble(in, oss);
  std::string s = oss.str();

  return Vortex::Func{
    .def = decltype(Vortex::Func().def)(s.begin(), s.end())
  };
}

Vortex::Func FileCodeBlock(char* fname) {
  std::ifstream ifs(fname);
  return assembleCodeBlock(ifs);
}

Vortex::Value VxArgs(int argc, char** argv) {
  immer::flex_vector_transient<Vortex::Value> args;

  for (int i = 0; i < argc; i++) {
    immer::flex_vector_transient<char> arg;

    char* p = argv[i];

    while (*p != '\0') {
      arg.push_back(*p);
      p++;
    }

    args.push_back(Vortex::Value(new immer::flex_vector<char>(arg.persistent())));
  }

  return Vortex::Value(new Vortex::Array{.values = std::move(args)});
}

Vortex::Value LinesFromStream(std::istream& in) {
  immer::flex_vector_transient<Vortex::Value> lines;
  immer::flex_vector_transient<char> line;

  while (true) {
    char c = in.get();

    if (in.eof()) {
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

  return Vortex::Value(new Vortex::Array{.values = std::move(lines)});
}

void vxPrint(const Vortex::Value& value) {
  if (value.type == Vortex::STRING) {
    for (char c: *value.data.STRING) {
      std::cout << c;
    }
  } else if (value.type == Vortex::ARRAY) {
    for (const auto& v: value.data.ARRAY->values) {
      if (v.type == Vortex::STRING) {
        for (char c: *v.data.STRING) {
          std::cout << c;
        }
        std::cout << std::endl;
      } else {
        StreamLongString(std::cout, "", v) << std::endl;
      }
    }
  } else {
    StreamLongString(std::cout, "", value) << std::endl;
  }
}
