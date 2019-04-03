cmake_minimum_required(VERSION 3.0)

set(CMAKE_CXX_COMPILER /usr/bin/clang++)
set(CMAKE_CXX_FLAGS "-std=c++17 -Wall -pedantic -Wno-c99-extensions")
set(CMAKE_BUILD_TYPE Debug)
set(CMAKE_INCLUDE_CURRENT_DIR true)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/bin")

project(vxvm)

add_executable(
  vxvm

  vxvm.cpp

  Codes.cpp
  Value.cpp
  Object.cpp
  Array.cpp
  Func.cpp
  Exceptions.cpp
  runBuiltInMethod.cpp
  Set.cpp
)
