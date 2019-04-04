#pragma once

#include <istream>

#include "Func.hpp"
#include "Value.hpp"

Vortex::Func CodeBlock(std::istream& in);
Vortex::Func assembleCodeBlock(std::istream& in);
Vortex::Func FileCodeBlock(char* fname);
Vortex::Value VxArgs(int argc, char** argv);
Vortex::Value LinesFromStream(std::istream& in);
void vxPrint(const Vortex::Value& value);
