#include <immer/box.hpp>
#include <immer/flex_vector.hpp>

namespace Vortex {
  using byte = unsigned char;

  using Uint8 = byte;
  using Uint16 = unsigned short;
  using Uint32 = unsigned int;
  using Uint64 = unsigned long;

  using Int8 = char;
  using Int16 = short;
  using Int32 = int;
  using Int64 = long;

  using Float32 = float;
  using Float64 = double;

  struct Value;

  using String = immer::flex_vector<char>;
  using Array = immer::flex_vector<immer::box<Value>>;
  using Func = immer::flex_vector<byte>;
}
